package ports

import "tunorth-brms-backend/internal/core/domain"

type LogRepository interface {
	Create(log *domain.Log) error
	GetAll(limit int) ([]domain.Log, error)
	GetPaginated(page, limit int, search string) ([]domain.Log, int64, error)
	// Add filter method later if needed
}

type LogService interface {
	LogAction(userID uint, action, description, ip, userAgent string) error
	GetLogs(limit int) ([]domain.Log, error)
	GetPaginatedLogs(page, limit int, search string) (*domain.PaginatedResult[domain.Log], error)
}
