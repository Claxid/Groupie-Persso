// Package main: serveur HTTP ultra-compact | Logique métier en database.go, auth.go, routes.go
package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
)

// defer recover: capture paniques | InitDB: connexion MySQL | SetupRoutes: routes HTTP | ListenAndServe: serveur
func main() {
	defer func() {
		if r := recover(); r != nil {
			log.Fatalf("panic: %v", r)
		}
	}()
	var db *sql.DB
	if os.Getenv("DISABLE_DB") != "1" {
		if c, e := InitDB(); e != nil {
			log.Printf("DB disabled: %v", e)
		} else {
			db = c
			log.Println("DB connected")
		}
	}
	SetupRoutes(db)
	p := os.Getenv("PORT")
	if p == "" {
		p = "8080"
	}
	log.Printf("Server on :%s", p)
	log.Fatal(http.ListenAndServe(":"+p, nil))
}
