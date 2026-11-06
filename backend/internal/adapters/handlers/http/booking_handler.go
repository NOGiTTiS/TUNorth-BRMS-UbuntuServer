package http

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"
	"tunorth-brms-backend/internal/adapters/storage"
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type BookingHandler struct {
	service        ports.BookingService
	settingService ports.SettingService
}

func NewBookingHandler(service ports.BookingService, settingService ports.SettingService) *BookingHandler {
	return &BookingHandler{service: service, settingService: settingService}
}

// [GET] /api/bookings?start=...&end=...
func (h *BookingHandler) GetBookings(c *fiber.Ctx) error {
	start := c.Query("start")
	end := c.Query("end")
	userIdStr := c.Query("user_id")

	// 1. กรณีดึงข้อมูลปฏิทิน (กรองตามวันที่ start/end)
	if start != "" && end != "" {
		bookings, err := h.service.GetBookingsByRange(start, end)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}

		// Filter by status if provided (e.g. ?status=approved)
		statusFilter := c.Query("status")
		if statusFilter != "" {
			var filtered []domain.Booking
			for _, b := range bookings {
				if b.Status == statusFilter {
					filtered = append(filtered, b)
				}
			}
			return c.JSON(filtered)
		}

		return c.JSON(bookings)
	}

	// 2. กรณีเรียกแบบแบ่งหน้า (Pagination)
	pageStr := c.Query("page")
	if pageStr != "" {
		page, _ := strconv.Atoi(pageStr)
		limit, _ := strconv.Atoi(c.Query("limit"))
		if page <= 0 {
			page = 1
		}
		if limit <= 0 {
			limit = 10
		}

		var uidPtr *uint
		if userIdStr != "" {
			if id, err := strconv.Atoi(userIdStr); err == nil && id > 0 {
				u := uint(id)
				uidPtr = &u
			}
		}

		var roomIDPtr *uint
		if roomIDStr := c.Query("room_id"); roomIDStr != "" {
			if id, err := strconv.Atoi(roomIDStr); err == nil && id > 0 {
				r := uint(id)
				roomIDPtr = &r
			}
		}

		filterParams := domain.BookingFilterParams{
			Page:   page,
			Limit:  limit,
			UserID: uidPtr,
			RoomID: roomIDPtr,
			Status: c.Query("status"),
			Search: c.Query("search"),
		}

		res, err := h.service.GetPaginatedBookings(filterParams)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(res)
	}

	// 3. ดึงข้อมูลทั้งหมดมาก่อน (กรณีไม่ได้ระบุหน้า เพื่อคง Backward Compatibility)
	bookings, err := h.service.GetAllBookings()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// 3. กรณีดูประวัติส่วนตัว (กรองตาม User ID)
	if userIdStr != "" {
		targetID, err := strconv.Atoi(userIdStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user_id format"})
		}

		var myBookings []domain.Booking
		for _, b := range bookings {
			if int(b.UserID) == targetID {
				myBookings = append(myBookings, b)
			}
		}
		return c.JSON(myBookings)
	}

	// 4. กรณี Admin หรือไม่ส่งอะไรมาเลย -> คืนค่าทั้งหมด
	statusFilter := c.Query("status")
	if statusFilter != "" {
		var filtered []domain.Booking
		for _, b := range bookings {
			if b.Status == statusFilter {
				filtered = append(filtered, b)
			}
		}
		return c.JSON(filtered)
	}

	return c.JSON(bookings)
}

