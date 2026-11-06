package storage

import (
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"

	"gorm.io/gorm"
)

type logRepository struct {
	db *gorm.DB
}

func NewLogRepository(db *gorm.DB) ports.LogRepository {
	return &logRepository{db: db}
}

func (r *logRepository) Create(log *domain.Log) error {
	return r.db.Create(log).Error
}

func (r *logRepository) GetAll(limit int) ([]domain.Log, error) {
	var logs []domain.Log
	// Preload User to show who did the action
	err := r.db.Preload("User").Order("created_at desc").Limit(limit).Find(&logs).Error
	return logs, err
}

func (r *logRepository) GetPaginated(page, limit int, search string) ([]domain.Log, int64, error) {
	tx := r.db.Model(&domain.Log{})
	if search != "" {
		pattern := "%" + search + "%"
		tx = tx.Joins("LEFT JOIN users ON users.id = logs.user_id").
			Where("logs.action ILIKE ? OR logs.description ILIKE ? OR users.username ILIKE ? OR users.full_name ILIKE ?", pattern, pattern, pattern, pattern)
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

	var logs []domain.Log
	err := tx.Preload("User").Order("logs.created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error
	return logs, total, err
}
