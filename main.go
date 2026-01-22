package main

import (
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
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
	// Route pour les fichiers statiques
	fs := http.FileServer(http.Dir(filepath.Join("web", "static")))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

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

	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "login.html"))
	})

	// Routes API avec proxy
	http.HandleFunc("/api/artists-proxy", proxyAPI("https://groupietrackers.herokuapp.com/api/artists"))
	http.HandleFunc("/api/locations-proxy", proxyAPI("https://groupietrackers.herokuapp.com/api/locations"))
	http.HandleFunc("/api/dates-proxy", proxyAPI("https://groupietrackers.herokuapp.com/api/dates"))
	http.HandleFunc("/api/relation-proxy", proxyAPI("https://groupietrackers.herokuapp.com/api/relation"))

	// Route racine pour index.html
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting server on :%s — open http://localhost:%s/", port, port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
