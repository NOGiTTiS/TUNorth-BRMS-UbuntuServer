package services_test

import (
	"fmt"
	"testing"
	"time"

	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"
	"tunorth-brms-backend/internal/core/services"
)

// Mock Booking Repository
type mockBookingRepo struct {
	createdBookings []domain.Booking
	overlapCounts   map[string]int64
}

func (m *mockBookingRepo) Create(booking *domain.Booking) error {
	m.createdBookings = append(m.createdBookings, *booking)
	return nil
}

func (m *mockBookingRepo) CreateBatch(bookings []domain.Booking) error {
	m.createdBookings = append(m.createdBookings, bookings...)
	return nil
}

func (m *mockBookingRepo) GetAll() ([]domain.Booking, error) {
	return m.createdBookings, nil
}

func (m *mockBookingRepo) GetPaginated(params domain.BookingFilterParams) ([]domain.Booking, int64, error) {
	var filtered []domain.Booking
	for _, b := range m.createdBookings {
		if params.UserID != nil && *params.UserID > 0 && b.UserID != *params.UserID {
			continue
		}
		if params.Status != "" && params.Status != "all" && b.Status != params.Status {
			continue
		}
		filtered = append(filtered, b)
	}

	total := int64(len(filtered))
	limit := params.Limit
	if limit <= 0 {
		limit = 10
	}
	page := params.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit
	if offset >= len(filtered) {
		return []domain.Booking{}, total, nil
	}
	end := offset + limit
	if end > len(filtered) {
		end = len(filtered)
	}
	return filtered[offset:end], total, nil
}

func (m *mockBookingRepo) GetByID(id uint) (*domain.Booking, error) {
	for _, b := range m.createdBookings {
		if b.ID == id {
			return &b, nil
		}
	}
	return &domain.Booking{}, nil
}

func (m *mockBookingRepo) GetByRecurringGroupID(groupID string) ([]domain.Booking, error) {
	var results []domain.Booking
	for _, b := range m.createdBookings {
		if b.RecurringGroupID != nil && *b.RecurringGroupID == groupID {
			results = append(results, b)
		}
	}
	return results, nil
}

func (m *mockBookingRepo) GetByDateRange(start, end time.Time) ([]domain.Booking, error) {
	return nil, nil
}

func (m *mockBookingRepo) CountOverlapping(roomID uint, start, end time.Time) (int64, error) {
	key := start.Format("2006-01-02 15:04")
	if count, ok := m.overlapCounts[key]; ok {
		return count, nil
	}
	return 0, nil
}

func (m *mockBookingRepo) CountOverlappingExcludingID(roomID uint, start, end time.Time, excludeID uint) (int64, error) {
	return 0, nil
}

func (m *mockBookingRepo) Update(booking *domain.Booking) error {
	return nil
}

func (m *mockBookingRepo) UpdateStatusByGroupID(groupID string, status string, approverID uint) error {
	for i := range m.createdBookings {
		if m.createdBookings[i].RecurringGroupID != nil && *m.createdBookings[i].RecurringGroupID == groupID {
			m.createdBookings[i].Status = status
		}
	}
	return nil
}

func (m *mockBookingRepo) Delete(id uint) error {
	return nil
}

func (m *mockBookingRepo) DeleteByGroupID(groupID string) error {
	var filtered []domain.Booking
	for _, b := range m.createdBookings {
		if b.RecurringGroupID == nil || *b.RecurringGroupID != groupID {
			filtered = append(filtered, b)
		}
	}
	m.createdBookings = filtered
	return nil
}

// Mock Room Repository
type mockRoomRepo struct{}

func (m *mockRoomRepo) Create(room *domain.Room) error               { return nil }
func (m *mockRoomRepo) GetAll() ([]domain.Room, error)               { return nil, nil }
func (m *mockRoomRepo) GetActiveRooms() ([]domain.Room, error)       { return nil, nil }
func (m *mockRoomRepo) GetByID(id uint) (*domain.Room, error) {
	return &domain.Room{ID: id, RoomName: "Test Room", Status: "active"}, nil
}
func (m *mockRoomRepo) Update(room *domain.Room) error               { return nil }
func (m *mockRoomRepo) Delete(id uint) error                         { return nil }

// Mock Setting Service
type mockSettingService struct {
	settings map[string]string
}

func (m *mockSettingService) GetAllSettings() (map[string]interface{}, []domain.Setting, error) {
	return nil, nil, nil
}
func (m *mockSettingService) UpdateSettings(updates []domain.Setting, actorID uint) error {
	return nil
}
func (m *mockSettingService) GetSettingValue(key string) string {
	return m.settings[key]
}
func (m *mockSettingService) InitializeDefaults() error { return nil }

// Mock User Repo
type mockUserRepo struct{}

