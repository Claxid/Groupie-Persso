// Package main: serveur HTTP simplifié (30 lignes)
package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
)

func main() {
	defer func() {
		if r := recover(); r != nil {
			log.Fatalf("panic occurred: %v", r)
		}
	}()

	var db *sql.DB
	if os.Getenv("DISABLE_DB") != "1" {
		if conn, err := InitDB(); err != nil {
			log.Printf("DB disabled (init failed): %v", err)
		} else {
			db = conn
			log.Println("DB connection established")
		}
	} else {
		log.Println("DB disabled via DISABLE_DB=1")
	}

	SetupRoutes(db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
	log.Printf("Starting server on %s — open http://localhost:%s/", addr, port)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