// POST /api/bookings (รองรับ File Upload)
func (h *BookingHandler) CreateBooking(c *fiber.Ctx) error {
	// ดึง User จาก JWT Token เสมอเพื่อความปลอดภัย
	userCtx := c.Locals("user")
	if userCtx == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userToken, ok := userCtx.(*jwt.Token)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token format"})
	}

	claims, ok := userToken.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token claims"})
	}

	tokenUserID := uint(claims["user_id"].(float64))
	userRole, _ := claims["role"].(string)

	roomID, _ := strconv.Atoi(c.FormValue("room_id"))
	attendees, _ := strconv.Atoi(c.FormValue("attendees"))
	
	// แปลงเวลา (Time string -> Time object)
	layout := "2006-01-02T15:04:05.000Z"
	startTime, _ := time.Parse(layout, c.FormValue("start_time"))
	endTime, _ := time.Parse(layout, c.FormValue("end_time"))

	assignedUserID := tokenUserID
	// เฉพาะ Admin เท่านั้นที่สามารถระบุ user_id อื่นเพื่อจองแทนคนอื่นได้
	if userRole == "admin" {
		if uid, err := strconv.Atoi(c.FormValue("user_id")); err == nil && uid > 0 {
			assignedUserID = uint(uid)
		}
	}

	booking := domain.Booking{
		UserID:       assignedUserID,
		RoomID:       uint(roomID),
		Subject:      c.FormValue("subject"),
		Department:   c.FormValue("department"),
		Phone:        c.FormValue("phone"),
		Attendees:    attendees,
		StartTime:    startTime,
		EndTime:      endTime,
		Note:         c.FormValue("note"),
		ResourceText: c.FormValue("resource_text"),
		Status:       "pending",
	}

	// จัดการไฟล์อัปโหลด (Layout Image)
	file, err := c.FormFile("layout_image")
	if err == nil {
		cloudName := h.settingService.GetSettingValue("cloudinary_cloud_name")
		apiKey := h.settingService.GetSettingValue("cloudinary_api_key")
		apiSecret := h.settingService.GetSettingValue("cloudinary_api_secret")

		if cloudName != "" && apiKey != "" && apiSecret != "" {
			adapter, err := storage.NewCloudinaryAdapter(cloudName, apiKey, apiSecret)
			if err == nil {
				url, err := adapter.Upload(file, fmt.Sprintf("booking_%d", time.Now().UnixNano()))
				if err == nil {
					booking.LayoutImage = url
				} else {
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Cloudinary Upload Failed: " + err.Error()})
				}
			} else {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to init Cloudinary: " + err.Error()})
			}
		} else {
			// Fallback: Local Storage
			filename := fmt.Sprintf("booking_%d_%s", time.Now().Unix(), file.Filename)
			path := fmt.Sprintf("./uploads/%s", filename)

			if err := c.SaveFile(file, path); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
			}

			booking.LayoutImage = "/uploads/" + filename
		}
	}

	// เรียก Service บันทึกข้อมูล
	if err := h.service.CreateBooking(&booking); err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(booking)
}

// PATCH /api/bookings/:id/status
func (h *BookingHandler) UpdateStatus(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var input struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if input.Status != "approved" && input.Status != "rejected" && input.Status != "pending" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}

	// ดึง User ID ของคนกดจาก Token จริง
	userCtx := c.Locals("user")
	if userCtx == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userToken, ok := userCtx.(*jwt.Token)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token format"})
	}
	claims, ok := userToken.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token claims"})
	}

	adminID := uint(claims["user_id"].(float64))

	if err := h.service.UpdateBookingStatus(uint(id), input.Status, adminID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Status updated successfully"})
}

