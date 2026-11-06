package services

import (
	"errors"
	"fmt"
	"os"
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/ports"

	"golang.org/x/crypto/bcrypt"
)

type userService struct {
	repo       ports.UserRepository
	logService ports.LogService
}

func NewUserService(repo ports.UserRepository, logService ports.LogService) ports.UserService {
	return &userService{
		repo:       repo,
		logService: logService,
	}
}

// CreateUser: สร้างผู้ใช้ใหม่ (ใช้สำหรับ Import CSV หรือ Admin สร้างให้)
func (s *userService) CreateUser(user *domain.User) error {
	// 1. ตรวจสอบ Username ซ้ำ
	if _, err := s.repo.GetByUsername(user.Username); err == nil {
		// ถ้า err == nil แสดงว่าเจอ user เดิม (ซ้ำ)
		return errors.New("username " + user.Username + " already exists")
	}

	// 2. Hash Password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.Password = string(hashedPassword)

	// 3. บันทึก
	// 3. บันทึก
	if err := s.repo.Create(user); err != nil {
		return err
	}

	// 4. Log
	go s.logService.LogAction(user.ID, "CREATE_USER", fmt.Sprintf("Created user: %s", user.Username), "", "")
	return nil
}

func (s *userService) GetAllUsers() ([]domain.User, error) {
	return s.repo.GetAll()
}

func (s *userService) GetPaginatedUsers(page, limit int, search string) (*domain.PaginatedResult[domain.User], error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}

	users, total, err := s.repo.GetPaginated(page, limit, search)
	if err != nil {
		return nil, err
	}

	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return &domain.PaginatedResult[domain.User]{
		Data:       users,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (s *userService) UpdateUser(id uint, input *domain.User) error {
	existingUser, err := s.repo.GetByID(id)
	if err != nil {
		return errors.New("user not found")
	}

	// อัปเดตข้อมูล (ไม่รวม Username เพราะเป็น Unique key หลักที่มักไม่เปลี่ยนกัน)
	existingUser.FullName = input.FullName
	existingUser.Department = input.Department
	existingUser.Tel = input.Tel
	existingUser.Email = input.Email
	existingUser.Role = input.Role // ใช้สำหรับเลื่อนขั้นเป็น admin

	// ถ้ามีการส่ง Password มาใหม่ (ไม่ว่าง) ให้ Hash และเปลี่ยนใหม่
	// ถ้าส่งมาว่าง แปลว่าไม่ต้องการเปลี่ยนรหัส
	if input.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		existingUser.Password = string(hashedPassword)
	}

	if err := s.repo.Update(existingUser); err != nil {
		return err
	}

	// Log
	go s.logService.LogAction(0, "UPDATE_USER", fmt.Sprintf("Updated user ID: %d", id), "", "")
	
	return nil
}

func (s *userService) DeleteUser(id uint) error {
	err := s.repo.Delete(id)
	if err == nil {
		go s.logService.LogAction(0, "DELETE_USER", fmt.Sprintf("Deleted user ID: %d", id), "", "")
	}
	return err
}

func (s *userService) InitializeDefaultAdmin() error {
	// 1. Check current users
	count, err := s.repo.Count()
	if err != nil {
		return err
	}

	if count > 0 {
		return nil // Already has users, skip seeding
	}

	// 2. Create Default Admin
	adminUser := &domain.User{
		Username:   "admin",
		Password:   "admin123", // Default password, will be hashed
		FullName:   "System Administrator",
		Department: "IT",
		Role:       "admin",
		Email:      "admin@example.com",
		Tel:        "-",
	}

	// Override with ENV if available
	if os.Getenv("ADMIN_USERNAME") != "" {
		adminUser.Username = os.Getenv("ADMIN_USERNAME")
	}
	if os.Getenv("ADMIN_PASSWORD") != "" {
		adminUser.Password = os.Getenv("ADMIN_PASSWORD")
	}
	if os.Getenv("ADMIN_EMAIL") != "" {
		adminUser.Email = os.Getenv("ADMIN_EMAIL")
	}

	fmt.Printf("Seeding Default Admin User: %s\n", adminUser.Username)
	return s.CreateUser(adminUser)
}