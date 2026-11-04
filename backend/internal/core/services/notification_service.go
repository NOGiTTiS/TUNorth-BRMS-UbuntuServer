package services

import (
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strings"
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"
)

type notificationService struct {
	settings ports.SettingService
	roomRepo ports.RoomRepository
	userRepo ports.UserRepository
}

func NewNotificationService(settings ports.SettingService, roomRepo ports.RoomRepository, userRepo ports.UserRepository) ports.NotificationService {
	return &notificationService{
		settings: settings,
		roomRepo: roomRepo,
		userRepo: userRepo,
	}
}

func (s *notificationService) SendTelegram(chatID, message string) error {
	token := s.settings.GetSettingValue("telegram_bot_token")
	if token == "" || chatID == "" {
		return nil
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	formData := url.Values{
		"chat_id":    {chatID},
		"text":       {message},
		"parse_mode": {"HTML"},
	}

	resp, err := http.PostForm(apiURL, formData)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to send telegram message, status: %d", resp.StatusCode)
	}

	return nil
}

func (s *notificationService) NotifyAdminNewBooking(booking *domain.Booking) error {
	if s.settings.GetSettingValue("notify_admin") != "true" {
		return nil
	}

	adminChatID := s.settings.GetSettingValue("telegram_admin_chat_id")
	if adminChatID == "" {
		return nil
	}

	// Fetch Room Name
	roomName := fmt.Sprintf("ID %d", booking.RoomID)
	if room, err := s.roomRepo.GetByID(booking.RoomID); err == nil {
		roomName = room.RoomName
	}

	// Fetch User Name
	userName := fmt.Sprintf("ID %d", booking.UserID)
	if user, err := s.userRepo.GetByID(booking.UserID); err == nil {
		userName = user.FullName
	}

	// Dynamic Base URL
	baseURL := strings.TrimRight(s.settings.GetSettingValue("site_url"), "/")
	if baseURL == "" {
		baseURL = "http://127.0.0.1:3000"
	}
	link := fmt.Sprintf(`<a href="%s/admin/manage-bookings">คลิกเพื่อดูรายละเอียดและอนุมัติ</a>`, baseURL)

	// Escape strings to prevent HTML parse errors
	subject := html.EscapeString(booking.Subject)
	rName := html.EscapeString(roomName)
	uName := html.EscapeString(userName)

	msg := fmt.Sprintf(
		"🔔 <b>มีการจองห้องประชุมใหม่</b> 🔔\n\n"+
			"📝 <b>หัวข้อ:</b> %s\n"+
			"🏢 <b>ห้อง:</b> %s\n"+
			"📅 <b>เวลา:</b> %s\n"+
			"👤 <b>ผู้จอง:</b> %s\n\n"+
			"🔗 <b>Link :</b> %s",
		subject,
		rName,
		booking.StartTime.Format("02/01/2006 15:04"),
		uName,
		link,
	)

	return s.SendTelegram(adminChatID, msg)
}

func (s *notificationService) NotifyAdminNewRecurringBooking(bookings []domain.Booking) error {
	if len(bookings) == 0 {
		return nil
	}
	if s.settings.GetSettingValue("notify_admin") != "true" {
		return nil
	}

	adminChatID := s.settings.GetSettingValue("telegram_admin_chat_id")
	if adminChatID == "" {
		return nil
	}

	firstBooking := bookings[0]

	// Fetch Room Name
	roomName := fmt.Sprintf("ID %d", firstBooking.RoomID)
	if room, err := s.roomRepo.GetByID(firstBooking.RoomID); err == nil {
		roomName = room.RoomName
	}

	// Fetch User Name
	userName := fmt.Sprintf("ID %d", firstBooking.UserID)
	if user, err := s.userRepo.GetByID(firstBooking.UserID); err == nil {
		userName = user.FullName
	}

	// Dynamic Base URL
	baseURL := strings.TrimRight(s.settings.GetSettingValue("site_url"), "/")
	if baseURL == "" {
		baseURL = "http://127.0.0.1:3000"
	}
	link := fmt.Sprintf(`<a href="%s/admin/manage-bookings">คลิกเพื่อดูรายละเอียดและจัดการ</a>`, baseURL)

	// Status text
	statusText := "รออนุมัติ"
	if firstBooking.Status == "approved" {
		statusText = "✅ อนุมัติอัตโนมัติ"
	}

	// Escape strings
	subject := html.EscapeString(firstBooking.Subject)
	rName := html.EscapeString(roomName)
	uName := html.EscapeString(userName)

	// Date list summary
	var dateLines []string
	maxDisplay := 6
	for i, b := range bookings {
		if i < maxDisplay {
			dateLines = append(dateLines, fmt.Sprintf("• %s (%s - %s)",
				b.StartTime.Format("02/01/2006"),
				b.StartTime.Format("15:04"),
				b.EndTime.Format("15:04"),
			))
		}
	}
	if len(bookings) > maxDisplay {
		dateLines = append(dateLines, fmt.Sprintf("... และอีก %d ครั้ง", len(bookings)-maxDisplay))
	}

	datesSummary := strings.Join(dateLines, "\n")

	msg := fmt.Sprintf(
		"🔔 <b>มีการจองห้องประชุมแบบชุดใหม่ (%d ครั้ง)</b> 🔔\n\n"+
			"📝 <b>หัวข้อ:</b> %s\n"+
			"🏢 <b>ห้อง:</b> %s\n"+
			"📊 <b>สถานะ:</b> %s\n"+
			"👤 <b>ผู้จอง:</b> %s\n\n"+
			"📅 <b>รายการวันและเวลา:</b>\n%s\n\n"+
			"🔗 <b>Link :</b> %s",
		len(bookings),
		subject,
		rName,
		statusText,
		uName,
		datesSummary,
		link,
	)

	return s.SendTelegram(adminChatID, msg)
}

func (s *notificationService) NotifyUserStatusChange(booking *domain.Booking) error {
	if s.settings.GetSettingValue("notify_user") != "true" {
		return nil
	}

	userChatID := s.settings.GetSettingValue("telegram_user_chat_id")
	if userChatID == "" {
		return nil
	}
	
	statusText := "รออนุมัติ"
	if booking.Status == "approved" {
		statusText = "✅ อนุมัติแล้ว"
	} else if booking.Status == "rejected" {
		statusText = "❌ ไม่อนุมัติ"
	}

	subject := html.EscapeString(booking.Subject)

	msg := fmt.Sprintf(
		"🔔 <b>สถานะการจองอัปเดต</b>\n\n"+
			"📝 <b>หัวข้อ:</b> %s\n"+
			"สถานะใหม่: <b>%s</b>",
		subject,
		statusText,
	)

	return s.SendTelegram(userChatID, msg)
}
