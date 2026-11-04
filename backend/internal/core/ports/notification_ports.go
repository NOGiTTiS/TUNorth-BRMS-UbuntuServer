package ports

import "tunorth-brms-backend/internal/core/domain"

type NotificationService interface {
	SendTelegram(chatID, message string) error
	NotifyAdminNewBooking(booking *domain.Booking) error
	NotifyAdminNewRecurringBooking(bookings []domain.Booking) error
	NotifyUserStatusChange(booking *domain.Booking) error
}
