package services

import (
	"fmt"
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"
)

type settingService struct {
	repo       ports.SettingRepository
	logService ports.LogService
}

func NewSettingService(repo ports.SettingRepository, logService ports.LogService) ports.SettingService {
	return &settingService{repo: repo, logService: logService}
}

func (s *settingService) GetAllSettings() (map[string]interface{}, []domain.Setting, error) {
	settings, err := s.repo.GetAll()
	if err != nil {
		return nil, nil, err
	}

	resultMap := make(map[string]interface{})
	for _, setting := range settings {
		resultMap[setting.SettingName] = setting.SettingValue
	}

	return resultMap, settings, nil
}

func (s *settingService) UpdateSettings(updates []domain.Setting, actorID uint) error {
	if err := s.repo.UpdateBatch(updates); err != nil {
		return err
	}
	go s.logService.LogAction(actorID, "UPDATE_SETTINGS", fmt.Sprintf("Updated %d settings", len(updates)), "", "")
	return nil
}

func (s *settingService) GetSettingValue(key string) string {
	setting, err := s.repo.GetByName(key)
	if err != nil {
		return ""
	}
	return setting.SettingValue
}

func (s *settingService) InitializeDefaults() error {
	defaults := []domain.Setting{
		// General
		{SettingName: "site_name", SettingValue: "TUNorth-BRMS", Group: "general", Type: "text", Label: "ระบบชื่อ", Description: "ชื่อระบบที่แสดงบนแถบ Title"},
		{SettingName: "site_description", SettingValue: "ระบบจองห้องประชุมออนไลน์", Group: "general", Type: "text", Label: "คำอธิบายระบบ", Description: "คำอธิบายสั้นๆ เกี่ยวกับระบบ"},
		{SettingName: "site_url", SettingValue: "http://localhost:3000", Group: "general", Type: "text", Label: "URL ของเว็บไซต์", Description: "URL สำหรับสร้างลิงก์ในระบบแจ้งเตือน (เช่น https://brms.tunorth.ac.th)"},
		{SettingName: "copyright_text", SettingValue: "© 2026 Triam Udom Suksa", Group: "general", Type: "text", Label: "ข้อความลิขสิทธิ์", Description: "ข้อความ Footer"},
		{SettingName: "institute_name", SettingValue: "Triam Udom Suksa", Group: "general", Type: "text", Label: "ชื่อสถาบัน", Description: "ชื่อสถาบันต้นสังกัด"},
		{SettingName: "enable_register", SettingValue: "true", Group: "general", Type: "boolean", Label: "เปิดรับสมัครสมาชิก", Description: "เปิด/ปิด การลงทะเบียนสมัครสมาชิกใหม่"},

		// Images
		{SettingName: "site_logo", SettingValue: "", Group: "images", Type: "image", Label: "โลโก้เว็บไซต์", Description: "รูปภาพโลโก้หลัก (PNG/JPG)"},
		{SettingName: "favicon", SettingValue: "", Group: "images", Type: "image", Label: "Favicon", Description: "ไอคอนบน Tab Browser"},

		// Theme
		{SettingName: "theme_color", SettingValue: "#db2777", Group: "theme", Type: "color", Label: "สีธีมหลัก", Description: "สีหลักของปุ่มและ Highlight (Default: Pink-600)"},
		{SettingName: "theme_color_secondary", SettingValue: "#be185d", Group: "theme", Type: "color", Label: "สีธีมรอง (Hover / Highlight)", Description: "สีเมื่อเอาเมาส์ไปชี้ปุ่ม และสีไฮไลท์ข้อความ"},
		{SettingName: "bg_color_start", SettingValue: "#f8fafc", Group: "theme", Type: "color", Label: "สีพื้นหลัง (เริ่ม)", Description: "Gradient Start"},
		{SettingName: "bg_color_end", SettingValue: "#f1f5f9", Group: "theme", Type: "color", Label: "สีพื้นหลัง (จบ)", Description: "Gradient End"},

		// Booking
		{SettingName: "default_booking_status", SettingValue: "pending", Group: "booking", Type: "select", Label: "สถานะเริ่มต้น", Description: "pending หรือ approved"},
		{SettingName: "advance_booking_days", SettingValue: "1", Group: "booking", Type: "number", Label: "จองล่วงหน้าอย่างน้อย (วัน)", Description: "จำนวนวันที่ต้องจองล่วงหน้า"},
		{SettingName: "allow_weekend", SettingValue: "false", Group: "booking", Type: "boolean", Label: "อนุญาตให้จองเสาร์-อาทิตย์", Description: "เปิด/ปิด การจองในวันหยุด"},
		{SettingName: "max_recurring_count", SettingValue: "12", Group: "booking", Type: "number", Label: "จำนวนการจองซ้ำสูงสุด (ครั้ง)", Description: "จำกัดจำนวนครั้งสูงสุดต่อการจองแบบชุด/ต่อเนื่อง (เช่น 12 ครั้ง)"},

		// Telegram
		{SettingName: "telegram_bot_token", SettingValue: "", Group: "telegram", Type: "password", Label: "Telegram Bot Token", Description: "Token จาก BotFather"},
		{SettingName: "telegram_admin_chat_id", SettingValue: "", Group: "telegram", Type: "text", Label: "Admin Chat ID", Description: "Group ID สำหรับแอดมิน"},
		{SettingName: "telegram_user_chat_id", SettingValue: "", Group: "telegram", Type: "text", Label: "User Chat ID", Description: "Group ID สำหรับแจ้งเตือนทั่วไป"},

		// Notifications
		{SettingName: "notify_admin", SettingValue: "true", Group: "notification", Type: "boolean", Label: "แจ้งเตือนแอดมิน", Description: "เมื่อมีการจองใหม่"},
		{SettingName: "notify_user", SettingValue: "true", Group: "notification", Type: "boolean", Label: "แจ้งเตือนผู้ใช้", Description: "เมื่อสถานะเปลี่ยน"},

		// Popup
		{SettingName: "popup_enabled", SettingValue: "false", Group: "popup", Type: "boolean", Label: "เปิดใช้งาน Popup", Description: "แสดง Popup เมื่อเข้าสู่ระบบ"},
		{SettingName: "popup_image", SettingValue: "", Group: "popup", Type: "image", Label: "รูปภาพ Popup / QR", Description: "รูปภาพที่จะแสดงใน Popup"},
		{SettingName: "popup_link", SettingValue: "", Group: "popup", Type: "text", Label: "ลิงก์ (เช่น Google Form)", Description: "ลิงก์เมื่อคลิกปุ่ม"},

		// Cloudinary Storage
		{SettingName: "cloudinary_cloud_name", SettingValue: "", Group: "storage", Type: "text", Label: "Cloud Name", Description: "Cloudinary Cloud Name"},
		{SettingName: "cloudinary_api_key", SettingValue: "", Group: "storage", Type: "text", Label: "API Key", Description: "Cloudinary API Key"},
		{SettingName: "cloudinary_api_secret", SettingValue: "", Group: "storage", Type: "password", Label: "API Secret", Description: "Cloudinary API Secret"},
	}

	for _, d := range defaults {
		existing, err := s.repo.GetByName(d.SettingName)
		if err != nil || existing.SettingName == "" {
			_ = s.repo.Update(&d)
		}
	}
	return nil
}
