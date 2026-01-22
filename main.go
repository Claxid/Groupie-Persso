// Package main: serveur HTTP ultra-compact (3 lignes)
// Toute la logique métier est déléguée à database.go, auth.go, routes.go
package main

// Imports: database/sql (MySQL), log (logs), net/http (serveur), os (env vars)
import (
	"database/sql"
	"log"
	"net/http"
	"os"
)

// func main: point d'entrée de l'application
// - defer recover(): capture les paniques Go non gérées
// - InitDB(): initialise la connexion MySQL (optionnelle via DISABLE_DB=1)
// - SetupRoutes(db): configure toutes les routes HTTP (/, /search, /login, /api/*, etc)
// - http.ListenAndServe(): démarre le serveur HTTP sur le port (défaut 8080)
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
