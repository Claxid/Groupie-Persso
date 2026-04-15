package main

import (
	"log"
	"net/http"
	"os"

	"groupiepersso/internal/database"
	"groupiepersso/internal/handlers"
)

func main() {
	handlers.DB, _ = database.InitDB()
	mux := http.NewServeMux()
	handlers.SetupAPIRoutes(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting REST API on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
