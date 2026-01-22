package router

import (
	"database/sql"
	"log"
	"net/http"
	"path/filepath"

	"groupiepersso/internal/handlers"
)

// SetupRoutes configure toutes les routes du serveur
func SetupRoutes(db *sql.DB) {
	// Routes API proxy
	http.HandleFunc("/api/artists-proxy", handlers.CreateProxy("https://groupietrackers.herokuapp.com/api/artists"))
	http.HandleFunc("/api/locations-proxy", handlers.CreateProxy("https://groupietrackers.herokuapp.com/api/locations"))
	http.HandleFunc("/api/dates-proxy", handlers.CreateProxy("https://groupietrackers.herokuapp.com/api/dates"))
	http.HandleFunc("/api/relation-proxy", handlers.CreateProxy("https://groupietrackers.herokuapp.com/api/relation"))
	log.Println("API proxy routes registered")

	// Fichiers statiques
	staticDir := filepath.Join("web", "static")
	log.Printf("static root: %s", staticDir)
	http.HandleFunc("/static/", handlers.ServeStatic(staticDir))

	// Templates
	serveIndex := func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("index.html"))
	}
	http.HandleFunc("/", serveIndex)

	routes := []string{"/search", "/filters"}
	for _, rt := range routes {
		rlocal := rt
		http.HandleFunc(rlocal, serveIndex)
	}

	http.HandleFunc("/geoloc", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/geoloc.html", http.StatusMovedPermanently)
	})

	http.HandleFunc("/search.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "search.html"))
	})

	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "login.html"))
	})

	http.HandleFunc("/login.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "login.html"))
	})

	http.HandleFunc("/geoloc.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "geoloc.html"))
	})

	// Routes authentification
	http.HandleFunc("/api/register", handlers.HandleRegister(db))
	http.HandleFunc("/api/login", handlers.HandleLogin(db))
}
