package ports

import (
	"time"
	"tunorth-brms-backend/internal/core/domain"
)

type TimeSlot struct {
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

type SlotCheckResult struct {
	Slot      TimeSlot `json:"slot"`
	Available bool     `json:"available"`
	Reason    string   `json:"reason,omitempty"`
}

type BookingRepository interface {
	Create(booking *domain.Booking) error
	CreateBatch(bookings []domain.Booking) error
	GetAll() ([]domain.Booking, error)
	GetByID(id uint) (*domain.Booking, error)
	GetByRecurringGroupID(groupID string) ([]domain.Booking, error)
	// ดึงเฉพาะช่วงเวลา (สำหรับปฏิทิน)
	GetByDateRange(start, end time.Time) ([]domain.Booking, error)
	// เช็คว่าห้องนี้ เวลานี้ มีใครจองหรือยัง (เพื่อป้องกันจองซ้ำ)
	CountOverlapping(roomID uint, start, end time.Time) (int64, error)
	// เช็คซ้ำแต่นับข้าม ID ตัวเอง (สำหรับ Update)
	CountOverlappingExcludingID(roomID uint, start, end time.Time, excludeID uint) (int64, error)
	Update(booking *domain.Booking) error
	UpdateStatusByGroupID(groupID string, status string, approverID uint) error
	Delete(id uint) error
	DeleteByGroupID(groupID string) error
}

type BookingService interface {
	CreateBooking(booking *domain.Booking) error
	CheckSlotsAvailability(roomID uint, slots []TimeSlot, userID uint) ([]SlotCheckResult, error)
	CreateRecurringBooking(bookings []domain.Booking) ([]domain.Booking, error)
	GetAllBookings() ([]domain.Booking, error)
	GetBookingsByRange(start, end string) ([]domain.Booking, error) // รับ string แล้วแปลงเป็น time ใน service
	GetBookingByID(id uint) (*domain.Booking, error)
	UpdateBookingStatus(id uint, status string, approverID uint) error
	UpdateRecurringGroupStatus(groupID string, status string, approverID uint) error
	UpdateBooking(id uint, booking *domain.Booking, actorID uint) error
	// DeleteBooking(id uint) error -> เปลี่ยนเป็น รับ actorID ด้วย
	DeleteBooking(id uint, actorID uint) error
	DeleteRecurringGroup(groupID string, actorID uint) error
}