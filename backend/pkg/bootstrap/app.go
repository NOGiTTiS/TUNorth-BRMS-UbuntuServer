package bootstrap

import (
	"log"
	"os"
	"tunorth-brms-backend/internal/adapters/handlers/http"
	"tunorth-brms-backend/internal/adapters/storage"
	"tunorth-brms-backend/internal/core/domain"
	"tunorth-brms-backend/internal/core/services"

	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func CreateApp() (*fiber.App, error) {
	// 1. Setup Config
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found (This is normal in production if using Env Vars)")
	}

	// 2. Setup Database Connection
	database, err := storage.NewDatabase(
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_SSL"),
	)
	if err != nil {
		return nil, err
	}

	// 3. Dependency Injection
	// DB -> Repository -> Service -> Handler

	// Log Module
	logRepo := storage.NewLogRepository(database.DB)
	logService := services.NewLogService(logRepo)
	logHandler := http.NewLogHandler(logService)

	roomRepo := storage.NewRoomRepository(database.DB)
	roomService := services.NewRoomService(roomRepo, logService)
	roomHandler := http.NewRoomHandler(roomService)

	// Settings (Admin)
	settingRepo := storage.NewSettingRepository(database.DB)
	settingService := services.NewSettingService(settingRepo, logService)
	settingHandler := http.NewSettingHandler(settingService)

	// Auth
	userRepo := storage.NewUserRepository(database.DB)

	// User Management
	userService := services.NewUserService(userRepo, logService)
	userHandler := http.NewUserHandler(userService)

	// Resource
	resRepo := storage.NewResourceRepository(database.DB)
	resService := services.NewResourceService(resRepo, logService)
	resHandler := http.NewResourceHandler(resService)

	// Report Module
	reportRepo := storage.NewReportRepository(database.DB)
	reportService := services.NewReportService(reportRepo)
	reportHandler := http.NewReportHandler(reportService)

	// Notification
	notifService := services.NewNotificationService(settingService, roomRepo, userRepo)

	// Bookings
	bookingRepo := storage.NewBookingRepository(database.DB)
	bookingService := services.NewBookingService(bookingRepo, roomRepo, settingService, userRepo, notifService, logService)
	bookingHandler := http.NewBookingHandler(bookingService, settingService)

	// Auth Service
	authService := services.NewAuthService(userRepo)
	authHandler := http.NewAuthHandler(authService, logService, settingService)

	// Auto-Migrate & Initialize Defaults
	// Note: NewDatabase already does most migrations, but we keep this to ensure consistency with original main.go
	if err := database.DB.AutoMigrate(&domain.Setting{}, &domain.Booking{}, &domain.Log{}); err != nil {
		log.Println("Warning: AutoMigrate failed:", err)
		// Don't fail hard on migration error, might be permission issue
	}
	
	go settingService.InitializeDefaults() // Run in background to avoid blocking
	go userService.InitializeDefaultAdmin() // Run in background

	// 4. Setup Fiber App
	app := fiber.New(fiber.Config{
		BodyLimit: 20 * 1024 * 1024, // 20 MB
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS",
	}))

	// Static files (Verify if this works in serverless, typically Vercel handles static files separately)
	// Only serve if directory exists to avoid error
	if _, err := os.Stat("./uploads"); err == nil {
		app.Static("/uploads", "./uploads")
	}

	// 5. Routes Definition
	api := app.Group("/api")

	// Public Settings
	api.Get("/settings/public", settingHandler.GetPublicSettings)

	// Middleware JWT
	jwtMiddleware := jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte(os.Getenv("JWT_SECRET"))},
	})

	// Room Routes
	rooms := api.Group("/rooms")
	rooms.Post("/", roomHandler.CreateRoom)
	rooms.Get("/", roomHandler.GetAllRooms)
	rooms.Get("/:id", roomHandler.GetRoom)
	rooms.Put("/:id", roomHandler.UpdateRoom)
	rooms.Delete("/:id", roomHandler.DeleteRoom)

	// Booking Routes
	bookings := api.Group("/bookings")
	bookings.Get("/", bookingHandler.GetBookings)
	bookings.Post("/", jwtMiddleware, bookingHandler.CreateBooking)
	bookings.Patch("/:id/status", jwtMiddleware, bookingHandler.UpdateStatus)
	bookings.Put("/:id", jwtMiddleware, bookingHandler.UpdateBooking)
	bookings.Delete("/:id", jwtMiddleware, bookingHandler.DeleteBooking)

	// Auth Routes
	api.Post("/register", authHandler.Register)
	api.Post("/login", authHandler.Login)

	// Protected Routes (Already used jwtMiddleware inside)
	api.Get("/me", jwtMiddleware, authHandler.GetMe)
	api.Put("/me", jwtMiddleware, authHandler.UpdateMe)

	// Settings Protected
	api.Get("/settings", jwtMiddleware, settingHandler.GetAllSettings)
	api.Put("/settings", jwtMiddleware, settingHandler.UpdateSettings)
	api.Post("/settings/upload", jwtMiddleware, settingHandler.UploadImage)

	// User Routes
	users := api.Group("/users")
	users.Get("/", userHandler.GetAllUsers)
	users.Put("/:id", userHandler.UpdateUser)
	users.Delete("/:id", userHandler.DeleteUser)
	users.Post("/import", userHandler.ImportUsers)

	// Resource Routes
	resources := api.Group("/resources")
	resources.Get("/", resHandler.GetAllResources)
	resources.Post("/", resHandler.CreateResource)
	resources.Put("/:id", resHandler.UpdateResource)
	resources.Delete("/:id", resHandler.DeleteResource)

	// Report Routes
	api.Get("/reports/dashboard", reportHandler.GetDashboardStats)

	// Log Routes
	api.Get("/logs", logHandler.GetLogs)
	api.Post("/logs/test", logHandler.CreateTestLog)

	// Test Route
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("TUNorth-BRMS API is Running!")
	})

	return app, nil
}
