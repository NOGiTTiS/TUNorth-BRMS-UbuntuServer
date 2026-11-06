package storage

import (
	"strings"
	"time"
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"

	"gorm.io/gorm"
)

type bookingRepository struct {
	db *gorm.DB
}

func NewBookingRepository(db *gorm.DB) ports.BookingRepository {
	return &bookingRepository{db: db}
}

func (r *bookingRepository) Create(booking *domain.Booking) error {
	return r.db.Create(booking).Error
}

func (r *bookingRepository) CreateBatch(bookings []domain.Booking) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i := range bookings {
			if err := tx.Create(&bookings[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *bookingRepository) GetAll() ([]domain.Booking, error) {
	var bookings []domain.Booking
	err := r.db.Preload("User").Preload("Room").Preload("BookingResources.Resource").Find(&bookings).Error
	return bookings, err
}

func (r *bookingRepository) GetPaginated(params domain.BookingFilterParams) ([]domain.Booking, int64, error) {
	tx := r.db.Model(&domain.Booking{})

	if params.UserID != nil && *params.UserID > 0 {
		tx = tx.Where("bookings.user_id = ?", *params.UserID)
	}

	if params.Status != "" && params.Status != "all" {
		tx = tx.Where("LOWER(bookings.status) = ?", strings.ToLower(params.Status))
	}

	if params.RoomID != nil && *params.RoomID > 0 {
		tx = tx.Where("bookings.room_id = ?", *params.RoomID)
	}

	if params.Search != "" {
		pattern := "%" + params.Search + "%"
		tx = tx.Joins("LEFT JOIN users ON users.id = bookings.user_id").
			Joins("LEFT JOIN rooms ON rooms.id = bookings.room_id").
			Where("bookings.subject ILIKE ? OR users.full_name ILIKE ? OR rooms.room_name ILIKE ?", pattern, pattern, pattern)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	limit := params.Limit
	if limit <= 0 {
		limit = 10
	}
	page := params.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	var bookings []domain.Booking
	err := tx.Preload("User").
		Preload("Room").
		Preload("BookingResources.Resource").
		Order("bookings.id DESC").
		Offset(offset).
		Limit(limit).
		Find(&bookings).Error

	return bookings, total, err
}

func (r *bookingRepository) GetByID(id uint) (*domain.Booking, error) {
	var booking domain.Booking
	err := r.db.Preload("User").Preload("Room").Preload("BookingResources.Resource").First(&booking, id).Error
	return &booking, err
}

func (r *bookingRepository) GetByRecurringGroupID(groupID string) ([]domain.Booking, error) {
	var bookings []domain.Booking
	err := r.db.Preload("User").Preload("Room").Preload("BookingResources.Resource").
		Where("recurring_group_id = ?", groupID).
		Order("start_time ASC").
		Find(&bookings).Error
	return bookings, err
}

// GetByDateRange: ดึงข้อมูลเฉพาะช่วงวันที่กำหนด (Preload ทั้ง User, Room และ BookingResources.Resource)
func (r *bookingRepository) GetByDateRange(start, end time.Time) ([]domain.Booking, error) {
	var bookings []domain.Booking
	err := r.db.Preload("User").Preload("Room").Preload("BookingResources.Resource").
		Where("start_time >= ? AND start_time <= ?", start, end).
		Find(&bookings).Error
	return bookings, err
}

// CountOverlapping: นับจำนวนการจองที่เวลาทับซ้อนกัน (ยกเว้นสถานะ cancelled และ rejected เพื่อไม่ให้บล็อกห้องถาวร)
func (r *bookingRepository) CountOverlapping(roomID uint, start, end time.Time) (int64, error) {
	var count int64
	err := r.db.Model(&domain.Booking{}).
		Where("room_id = ? AND LOWER(status) NOT IN ('cancelled', 'rejected') AND start_time < ? AND end_time > ?", roomID, end, start).
		Count(&count).Error
	return count, err
}

func (r *bookingRepository) CountOverlappingExcludingID(roomID uint, start, end time.Time, excludeID uint) (int64, error) {
	var count int64
	err := r.db.Model(&domain.Booking{}).
		Where("room_id = ? AND LOWER(status) NOT IN ('cancelled', 'rejected') AND start_time < ? AND end_time > ? AND id != ?", roomID, end, start, excludeID).
		Count(&count).Error
	return count, err
}

func (r *bookingRepository) Update(booking *domain.Booking) error {
	return r.db.Save(booking).Error
}

func (r *bookingRepository) UpdateStatusByGroupID(groupID string, status string, approverID uint) error {
	return r.db.Model(&domain.Booking{}).
		Where("recurring_group_id = ?", groupID).
		Updates(map[string]interface{}{
			"status":      status,
			"approver_id": approverID,
		}).Error
}

func (r *bookingRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Booking{}, id).Error
}

func (r *bookingRepository) DeleteByGroupID(groupID string) error {
	return r.db.Where("recurring_group_id = ?", groupID).Delete(&domain.Booking{}).Error
}
