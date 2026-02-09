package handler

import (
	"net/http"
	"tunorth-brms-backend/pkg/bootstrap"

	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
)

// app is a package-level variable to reuse the Fiber app instance across invocations (Warm Start)
var app *fiber.App

func Handler(w http.ResponseWriter, r *http.Request) {
	if app == nil {
		var err error
		app, err = bootstrap.CreateApp()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Failed to initialize app: " + err.Error()))
			return
		}
	}
	
	adaptor.FiberApp(app).ServeHTTP(w, r)
}
