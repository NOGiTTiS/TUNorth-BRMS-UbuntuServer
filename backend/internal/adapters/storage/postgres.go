package storage

import (
	"fmt"
	"log"
	"tunorth-brms-backend/internal/core/domain" // Import domain ที่เราเพิ่งสร้าง

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Database struct {
	DB *gorm.DB
}

// NewDatabase ทำหน้าที่เชื่อมต่อ Database และ Return connection กลับไป
func NewDatabase(host, user, password, dbName, port, sslMode string) (*Database, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Bangkok default_query_exec_mode=simple_protocol",
		host, user, password, dbName, port, sslMode)
	
	log.Println("Connecting to database with DSN:", dsn)

	// เชื่อมต่อ DB
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Info), // ให้แสดง SQL Log เวลาทำงาน
		PrepareStmt: false,                               // ปิด Prepared Statement เพื่อให้ใช้กับ Supabase Transaction Pooler/PgBouncer ได้
	})

	if err != nil {
		log.Println("Failed to connect to database: ", err)
		return nil, err
	}

	log.Println("Connected to Database successfully!")

	// Auto Migrate: สร้างตารางอัตโนมัติตาม Struct ใน Domain
	log.Println("Running Migrations...")
	err = db.AutoMigrate(
		&domain.User{},
		&domain.Room{},
		&domain.Resource{},
		&domain.Booking{},
		&domain.BookingResource{},
		&domain.AuditLog{},
		&domain.Setting{},
	)

	if err != nil {
		log.Println("Migration failed: ", err)
		// return nil, err // Optional: Don't fail entire app if migration fails
	} else {
		log.Println("Migrations completed!")
	}

	return &Database{DB: db}, nil
}