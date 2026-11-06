package storage

import (
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"

	"gorm.io/gorm"
)

type roomRepository struct {
	db *gorm.DB
}

// NewRoomRepository สร้าง instance ของ repository
// คืนค่ากลับเป็น Interface เพื่อให้สอดคล้องกับ Hexagonal Architecture
func NewRoomRepository(db *gorm.DB) ports.RoomRepository {
	return &roomRepository{db: db}
}

// Create: บันทึกห้องลงฐานข้อมูล
func (r *roomRepository) Create(room *domain.Room) error {
	return r.db.Create(room).Error
}

// GetAll: ดึงข้อมูลห้องทั้งหมด (เรียงตาม id จากน้อยไปมาก)
func (r *roomRepository) GetAll() ([]domain.Room, error) {
	var rooms []domain.Room
	err := r.db.Order("id ASC").Find(&rooms).Error
	return rooms, err
}

// GetByID: ดึงข้อมูลห้องตาม ID
func (r *roomRepository) GetByID(id uint) (*domain.Room, error) {
	var room domain.Room
	// First คือค้นหาตัวแรกที่เจอ, ถ้าไม่เจอจะ return error
	err := r.db.First(&room, id).Error
	if err != nil {
		return nil, err
	}
	return &room, nil
}

// Update: อัปเดตข้อมูลห้อง
func (r *roomRepository) Update(room *domain.Room) error {
	return r.db.Save(room).Error
}

// Delete: ลบห้อง (Soft Delete เพราะเรากำหนด gorm.DeletedAt ไว้ใน domain)
func (r *roomRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Room{}, id).Error
}