package main

import (
	"html/template"
	"log"
	"net/http"
	"path/filepath"
)

func main() {
	templates, err := template.ParseGlob(filepath.Join("web", "templates", "*.html"))
	if err != nil {
		log.Fatalf("parsing templates: %v", err)
	}

	// Static files (css, js, images)
	fs := http.FileServer(http.Dir(filepath.Join("web", "static")))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Handlers for pages
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if err := templates.ExecuteTemplate(w, "home.html", nil); err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
		}
	})

	http.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		if err := templates.ExecuteTemplate(w, "search.html", nil); err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
		}
	})

	http.HandleFunc("/filters", func(w http.ResponseWriter, r *http.Request) {
		if err := templates.ExecuteTemplate(w, "filters.html", nil); err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
		}
	})

	http.HandleFunc("/geoloc", func(w http.ResponseWriter, r *http.Request) {
		if err := templates.ExecuteTemplate(w, "geoloc.html", nil); err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
		}
	})

	addr := ":8080"
	log.Printf("Starting server on %s — open http://localhost:8080/", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