// PUT /api/bookings/:id
func (h *BookingHandler) UpdateBooking(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var booking domain.Booking

	if string(c.Request().Header.ContentType()) == "application/json" {
		var input struct {
			Subject      string    `json:"subject"`
			RoomID       uint      `json:"room_id"`
			StartTime    time.Time `json:"start_time"`
			EndTime      time.Time `json:"end_time"`
			Note         string    `json:"note"`
			Department   string    `json:"department"`
			Phone        string    `json:"phone"`
			Attendees    int       `json:"attendees"`
			ResourceText string    `json:"resource_text"`
		}

		if err := c.BodyParser(&input); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
		}

		booking.Subject = input.Subject
		booking.RoomID = input.RoomID
		booking.StartTime = input.StartTime
		booking.EndTime = input.EndTime
		booking.Note = input.Note
		booking.Department = input.Department
		booking.Phone = input.Phone
		booking.Attendees = input.Attendees
		booking.ResourceText = input.ResourceText
	} else {
		booking.Subject = c.FormValue("subject")
		roomID, _ := strconv.Atoi(c.FormValue("room_id"))
		booking.RoomID = uint(roomID)
		booking.Note = c.FormValue("note")
		booking.Department = c.FormValue("department")
		booking.Phone = c.FormValue("phone")
		attendees, _ := strconv.Atoi(c.FormValue("attendees"))
		booking.Attendees = attendees
		booking.ResourceText = c.FormValue("resource_text")

		layout := "2006-01-02T15:04:05.000Z"
		if startTime, err := time.Parse(layout, c.FormValue("start_time")); err == nil {
			booking.StartTime = startTime
		}
		if endTime, err := time.Parse(layout, c.FormValue("end_time")); err == nil {
			booking.EndTime = endTime
		}

		file, err := c.FormFile("layout_image")
		if err == nil {
			cloudName := h.settingService.GetSettingValue("cloudinary_cloud_name")
			apiKey := h.settingService.GetSettingValue("cloudinary_api_key")
			apiSecret := h.settingService.GetSettingValue("cloudinary_api_secret")

			if cloudName != "" && apiKey != "" && apiSecret != "" {
				adapter, err := storage.NewCloudinaryAdapter(cloudName, apiKey, apiSecret)
				if err == nil {
					url, err := adapter.Upload(file, fmt.Sprintf("booking_%d", time.Now().UnixNano()))
					if err == nil {
						booking.LayoutImage = url
					}
				}
			} else {
				filename := fmt.Sprintf("booking_%d_%s", time.Now().Unix(), file.Filename)
				path := fmt.Sprintf("./uploads/%s", filename)
				if err := c.SaveFile(file, path); err == nil {
					booking.LayoutImage = "/uploads/" + filename
				}
			}
		}
	}

	if booking.Subject == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Subject cannot be empty"})
	}

	// Get User ID from Token
	userCtx := c.Locals("user")
	actorID := uint(0)
	if userCtx != nil {
		userToken := userCtx.(*jwt.Token)
		claims := userToken.Claims.(jwt.MapClaims)
		if idFloat, ok := claims["user_id"].(float64); ok {
			actorID = uint(idFloat)
		}
	}

	if actorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.service.UpdateBooking(uint(id), &booking, actorID); err != nil {
		if err.Error() == "unauthorized" || err.Error() == "you do not have permission to update this booking" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Booking updated successfully"})
}

// DELETE /api/bookings/:id
func (h *BookingHandler) DeleteBooking(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	userCtx := c.Locals("user")
	if userCtx == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userToken := userCtx.(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)

	idInterface := claims["user_id"]
	var actorID uint
	if idFloat, ok := idInterface.(float64); ok {
		actorID = uint(idFloat)
	} else {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token claims"})
	}

	if err := h.service.DeleteBooking(uint(id), actorID); err != nil {
		if err.Error() == "unauthorized" || err.Error() == "you do not have permission to delete this booking" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.SendStatus(fiber.StatusOK)
}

func parseFlexibleTime(tStr string) (time.Time, error) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04:05.000Z",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, tStr); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unable to parse time: %s", tStr)
}

