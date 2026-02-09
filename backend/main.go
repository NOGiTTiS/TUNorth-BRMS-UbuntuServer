package main

import (
	"log"
	"os"
	"tunorth-brms-backend/pkg/bootstrap"
)

func main() {
	app, err := bootstrap.CreateApp()
	if err != nil {
		log.Fatal(err)
	}

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(app.Listen(":" + port))
}
