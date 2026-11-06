package domain

// PaginatedResult เป็นโครงสร้างข้อมูลมาตรฐานสำหรับผลลัพธ์การแบ่งหน้า (Generic)
type PaginatedResult[T any] struct {
	Data       []T   `json:"data"`
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalPages int   `json:"total_pages"`
}

// BookingFilterParams เป็นพารามิเตอร์สำหรับกรองและแบ่งหน้ารายการจอง
type BookingFilterParams struct {
	Page   int
	Limit  int
	UserID *uint
	Status string
	Search string
	RoomID *uint
}
