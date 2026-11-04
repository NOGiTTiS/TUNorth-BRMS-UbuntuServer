package http

import (
	"encoding/csv"
	"io"
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"

	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	service ports.UserService
}

func NewUserHandler(service ports.UserService) *UserHandler {
	return &UserHandler{service: service}
}

// POST /api/users
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	type CreateUserRequest struct {
		Username   string `json:"username"`
		Password   string `json:"password"`
		FullName   string `json:"full_name"`
		Department string `json:"department"`
		Role       string `json:"role"`
		Email      string `json:"email"`
		Tel        string `json:"tel"`
	}

	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	user := domain.User{
		Username:   req.Username,
		Password:   req.Password,
		FullName:   req.FullName,
		Department: req.Department,
		Role:       req.Role,
		Email:      req.Email,
		Tel:        req.Tel,
	}

	if err := h.service.CreateUser(&user); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "User created successfully"})
}

// GET /api/users
func (h *UserHandler) GetAllUsers(c *fiber.Ctx) error {
	users, err := h.service.GetAllUsers()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(users)
}

// PUT /api/users/:id
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	type UpdateUserRequest struct {
		FullName   string `json:"full_name"`
		Department string `json:"department"`
		Tel        string `json:"tel"`
		Email      string `json:"email"`
		Role       string `json:"role"`
		Password   string `json:"password"`
	}

	var req UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	user := domain.User{
		FullName:   req.FullName,
		Department: req.Department,
		Tel:        req.Tel,
		Email:      req.Email,
		Role:       req.Role,
		Password:   req.Password,
	}

	if err := h.service.UpdateUser(uint(id), &user); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "User updated successfully"})
}

// DELETE /api/users/:id
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	if err := h.service.DeleteUser(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "User deleted successfully"})
}

// POST /api/users/import (Import CSV)
func (h *UserHandler) ImportUsers(c *fiber.Ctx) error {
	// 1. รับไฟล์จาก Form
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Please upload a CSV file"})
	}

	// 2. เปิดไฟล์
	f, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer f.Close()

	// 3. อ่าน CSV
	reader := csv.NewReader(f)

	// อ่านบรรทัดแรกทิ้ง (ถ้าไฟล์ CSV มี Header: username,password,...)
	// ถ้าไฟล์ไม่มี Header ให้คอมเมนต์บรรทัดนี้ออก
	_, _ = reader.Read()

	successCount := 0
	failCount := 0
	var errorsList []string

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break // จบไฟล์
		}
		if err != nil {
			continue // อ่านบรรทัดนี้ไม่ได้ ข้ามไป
		}

		// ตรวจสอบว่า Column ครบไหม (อย่างน้อยต้องมี username, password, full_name)
		if len(record) < 3 {
			failCount++
			continue
		}

		// Map ข้อมูลจาก CSV (เรียงตามลำดับ Column)
		// 0:username, 1:password, 2:full_name, 3:department, 4:tel, 5:email, 6:role
		user := domain.User{
			Username:   record[0],
			Password:   record[1],
			FullName:   record[2],
			Department: getSafeValue(record, 3),
			Tel:        getSafeValue(record, 4),
			Email:      getSafeValue(record, 5),
			Role:       getSafeValue(record, 6),
		}

		// กำหนด Default Role ถ้าในไฟล์ไม่ได้ระบุมา
		if user.Role == "" {
			user.Role = "user"
		}

		// เรียก Service เพื่อบันทึก (Service จะทำการ Hash Password ให้)
		if err := h.service.CreateUser(&user); err != nil {
			failCount++
			errorsList = append(errorsList, user.Username+": "+err.Error())
		} else {
			successCount++
		}
	}

	return c.JSON(fiber.Map{
		"message": "Import completed",
		"success": successCount,
		"failed":  failCount,
		"errors":  errorsList,
	})
}

// Helper function: ป้องกัน Index out of range กรณี CSV บางบรรทัดมีข้อมูลไม่ครบทุกช่อง
func getSafeValue(record []string, index int) string {
	if index < len(record) {
		return record[index]
	}
	return ""
}