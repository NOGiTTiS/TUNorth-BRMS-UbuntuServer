package domain

import (
	"time"

	"gorm.io/gorm"
)

type Log struct {
	gorm.Model
	UserID      *uint     `json:"user_id"`
	User        *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Action      string    `json:"action"`      // e.g., "LOGIN", "UPLOAD", "create_booking"
	Description string    `json:"description"` // Details
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent"` // Optional: Browser info
	CreatedAt   time.Time `json:"created_at"`
}
