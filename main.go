package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"groupiepersso/internal/core"
	"groupiepersso/internal/database"
	"groupiepersso/internal/handlers"
)

// proxyAPI fait un proxy HTTP simple vers une URL cible
func proxyAPI(targetURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Créer une requête GET vers l'API distante
		resp, err := http.Get(targetURL)
		if err != nil {
			http.Error(w, "API unavailable", http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		// Copier les headers de la réponse API
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		// Copier le statut et le body
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	}
}

func main() {
	// Charger la configuration depuis les variables d'environnement
	cfg := core.LoadConfig()

	// Initialisation de la base de données PostgreSQL pour les favoris
	if err := database.InitDB(); err != nil {
		log.Printf("⚠️ Avertissement: Impossible de se connecter à PostgreSQL: %v", err)
		log.Println("Le serveur continuera sans fonctionnalités de favoris")
	} else {
		defer database.CloseDB()
	}

	// Route pour les fichiers statiques
	staticDir := filepath.Join("web", "static")
	log.Printf("static root: %s", staticDir)

	http.HandleFunc("/static/", func(w http.ResponseWriter, r *http.Request) {
		// trim leading /static/
		reqPath := r.URL.Path[len("/static/"):]
		full := filepath.Join(staticDir, filepath.FromSlash(reqPath))

		if fi, err := os.Stat(full); err == nil && !fi.IsDir() {
			// Set correct content-type based on file extension
			ext := filepath.Ext(full)
			switch ext {
			case ".css":
				w.Header().Set("Content-Type", "text/css")
			case ".js":
				w.Header().Set("Content-Type", "application/javascript")
			case ".png":
				w.Header().Set("Content-Type", "image/png")
			case ".jpg", ".jpeg":
				w.Header().Set("Content-Type", "image/jpeg")
			case ".svg":
				w.Header().Set("Content-Type", "image/svg+xml")
			case ".gif":
				w.Header().Set("Content-Type", "image/gif")
			case ".webp":
				w.Header().Set("Content-Type", "image/webp")
			}

			// Add cache control for static assets
			w.Header().Set("Cache-Control", "public, max-age=31536000")

			http.ServeFile(w, r, full)
			return
		}
		// fallback: let the default file server return 404
		http.NotFound(w, r)
	})

	// Proxy audio pour contourner CORS sur les previews externes
	http.HandleFunc("/api/audio-proxy", func(w http.ResponseWriter, r *http.Request) {
		url := r.URL.Query().Get("url")
		if url == "" {
			http.Error(w, "missing url", http.StatusBadRequest)
			return
		}
		// Certaines API refusent les requêtes sans User-Agent : forçons-en un.
		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			http.Error(w, "invalid url", http.StatusBadRequest)
			return
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; GroupieProxy/1.0)")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			http.Error(w, "upstream error", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// Copier content-type si présent
		if ct := resp.Header.Get("Content-Type"); ct != "" {
			w.Header().Set("Content-Type", ct)
		} else {
			w.Header().Set("Content-Type", "audio/mpeg")
		}
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	// Routes pour les templates
	http.HandleFunc("/search.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "search.html"))
	})

	http.HandleFunc("/geoloc.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "geoloc.html"))
	})

	http.HandleFunc("/favorites.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "favorites.html"))
	})

	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "login.html"))
	})

	// Routes API avec proxy
	http.HandleFunc("/api/artists-proxy", proxyAPI(fmt.Sprintf("%s/artists", cfg.GroupieTrackerAPI)))
	http.HandleFunc("/api/locations-proxy", proxyAPI(fmt.Sprintf("%s/locations", cfg.GroupieTrackerAPI)))
	http.HandleFunc("/api/dates-proxy", proxyAPI(fmt.Sprintf("%s/dates", cfg.GroupieTrackerAPI)))
	// Alias avec et sans 's' pour éviter les erreurs de route
	http.HandleFunc("/api/relation-proxy", proxyAPI(fmt.Sprintf("%s/relation", cfg.GroupieTrackerAPI)))
	http.HandleFunc("/api/relations-proxy", proxyAPI(fmt.Sprintf("%s/relation", cfg.GroupieTrackerAPI)))

	// Routes API pour les favoris
	http.HandleFunc("/api/favorites", func(w http.ResponseWriter, r *http.Request) {
		// Support des options CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		switch r.Method {
		case http.MethodGet:
			handlers.GetFavorites(w, r)
		case http.MethodPost:
			handlers.AddFavorite(w, r)
		case http.MethodDelete:
			handlers.RemoveFavorite(w, r)
		default:
			http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		}
	})

	http.HandleFunc("/api/favorites/check", handlers.CheckFavorite)
	log.Println("✅ Routes API favoris enregistrées")

	// Route racine pour index.html
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "index.html")
	})

	port := cfg.Port
	log.Printf("Starting server on :%s — open http://localhost:%s/", port, port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
