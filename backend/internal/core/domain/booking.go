package domain

import (
	"time"

	"gorm.io/gorm"
)

// Booking struct แทนตาราง bookings
type Booking struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	UserID         uint           `gorm:"not null" json:"user_id"`
	User           User           `gorm:"foreignKey:UserID" json:"user"`
	RoomID         uint           `gorm:"not null" json:"room_id"`
	Room           Room           `gorm:"foreignKey:RoomID" json:"room"`
	Subject        string         `gorm:"not null" json:"subject"`
	Department     string         `json:"department"`
	Phone          string         `json:"phone"`
	Attendees      int            `json:"attendees"`
	StartTime      time.Time      `gorm:"not null" json:"start_time"`
	EndTime        time.Time      `gorm:"not null" json:"end_time"`
	
	Note           string         `json:"note"`
	ResourceText   string         `json:"resource_text"` // เพิ่มบรรทัดนี้ (เก็บรายชื่ออุปกรณ์)
	
	LayoutImage    string         `json:"layout_image"`
	Status         string         `gorm:"default:'pending'" json:"status"`
	ApproverID     *uint          `json:"approver_id"`
	Approver       *User          `gorm:"foreignKey:ApproverID" json:"approver"`
	RejectReason   string         `json:"reject_reason"`
	RecurringGroupID *string      `gorm:"index;size:64" json:"recurring_group_id"`
	RecurrenceType   string       `gorm:"size:32;default:'none'" json:"recurrence_type"`
	RecurrenceIndex  int          `gorm:"default:1" json:"recurrence_index"`
	RecurrenceTotal  int          `gorm:"default:1" json:"recurrence_total"`
	BookingResources []BookingResource `gorm:"foreignKey:BookingID" json:"booking_resources"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// BookingResource ตารางกลางสำหรับ Many-to-Many
type BookingResource struct {
	BookingID  uint     `gorm:"primaryKey" json:"booking_id"`
	ResourceID uint     `gorm:"primaryKey" json:"resource_id"`
	Resource   Resource `gorm:"foreignKey:ResourceID" json:"resource"`
	Quantity   int      `json:"quantity"`
}