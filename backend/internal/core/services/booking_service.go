package services

import (
	"errors"
	"fmt"
	"strconv"
	"time"
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"

	"github.com/google/uuid"
)

type bookingService struct {
	repo       ports.BookingRepository
	roomRepo   ports.RoomRepository
	settings   ports.SettingService
	userRepo   ports.UserRepository
	notifier   ports.NotificationService
	logService ports.LogService
}

func NewBookingService(repo ports.BookingRepository, roomRepo ports.RoomRepository, settings ports.SettingService, userRepo ports.UserRepository, notifier ports.NotificationService, logService ports.LogService) ports.BookingService {
	return &bookingService{
		repo:       repo,
		roomRepo:   roomRepo,
		settings:   settings,
		userRepo:   userRepo,
		notifier:   notifier,
		logService: logService,
	}
}

func (s *bookingService) CreateBooking(booking *domain.Booking) error {
	// 1. Validation พื้นฐาน
	if booking.RoomID == 0 {
		return errors.New("room_id is required")
	}
	if booking.StartTime.After(booking.EndTime) || booking.StartTime.Equal(booking.EndTime) {
		return errors.New("start time must be before end time")
	}

	// 1.2 Check Room Status
	room, err := s.roomRepo.GetByID(booking.RoomID)
	if err != nil {
		return errors.New("room not found")
	}
	if room.Status != "active" {
		return fmt.Errorf("room is not available (Status: %s)", room.Status)
	}

	// 1.5. Advance Booking Check
	// Get User Role
	user, err := s.userRepo.GetByID(booking.UserID)
	isAdmin := false
	if err == nil && user.Role == "admin" {
		isAdmin = true
	}

	if !isAdmin {
		advanceDaysStr := s.settings.GetSettingValue("advance_booking_days")
		advanceDays, _ := strconv.Atoi(advanceDaysStr)

		if advanceDays > 0 {
			now := time.Now()
			// Use server local time logic
			bookingDate := time.Date(booking.StartTime.Year(), booking.StartTime.Month(), booking.StartTime.Day(), 0, 0, 0, 0, now.Location())
			minDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, advanceDays)

			if bookingDate.Before(minDate) {
				return fmt.Errorf("must book at least %d days in advance", advanceDays)
			}
		}
	}

	// 2. Weekend Check
	allowWeekend := s.settings.GetSettingValue("allow_weekend")
	if allowWeekend == "false" {
		if booking.StartTime.Weekday() == time.Saturday || booking.StartTime.Weekday() == time.Sunday ||
			booking.EndTime.Weekday() == time.Saturday || booking.EndTime.Weekday() == time.Sunday {
			return errors.New("booking is not allowed on weekends")
		}
	}

	// 3. Conflict Check (ป้องกันจองซ้ำ)
	count, err := s.repo.CountOverlapping(booking.RoomID, booking.StartTime, booking.EndTime)
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("room is not available at this time")
	}

	// 4. กำหนดสถานะเริ่มต้น
	defaultStatus := s.settings.GetSettingValue("default_booking_status")
	if defaultStatus == "" {
		defaultStatus = "pending"
	}
	booking.Status = defaultStatus

	// 5. บันทึก
	if err := s.repo.Create(booking); err != nil {
		return err
	}

	// 6. Notify Admin
	go s.notifier.NotifyAdminNewBooking(booking)

	// 7. Log Activity
	go s.logService.LogAction(booking.UserID, "CREATE_BOOKING", fmt.Sprintf("จองห้อง ID: %d วันที่: %s", booking.RoomID, booking.StartTime.Format("02/01/2006")), "", "")

	return nil
}

func (s *bookingService) GetAllBookings() ([]domain.Booking, error) {
	return s.repo.GetAll()
}

func (s *bookingService) GetPaginatedBookings(params domain.BookingFilterParams) (*domain.PaginatedResult[domain.Booking], error) {
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.Limit <= 0 {
		params.Limit = 10
	}

	bookings, total, err := s.repo.GetPaginated(params)
	if err != nil {
		return nil, err
	}

	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(params.Limit) - 1) / int64(params.Limit))
	}

	return &domain.PaginatedResult[domain.Booking]{
		Data:       bookings,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}, nil
}

