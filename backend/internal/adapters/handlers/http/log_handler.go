package http

import (
	"strconv"
	"tunorth-brms-backend/internal/core/ports"

	"github.com/gofiber/fiber/v2"
)

type LogHandler struct {
	service ports.LogService
}

func NewLogHandler(service ports.LogService) *LogHandler {
	return &LogHandler{service: service}
}

// [GET] /api/logs
func (h *LogHandler) GetLogs(c *fiber.Ctx) error {
	pageStr := c.Query("page")
	if pageStr != "" {
		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(c.Query("limit"))
		search := c.Query("search")
		if page <= 0 {
			page = 1
		}
		if limit <= 0 {
			limit = 10
		}

		res, err := h.service.GetPaginatedLogs(page, limit, search)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(res)
	}

	logs, err := h.service.GetLogs(100) // Limit 100 default
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(logs)
}

// [POST] /api/logs/test (For manual testing)
func (h *LogHandler) CreateTestLog(c *fiber.Ctx) error {
	var input struct {
		UserID      uint   `json:"user_id"`
		Action      string `json:"action"`
		Description string `json:"description"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Capture IP and User Agent
	ip := c.IP()
	userAgent := c.Get("User-Agent")

	if err := h.service.LogAction(input.UserID, input.Action, input.Description, ip, userAgent); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Log created successfully"})
}
