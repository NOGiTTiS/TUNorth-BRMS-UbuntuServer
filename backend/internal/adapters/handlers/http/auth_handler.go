package http

import (
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type AuthHandler struct {
	service        ports.AuthService
	logService     ports.LogService
	settingService ports.SettingService
}

func NewAuthHandler(service ports.AuthService, logService ports.LogService, settingService ports.SettingService) *AuthHandler {
	return &AuthHandler{service: service, logService: logService, settingService: settingService}
}

// POST /api/register
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	// Check if registration is enabled
	enableRegister := h.settingService.GetSettingValue("enable_register")
	if enableRegister == "false" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Registration is currently disabled"})
	}

	// 1. สร้าง Struct สำหรับรับข้อมูลการสมัครโดยเฉพาะ (เพื่อให้รับ Password ได้)
	type RegisterRequest struct {
		Username   string `json:"username"`
		Password   string `json:"password"`
		FullName   string `json:"full_name"`
		Department string `json:"department"`
		Email      string `json:"email"`
		Tel        string `json:"tel"`
	}

	var req RegisterRequest
	
	// 2. แปลง JSON เข้า Struct ใหม่นี้
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	// 3. ย้ายข้อมูลจาก Request ไปใส่ใน domain.User
	// บังคับให้ Role เป็น "user" เสมอเพื่อป้องกัน Privilege Escalation
	user := domain.User{
		Username:   req.Username,
		Password:   req.Password, // ส่งรหัสผ่านไปให้ Service Hash ต่อ
		FullName:   req.FullName,
		Department: req.Department,
		Role:       "user",
		Email:      req.Email,
		Tel:        req.Tel,
	}

	// 4. ส่งให้ Service ทำงานตามปกติ
	if err := h.service.Register(&user); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "User registered successfully"})
}

// POST /api/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	token, userID, err := h.service.Login(input.Username, input.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	// Log Action
	go h.logService.LogAction(userID, "LOGIN", "เข้าสู่ระบบสำเร็จ", c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{
		"message": "Login successful",
		"token":   token,
	})
}

// GET /api/me
func (h *AuthHandler) GetMe(c *fiber.Ctx) error {
	// Extract user_id from Claims (middleware should set this)
	user := c.Locals("user").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)
	userID := uint(claims["user_id"].(float64))

	u, err := h.service.GetMe(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	// Hide password
	u.Password = ""

	return c.JSON(u)
}

// PUT /api/me
func (h *AuthHandler) UpdateMe(c *fiber.Ctx) error {
	user := c.Locals("user").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)
	userID := uint(claims["user_id"].(float64))

	type UpdateMeRequest struct {
		FullName   string `json:"full_name"`
		Email      string `json:"email"`
		Tel        string `json:"tel"`
		Department string `json:"department"`
		Password   string `json:"password"`
	}

	var req UpdateMeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	userUpdates := domain.User{
		FullName:   req.FullName,
		Email:      req.Email,
		Tel:        req.Tel,
		Department: req.Department,
		Password:   req.Password,
	}

	if err := h.service.UpdateMe(userID, &userUpdates); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Profile updated successfully"})
}