// GetBookingsByRange รับ string มาแปลงเป็น time ก่อนส่งให้ repo
func (s *bookingService) GetBookingsByRange(startStr, endStr string) ([]domain.Booking, error) {
	layout := time.RFC3339 
	
	start, err := time.Parse(layout, startStr)
	if err != nil {
		start, err = time.Parse("2006-01-02", startStr)
		if err != nil {
			return nil, errors.New("invalid start date format")
		}
	}

	end, err := time.Parse(layout, endStr)
	if err != nil {
		end, err = time.Parse("2006-01-02", endStr)
		if err != nil {
			return nil, errors.New("invalid end date format")
		}
	}

	return s.repo.GetByDateRange(start, end)
}

func (s *bookingService) GetBookingByID(id uint) (*domain.Booking, error) {
	return s.repo.GetByID(id)
}

func (s *bookingService) UpdateBookingStatus(id uint, status string, approverID uint) error {
	booking, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	booking.Status = status
	booking.ApproverID = &approverID
	
	if err := s.repo.Update(booking); err != nil {
		return err
	}
	
	go s.notifier.NotifyUserStatusChange(booking)
	
	action := "UPDATE"
	if status == "approved" {
		action = "APPROVE"
	} else if status == "rejected" {
		action = "REJECT"
	} else if status == "cancelled" {
		action = "CANCEL"
	}
	go s.logService.LogAction(approverID, action, fmt.Sprintf("%s รายการจอง ID: %d", status, booking.ID), "", "")

	return nil
}

func (s *bookingService) UpdateBooking(id uint, updatedBooking *domain.Booking, actorID uint) error {
	existing, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	// ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของรายการจอง หรือเป็น Admin เท่านั้น (ป้องกัน IDOR)
	actor, err := s.userRepo.GetByID(actorID)
	if err != nil {
		return errors.New("unauthorized")
	}

	if existing.UserID != actorID && actor.Role != "admin" {
		return errors.New("you do not have permission to update this booking")
	}
    
	// Update fields
	existing.Subject = updatedBooking.Subject
	existing.RoomID = updatedBooking.RoomID
	existing.StartTime = updatedBooking.StartTime
	existing.EndTime = updatedBooking.EndTime
	existing.Note = updatedBooking.Note
	existing.Department = updatedBooking.Department
	existing.Phone = updatedBooking.Phone
	existing.Attendees = updatedBooking.Attendees
	existing.ResourceText = updatedBooking.ResourceText
	if updatedBooking.LayoutImage != "" {
		existing.LayoutImage = updatedBooking.LayoutImage
	}
    
	if existing.StartTime.After(existing.EndTime) || existing.StartTime.Equal(existing.EndTime) {
		return errors.New("start time must be before end time")
	}

	count, err := s.repo.CountOverlappingExcludingID(existing.RoomID, existing.StartTime, existing.EndTime, id)
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("room is not available at this time")
	}
    
	// Clear associations to prevent GORM from updating them incorrectly
	existing.Room = domain.Room{}
	existing.User = domain.User{}
	existing.Approver = nil

	if err := s.repo.Update(existing); err != nil {
		return err
	}

	go s.logService.LogAction(actorID, "UPDATE_BOOKING", fmt.Sprintf("Updated booking ID: %d", id), "", "")

	return nil
}

func (s *bookingService) DeleteBooking(id uint, actorID uint) error {
	booking, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	actor, err := s.userRepo.GetByID(actorID)
	if err != nil {
		return errors.New("unauthorized")
	}

	// Check permission: Owner OR Admin
	if booking.UserID != actorID && actor.Role != "admin" {
		return errors.New("you do not have permission to delete this booking")
	}

	if err := s.repo.Delete(id); err != nil {
		return err
	}

	go s.logService.LogAction(actorID, "DELETE_BOOKING", fmt.Sprintf("Deleted booking ID: %d", id), "", "")

	return nil
}

