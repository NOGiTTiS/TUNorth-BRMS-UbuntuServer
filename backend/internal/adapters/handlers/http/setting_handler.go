package http

import (
	"fmt"
	"path/filepath"
	"time"
	"tunorth-brms-backend/internal/adapters/storage"
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type SettingHandler struct {
	service ports.SettingService
}

func NewSettingHandler(service ports.SettingService) *SettingHandler {
	return &SettingHandler{service: service}
}

// GET /api/settings
func (h *SettingHandler) GetAllSettings(c *fiber.Ctx) error {
	_, list, err := h.service.GetAllSettings()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	// Return list for admin UI to render inputs
	return c.JSON(list)
}

// GET /api/settings/public (สำหรับ Frontend เรียกไปใช้ render ทั่วไป ไม่ต้อง login ก็ได้ หรือ login ก็ได้)
func (h *SettingHandler) GetPublicSettings(c *fiber.Ctx) error {
	dict, _, err := h.service.GetAllSettings()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Whitelist allowed public keys to strictly prevent leaking secrets
	allowedKeys := map[string]bool{
		"site_name":              true,
		"site_description":       true,
		"copyright_text":         true,
		"institute_name":         true,
		"enable_register":        true,
		"site_logo":              true,
		"favicon":                true,
		"theme_color":            true,
		"theme_color_secondary":  true,
		"bg_color_start":         true,
		"bg_color_end":           true,
		"default_booking_status": true,
		"advance_booking_days":   true,
		"allow_weekend":          true,
		"max_recurring_count":    true,
		"popup_enabled":          true,
		"popup_image":            true,
		"popup_link":             true,
		"site_url":               true,
	}

	publicDict := make(map[string]interface{})
	for k, v := range dict {
		if allowedKeys[k] {
			publicDict[k] = v
		}
	}

	return c.JSON(publicDict)
}

// PUT /api/settings
func (h *SettingHandler) UpdateSettings(c *fiber.Ctx) error {
	var updates []domain.Setting
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Extract User ID from Token
	userCtx := c.Locals("user")
	var actorID uint
	if userCtx != nil {
		userToken := userCtx.(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		if idFloat, ok := claims["user_id"].(float64); ok {
			actorID = uint(idFloat)
		}
	}

	if err := h.service.UpdateSettings(updates, actorID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Settings updated successfully"})
}

// POST /api/settings/upload
func (h *SettingHandler) UploadImage(c *fiber.Ctx) error {
	// 1. รับไฟล์
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Image is required"})
	}

	// Retrieve Cloudinary Settings
	cloudName := h.service.GetSettingValue("cloudinary_cloud_name")
	apiKey := h.service.GetSettingValue("cloudinary_api_key")
	apiSecret := h.service.GetSettingValue("cloudinary_api_secret")

	// 2. ถ้ามี Config ครบ ให้ใช้ Cloudinary
	if cloudName != "" && apiKey != "" && apiSecret != "" {
		// Init Adapter
		adapter, err := storage.NewCloudinaryAdapter(cloudName, apiKey, apiSecret)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to init Cloudinary: " + err.Error()})
		}

		// Upload
		url, err := adapter.Upload(file, "setting_"+fmt.Sprint(time.Now().UnixNano()))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Cloudinary Upload Failed: " + err.Error()})
		}

		return c.JSON(fiber.Map{"url": url})
	}

	// -------------------------------------------------------------
	// Fallback: Local Storage (เดิม)
	// -------------------------------------------------------------
	
	// ตรวจสอบนามสกุล
	ext := filepath.Ext(file.Filename)

	// ตั้งชื่อไฟล์ใหม่
	fileName := fmt.Sprintf("setting_%d%s", time.Now().UnixNano(), ext)
	filePath := fmt.Sprintf("./uploads/%s", fileName)

	// บันทึกไฟล์
	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
	}

	// คืนค่า URL (Relative Path เพื่อรองรับทุก Domain และ LAN IP)
	fullURL := fmt.Sprintf("/uploads/%s", fileName)
	return c.JSON(fiber.Map{"url": fullURL})
}
