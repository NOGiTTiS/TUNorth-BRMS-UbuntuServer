package services

import (
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"
)

type logService struct {
	repo ports.LogRepository
}

func NewLogService(repo ports.LogRepository) ports.LogService {
	return &logService{repo: repo}
}

func (s *logService) LogAction(userID uint, action, description, ip, userAgent string) error {
	var uid *uint
	if userID > 0 {
		uid = &userID
	}
	log := &domain.Log{
		UserID:      uid,
		Action:      action,
		Description: description,
		IPAddress:   ip,
		UserAgent:   userAgent,
	}
	return s.repo.Create(log)
}

func (s *logService) GetLogs(limit int) ([]domain.Log, error) {
	// Default limit if not provided
	if limit <= 0 {
		limit = 100
	}
	return s.repo.GetAll(limit)
}

func (s *logService) GetPaginatedLogs(page, limit int, search string) (*domain.PaginatedResult[domain.Log], error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}

	logs, total, err := s.repo.GetPaginated(page, limit, search)
	if err != nil {
		return nil, err
	}

	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return &domain.PaginatedResult[domain.Log]{
		Data:       logs,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}