func (m *mockUserRepo) Create(user *domain.User) error              { return nil }
func (m *mockUserRepo) GetByID(id uint) (*domain.User, error) {
	return &domain.User{ID: id, FullName: "Test User", Role: "user"}, nil
}
func (m *mockUserRepo) GetByUsername(username string) (*domain.User, error)        { return nil, nil }
func (m *mockUserRepo) GetByEmail(email string) (*domain.User, error)              { return nil, nil }
func (m *mockUserRepo) GetByUsernameOrEmail(identifier string) (*domain.User, error) { return nil, nil }
func (m *mockUserRepo) GetAll() ([]domain.User, error)                             { return nil, nil }
func (m *mockUserRepo) GetPaginated(page, limit int, search string) ([]domain.User, int64, error) { return nil, 0, nil }
func (m *mockUserRepo) Update(user *domain.User) error                             { return nil }
func (m *mockUserRepo) Delete(id uint) error                                       { return nil }
func (m *mockUserRepo) Count() (int64, error)                                      { return 1, nil }

// Mock Notifier
type mockNotifier struct{}

func (m *mockNotifier) SendTelegram(chatID, message string) error           { return nil }
func (m *mockNotifier) NotifyAdminNewBooking(booking *domain.Booking) error { return nil }
func (m *mockNotifier) NotifyAdminNewRecurringBooking(bookings []domain.Booking) error {
	return nil
}
func (m *mockNotifier) NotifyUserStatusChange(booking *domain.Booking) error { return nil }

// Mock Log Service
type mockLogService struct{}

func (m *mockLogService) LogAction(userID uint, action, description, ip, userAgent string) error {
	return nil
}
func (m *mockLogService) GetLogs(limit int) ([]domain.Log, error) { return nil, nil }
func (m *mockLogService) GetPaginatedLogs(page, limit int, search string) (*domain.PaginatedResult[domain.Log], error) {
	return nil, nil
}

func setupBookingService() (ports.BookingService, *mockBookingRepo, *mockSettingService) {
	bookingRepo := &mockBookingRepo{
		overlapCounts: make(map[string]int64),
	}
	roomRepo := &mockRoomRepo{}
	settingSvc := &mockSettingService{
		settings: map[string]string{
			"advance_booking_days":   "0",
			"allow_weekend":          "true",
			"default_booking_status": "approved",
			"max_recurring_count":    "12",
		},
	}
	userRepo := &mockUserRepo{}
	notifier := &mockNotifier{}
	logSvc := &mockLogService{}

	svc := services.NewBookingService(bookingRepo, roomRepo, settingSvc, userRepo, notifier, logSvc)
	return svc, bookingRepo, settingSvc
}

func TestCheckSlotsAvailability(t *testing.T) {
	svc, bookingRepo, _ := setupBookingService()

	now := time.Now().AddDate(0, 0, 1)
	slot1Start := time.Date(now.Year(), now.Month(), now.Day(), 9, 0, 0, 0, time.Local)
	slot1End := time.Date(now.Year(), now.Month(), now.Day(), 12, 0, 0, 0, time.Local)

	slot2Start := time.Date(now.Year(), now.Month(), now.Day(), 13, 0, 0, 0, time.Local)
	slot2End := time.Date(now.Year(), now.Month(), now.Day(), 16, 0, 0, 0, time.Local)

	// Simulate conflict for slot2
	bookingRepo.overlapCounts[slot2Start.Format("2006-01-02 15:04")] = 1

	slots := []ports.TimeSlot{
		{StartTime: slot1Start, EndTime: slot1End},
		{StartTime: slot2Start, EndTime: slot2End},
		{StartTime: slot2End, EndTime: slot2Start}, // Invalid: start after end
	}

	results, err := svc.CheckSlotsAvailability(1, slots, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}

	if !results[0].Available {
		t.Errorf("expected slot 1 to be available, got not available")
	}

	if results[1].Available {
		t.Errorf("expected slot 2 to be conflicted (not available)")
	}

	if results[2].Available {
		t.Errorf("expected slot 3 (start > end) to be not available")
	}
}