// POST /api/bookings/check-conflicts
func (h *BookingHandler) CheckConflicts(c *fiber.Ctx) error {
	userCtx := c.Locals("user")
	if userCtx == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userToken, ok := userCtx.(*jwt.Token)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token format"})
	}
	claims, ok := userToken.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token claims"})
	}
	tokenUserID := uint(claims["user_id"].(float64))

	var input struct {
		RoomID uint `json:"room_id"`
		Slots  []struct {
			StartTime string `json:"start_time"`
			EndTime   string `json:"end_time"`
		} `json:"slots"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input: " + err.Error()})
	}

	if input.RoomID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "room_id is required"})
	}

	var slots []ports.TimeSlot
	for _, s := range input.Slots {
		st, err1 := parseFlexibleTime(s.StartTime)
		et, err2 := parseFlexibleTime(s.EndTime)
		if err1 != nil || err2 != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid time format in slots"})
		}
		slots = append(slots, ports.TimeSlot{
			StartTime: st,
			EndTime:   et,
		})
	}

	results, err := h.service.CheckSlotsAvailability(input.RoomID, slots, tokenUserID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(results)
}

// POST /api/bookings/recurring (รองรับ File Upload และ Slots หลายวัน)
func (h *BookingHandler) CreateRecurringBooking(c *fiber.Ctx) error {
	userCtx := c.Locals("user")
	if userCtx == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userToken, ok := userCtx.(*jwt.Token)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token format"})
	}
	claims, ok := userToken.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token claims"})
	}
	tokenUserID := uint(claims["user_id"].(float64))
	userRole, _ := claims["role"].(string)

	roomID, _ := strconv.Atoi(c.FormValue("room_id"))
	attendees, _ := strconv.Atoi(c.FormValue("attendees"))
	recurrenceType := c.FormValue("recurrence_type")
	if recurrenceType == "" {
		recurrenceType = "weekly"
	}

	assignedUserID := tokenUserID
	if userRole == "admin" {
		if uid, err := strconv.Atoi(c.FormValue("user_id")); err == nil && uid > 0 {
			assignedUserID = uint(uid)
		}
	}

	// Parse slots JSON string: [{"start_time": "...", "end_time": "..."}]
	slotsRaw := c.FormValue("slots")
	if slotsRaw == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slots is required"})
	}

	var slotInputs []struct {
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
	}
	if err := json.Unmarshal([]byte(slotsRaw), &slotInputs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid slots JSON: " + err.Error()})
	}

	if len(slotInputs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "At least one slot must be provided"})
	}

	// Upload layout image if provided
	var layoutImageURL string
	file, err := c.FormFile("layout_image")
	if err == nil {
		cloudName := h.settingService.GetSettingValue("cloudinary_cloud_name")
		apiKey := h.settingService.GetSettingValue("cloudinary_api_key")
		apiSecret := h.settingService.GetSettingValue("cloudinary_api_secret")

		if cloudName != "" && apiKey != "" && apiSecret != "" {
			adapter, err := storage.NewCloudinaryAdapter(cloudName, apiKey, apiSecret)
			if err == nil {
				url, err := adapter.Upload(file, fmt.Sprintf("booking_%d", time.Now().UnixNano()))
				if err == nil {
					layoutImageURL = url
				} else {
					return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Cloudinary Upload Failed: " + err.Error()})
				}
			} else {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to init Cloudinary: " + err.Error()})
			}
		} else {
			filename := fmt.Sprintf("booking_%d_%s", time.Now().Unix(), file.Filename)
			path := fmt.Sprintf("./uploads/%s", filename)
			if err := c.SaveFile(file, path); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save file"})
			}
			layoutImageURL = "/uploads/" + filename
		}
	}

	var bookings []domain.Booking
	for _, s := range slotInputs {
		st, err1 := parseFlexibleTime(s.StartTime)
		et, err2 := parseFlexibleTime(s.EndTime)
		if err1 != nil || err2 != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid time format in slots"})
		}

		b := domain.Booking{
			UserID:         assignedUserID,
			RoomID:         uint(roomID),
			Subject:        c.FormValue("subject"),
			Department:     c.FormValue("department"),
			Phone:          c.FormValue("phone"),
			Attendees:      attendees,
			StartTime:      st,
			EndTime:        et,
			Note:           c.FormValue("note"),
			ResourceText:   c.FormValue("resource_text"),
			LayoutImage:    layoutImageURL,
			RecurrenceType: recurrenceType,
		}
		bookings = append(bookings, b)
	}

	createdBookings, err := h.service.CreateRecurringBooking(bookings)
	if err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(createdBookings)
}

// PATCH /api/bookings/group/:groupId/status
func (h *BookingHandler) UpdateGroupStatus(c *fiber.Ctx) error {
	groupID := c.Params("groupId")
	if groupID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Group ID"})
	}

	var input struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if input.Status != "approved" && input.Status != "rejected" && input.Status != "pending" && input.Status != "cancelled" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}

	userCtx := c.Locals("user")
	if userCtx == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userToken, ok := userCtx.(*jwt.Token)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token format"})
	}
	claims, ok := userToken.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token claims"})
	}
	adminID := uint(claims["user_id"].(float64))

	if err := h.service.UpdateRecurringGroupStatus(groupID, input.Status, adminID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Group status updated successfully"})
}

// DELETE /api/bookings/group/:groupId
func (h *BookingHandler) DeleteGroup(c *fiber.Ctx) error {
	groupID := c.Params("groupId")
	if groupID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Group ID"})
	}

	userCtx := c.Locals("user")
	if userCtx == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userToken, ok := userCtx.(*jwt.Token)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token format"})
	}
	claims, ok := userToken.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token claims"})
	}
	actorID := uint(claims["user_id"].(float64))

	if err := h.service.DeleteRecurringGroup(groupID, actorID); err != nil {
		if err.Error() == "unauthorized" || err.Error() == "you do not have permission to delete this booking group" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Group deleted successfully"})
}
