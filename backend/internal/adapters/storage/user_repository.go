package storage

import (
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"

	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) ports.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(user *domain.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) GetByUsername(username string) (*domain.User, error) {
	var user domain.User
	err := r.db.Where("username = ?", username).First(&user).Error
	return &user, err
}

func (r *userRepository) GetByEmail(email string) (*domain.User, error) {
	var user domain.User
	err := r.db.Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *userRepository) GetByUsernameOrEmail(identifier string) (*domain.User, error) {
	var user domain.User
	err := r.db.Where("username = ? OR email = ?", identifier, identifier).First(&user).Error
	return &user, err
}

func (r *userRepository) GetByID(id uint) (*domain.User, error) {
	var user domain.User
	err := r.db.First(&user, id).Error
	return &user, err
}

func (r *userRepository) GetAll() ([]domain.User, error) {
	var users []domain.User
	// ดึงทั้งหมด (ไม่เอา Password มาแสดง)
	err := r.db.Omit("password").Find(&users).Error
	return users, err
}

func (r *userRepository) GetPaginated(page, limit int, search string) ([]domain.User, int64, error) {
	tx := r.db.Model(&domain.User{})
	if search != "" {
		pattern := "%" + search + "%"
		tx = tx.Where("username ILIKE ? OR full_name ILIKE ? OR email ILIKE ? OR department ILIKE ?", pattern, pattern, pattern, pattern)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if limit <= 0 {
		limit = 10
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	var users []domain.User
	err := tx.Omit("password").Order("id DESC").Offset(offset).Limit(limit).Find(&users).Error
	return users, total, err
}

func (r *userRepository) Update(user *domain.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&domain.User{}, id).Error
}

func (r *userRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&domain.User{}).Count(&count).Error
	return count, err
}