func TestCreateRecurringBooking_Success(t *testing.T) {
	svc, _, _ := setupBookingService()

	now := time.Now().AddDate(0, 0, 1)
	var bookings []domain.Booking

	for i := 0; i < 3; i++ {
		st := time.Date(now.Year(), now.Month(), now.Day()+i*7, 9, 0, 0, 0, time.Local)
		et := time.Date(now.Year(), now.Month(), now.Day()+i*7, 12, 0, 0, 0, time.Local)

		bookings = append(bookings, domain.Booking{
			RoomID:    1,
			UserID:    1,
			Subject:   "Weekly Sync",
			StartTime: st,
			EndTime:   et,
		})
	}

	created, err := svc.CreateRecurringBooking(bookings)
	if err != nil {
		t.Fatalf("unexpected error creating recurring booking: %v", err)
	}

	if len(created) != 3 {
		t.Fatalf("expected 3 bookings created, got %d", len(created))
	}

	firstGroupID := created[0].RecurringGroupID
	if firstGroupID == nil || *firstGroupID == "" {
		t.Fatalf("expected recurring group ID to be populated")
	}

	for i, b := range created {
		if b.RecurringGroupID == nil || *b.RecurringGroupID != *firstGroupID {
			t.Errorf("booking %d group ID mismatch", i)
		}
		if b.RecurrenceIndex != i+1 {
			t.Errorf("booking %d expected index %d, got %d", i, i+1, b.RecurrenceIndex)
		}
		if b.RecurrenceTotal != 3 {
			t.Errorf("booking %d expected total 3, got %d", i, b.RecurrenceTotal)
		}
		if b.Status != "approved" { // Based on mock default status
			t.Errorf("expected status 'approved', got '%s'", b.Status)
		}
	}
}

func TestCreateRecurringBooking_ExceedsLimit(t *testing.T) {
	svc, _, settingSvc := setupBookingService()
	settingSvc.settings["max_recurring_count"] = "2"

	now := time.Now().AddDate(0, 0, 1)
	var bookings []domain.Booking

	for i := 0; i < 3; i++ {
		st := time.Date(now.Year(), now.Month(), now.Day()+i*7, 9, 0, 0, 0, time.Local)
		et := time.Date(now.Year(), now.Month(), now.Day()+i*7, 12, 0, 0, 0, time.Local)

		bookings = append(bookings, domain.Booking{
			RoomID:    1,
			UserID:    1,
			Subject:   "Weekly Sync",
			StartTime: st,
			EndTime:   et,
		})
	}

	_, err := svc.CreateRecurringBooking(bookings)
	if err == nil {
		t.Fatalf("expected error exceeding max limit, but got nil")
	}
}

func TestUpdateAndCancelRecurringGroup(t *testing.T) {
	svc, repo, _ := setupBookingService()

	now := time.Now().AddDate(0, 0, 1)
	var bookings []domain.Booking

	for i := 0; i < 2; i++ {
		st := time.Date(now.Year(), now.Month(), now.Day()+i*7, 9, 0, 0, 0, time.Local)
		et := time.Date(now.Year(), now.Month(), now.Day()+i*7, 12, 0, 0, 0, time.Local)

		bookings = append(bookings, domain.Booking{
			ID:        uint(i + 1),
			RoomID:    1,
			UserID:    1,
			Subject:   "Class Sync",
			StartTime: st,
			EndTime:   et,
		})
	}

	created, err := svc.CreateRecurringBooking(bookings)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	groupID := *created[0].RecurringGroupID

	// Test update group status
	if err := svc.UpdateRecurringGroupStatus(groupID, "rejected", 99); err != nil {
		t.Fatalf("failed to update group status: %v", err)
	}

	for _, b := range repo.createdBookings {
		if b.Status != "rejected" {
			t.Errorf("expected status 'rejected', got '%s'", b.Status)
		}
	}

	// Test delete recurring group
	if err := svc.DeleteRecurringGroup(groupID, 1); err != nil {
		t.Fatalf("failed to delete recurring group: %v", err)
	}

	if len(repo.createdBookings) != 0 {
		t.Errorf("expected 0 bookings after group delete, got %d", len(repo.createdBookings))
	}
}

func TestGetPaginatedBookings(t *testing.T) {
	svc, mockRepo, _ := setupBookingService()

	// Seed 25 bookings
	for i := 1; i <= 25; i++ {
		mockRepo.createdBookings = append(mockRepo.createdBookings, domain.Booking{
			ID:      uint(i),
			UserID:  1,
			Subject: fmt.Sprintf("Booking %d", i),
			Status:  "approved",
		})
	}

	// Page 1 with limit 10
	res, err := svc.GetPaginatedBookings(domain.BookingFilterParams{
		Page:  1,
		Limit: 10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Total != 25 {
		t.Errorf("expected total 25, got %d", res.Total)
	}
	if res.TotalPages != 3 {
		t.Errorf("expected total_pages 3, got %d", res.TotalPages)
	}
	if len(res.Data) != 10 {
		t.Errorf("expected 10 items on page 1, got %d", len(res.Data))
	}

	// Page 3 with limit 10 (last page with 5 items)
	res3, err := svc.GetPaginatedBookings(domain.BookingFilterParams{
		Page:  3,
		Limit: 10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res3.Data) != 5 {
		t.Errorf("expected 5 items on page 3, got %d", len(res3.Data))
	}
}