func (s *bookingService) CheckSlotsAvailability(roomID uint, slots []ports.TimeSlot, userID uint) ([]ports.SlotCheckResult, error) {
	if roomID == 0 {
		return nil, errors.New("room_id is required")
	}

	room, err := s.roomRepo.GetByID(roomID)
	if err != nil {
		return nil, errors.New("room not found")
	}
	if room.Status != "active" {
		return nil, fmt.Errorf("room is not available (Status: %s)", room.Status)
	}

	user, err := s.userRepo.GetByID(userID)
	isAdmin := false
	if err == nil && user.Role == "admin" {
		isAdmin = true
	}

	advanceDaysStr := s.settings.GetSettingValue("advance_booking_days")
	advanceDays, _ := strconv.Atoi(advanceDaysStr)

	allowWeekend := s.settings.GetSettingValue("allow_weekend")

	now := time.Now()
	minDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, advanceDays)

	results := make([]ports.SlotCheckResult, len(slots))

	for i, slot := range slots {
		result := ports.SlotCheckResult{
			Slot:      slot,
			Available: true,
		}

		// 1. Start < End
		if slot.StartTime.After(slot.EndTime) || slot.StartTime.Equal(slot.EndTime) {
			result.Available = false
			result.Reason = "เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุด"
			results[i] = result
			continue
		}

		// 2. Advance Days Check
		if !isAdmin && advanceDays > 0 {
			bookingDate := time.Date(slot.StartTime.Year(), slot.StartTime.Month(), slot.StartTime.Day(), 0, 0, 0, 0, now.Location())
			if bookingDate.Before(minDate) {
				result.Available = false
				result.Reason = fmt.Sprintf("ต้องจองล่วงหน้าอย่างน้อย %d วัน", advanceDays)
				results[i] = result
				continue
			}
		}

		// 3. Weekend Check
		if allowWeekend == "false" {
			if slot.StartTime.Weekday() == time.Saturday || slot.StartTime.Weekday() == time.Sunday ||
				slot.EndTime.Weekday() == time.Saturday || slot.EndTime.Weekday() == time.Sunday {
				result.Available = false
				result.Reason = "ไม่อนุญาตให้จองในวันหยุดเสาร์-อาทิตย์"
				results[i] = result
				continue
			}
		}

		// 4. Overlapping Check
		count, err := s.repo.CountOverlapping(roomID, slot.StartTime, slot.EndTime)
		if err != nil {
			result.Available = false
			result.Reason = "ข้อผิดพลาดในการตรวจสอบห้องว่าง: " + err.Error()
			results[i] = result
			continue
		}

		if count > 0 {
			result.Available = false
			result.Reason = "ห้องไม่ว่างในช่วงเวลานี้ (มีการจองอื่นแล้ว)"
			results[i] = result
			continue
		}

		results[i] = result
	}

	return results, nil
}

