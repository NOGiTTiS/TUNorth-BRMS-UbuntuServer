package ports

import "tunorth-brms-backend/internal/core/domain"

type UserRepository interface {
	Create(user *domain.User) error
	GetByUsername(username string) (*domain.User, error)
	GetByEmail(email string) (*domain.User, error) // Added for explicit check
	GetByUsernameOrEmail(identifier string) (*domain.User, error)
	GetByID(id uint) (*domain.User, error)
	GetAll() ([]domain.User, error)
	GetPaginated(page, limit int, search string) ([]domain.User, int64, error)
	Update(user *domain.User) error
	Delete(id uint) error
	Count() (int64, error)
}

type AuthService interface {
	Register(user *domain.User) error
	Login(identifier, password string) (string, uint, error)
	GetMe(userID uint) (*domain.User, error)
	UpdateMe(userID uint, user *domain.User) error
}

// --- แก้ไขตรงนี้ครับ ---
type UserService interface {
	GetAllUsers() ([]domain.User, error)
	GetPaginatedUsers(page, limit int, search string) (*domain.PaginatedResult[domain.User], error)
	UpdateUser(id uint, user *domain.User) error
	DeleteUser(id uint) error

	// ✅ เพิ่มบรรทัดนี้ลงไปครับ
	CreateUser(user *domain.User) error
	InitializeDefaultAdmin() error
}