func (s *bookingService) CreateRecurringBooking(bookings []domain.Booking) ([]domain.Booking, error) {
	if len(bookings) == 0 {
		return nil, errors.New("no bookings provided")
	}

	// 1. Check max recurring count
	maxCountStr := s.settings.GetSettingValue("max_recurring_count")
	maxCount, _ := strconv.Atoi(maxCountStr)
	if maxCount <= 0 {
		maxCount = 12
	}
	if len(bookings) > maxCount {
		return nil, fmt.Errorf("จำนวนการจองซ้ำเกินขีดจำกัดสูงสุด (%d ครั้ง)", maxCount)
	}

	roomID := bookings[0].RoomID
	room, err := s.roomRepo.GetByID(roomID)
	if err != nil {
		return nil, errors.New("room not found")
	}
	if room.Status != "active" {
		return nil, fmt.Errorf("room is not available (Status: %s)", room.Status)
	}

	userID := bookings[0].UserID
	user, err := s.userRepo.GetByID(userID)
	isAdmin := false
	if err == nil && user.Role == "admin" {
		isAdmin = true
	}

	advanceDaysStr := s.settings.GetSettingValue("advance_booking_days")
	advanceDays, _ := strconv.Atoi(advanceDaysStr)
	allowWeekend := s.settings.GetSettingValue("allow_weekend")
	defaultStatus := s.settings.GetSettingValue("default_booking_status")
	if defaultStatus == "" {
		defaultStatus = "pending"
	}

	now := time.Now()
	minDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, advanceDays)

	// Validate all slots for conflicts
	for i, b := range bookings {
		if b.StartTime.After(b.EndTime) || b.StartTime.Equal(b.EndTime) {
			return nil, fmt.Errorf("รายการที่ %d: เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุด", i+1)
		}

		if !isAdmin && advanceDays > 0 {
			bDate := time.Date(b.StartTime.Year(), b.StartTime.Month(), b.StartTime.Day(), 0, 0, 0, 0, now.Location())
			if bDate.Before(minDate) {
				return nil, fmt.Errorf("รายการที่ %d วันที่ %s: ต้องจองล่วงหน้าอย่างน้อย %d วัน", i+1, b.StartTime.Format("02/01/2006"), advanceDays)
			}
		}

		if allowWeekend == "false" {
			if b.StartTime.Weekday() == time.Saturday || b.StartTime.Weekday() == time.Sunday ||
				b.EndTime.Weekday() == time.Saturday || b.EndTime.Weekday() == time.Sunday {
				return nil, fmt.Errorf("รายการที่ %d วันที่ %s: ไม่อนุญาตให้จองในวันหยุดเสาร์-อาทิตย์", i+1, b.StartTime.Format("02/01/2006"))
			}
		}

		count, err := s.repo.CountOverlapping(roomID, b.StartTime, b.EndTime)
		if err != nil {
			return nil, err
		}
		if count > 0 {
			return nil, fmt.Errorf("รายการที่ %d วันที่ %s เวลา %s-%s ห้องไม่ว่าง", i+1, b.StartTime.Format("02/01/2006"), b.StartTime.Format("15:04"), b.EndTime.Format("15:04"))
		}
	}

	// Generate Group ID
	groupID := uuid.New().String()
	total := len(bookings)

	for i := range bookings {
		bookings[i].RecurringGroupID = &groupID
		bookings[i].RecurrenceIndex = i + 1
		bookings[i].RecurrenceTotal = total
		bookings[i].Status = defaultStatus
	}

	// Batch insert in transaction
	if err := s.repo.CreateBatch(bookings); err != nil {
		return nil, err
	}

	// Send unified notification
	go s.notifier.NotifyAdminNewRecurringBooking(bookings)

	// Log activity
	go s.logService.LogAction(userID, "CREATE_RECURRING_BOOKING", fmt.Sprintf("จองห้อง ID: %d แบบต่อเนื่อง %d ครั้ง Group: %s", roomID, total, groupID), "", "")

	return bookings, nil
}

func (s *bookingService) UpdateRecurringGroupStatus(groupID string, status string, approverID uint) error {
	if groupID == "" {
		return errors.New("group_id is required")
	}

	if err := s.repo.UpdateStatusByGroupID(groupID, status, approverID); err != nil {
		return err
	}

	action := "UPDATE_GROUP"
	if status == "approved" {
		action = "APPROVE_GROUP"
	} else if status == "rejected" {
		action = "REJECT_GROUP"
	} else if status == "cancelled" {
		action = "CANCEL_GROUP"
	}

	go s.logService.LogAction(approverID, action, fmt.Sprintf("%s รายการจองทั้งชุด Group: %s", status, groupID), "", "")

	return nil
}

func (s *bookingService) DeleteRecurringGroup(groupID string, actorID uint) error {
	if groupID == "" {
		return errors.New("group_id is required")
	}

	bookings, err := s.repo.GetByRecurringGroupID(groupID)
	if err != nil || len(bookings) == 0 {
		return errors.New("recurring booking group not found")
	}

	actor, err := s.userRepo.GetByID(actorID)
	if err != nil {
		return errors.New("unauthorized")
	}

	// Check permission: Owner of first booking or Admin
	if bookings[0].UserID != actorID && actor.Role != "admin" {
		return errors.New("you do not have permission to delete this booking group")
	}

	if err := s.repo.DeleteByGroupID(groupID); err != nil {
		return err
	}

	go s.logService.LogAction(actorID, "DELETE_RECURRING_GROUP", fmt.Sprintf("Deleted recurring booking group: %s (%d bookings)", groupID, len(bookings)), "", "")

	return nil
}
