package main

import (
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

func main() {
	defer func() {
		if r := recover(); r != nil {
			log.Fatalf("panic occurred: %v", r)
		}
	}()

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Proxy handler to avoid CORS issues when the browser requests the external API
	proxy := func(remote string) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			log.Printf("Proxying request to: %s", remote)
			client := &http.Client{Timeout: 10 * time.Second}
			resp, err := client.Get(remote)
			if err != nil {
				log.Printf("Error fetching %s: %v", remote, err)
				http.Error(w, "failed to fetch remote API", http.StatusBadGateway)
				return
			}
			defer resp.Body.Close()

			if ct := resp.Header.Get("Content-Type"); ct != "" {
				w.Header().Set("Content-Type", ct)
			} else {
				w.Header().Set("Content-Type", "application/json")
			}
			w.Header().Set("Access-Control-Allow-Origin", "*")

			w.WriteHeader(resp.StatusCode)
			_, err = io.Copy(w, resp.Body)
			if err != nil {
				log.Printf("Error copying response body: %v", err)
			}
			log.Printf("Successfully proxied request to: %s", remote)
		}
	}

	// Proxies for Groupie Trackers API to avoid CORS in the browser
	http.HandleFunc("/api/artists-proxy", proxy("https://groupietrackers.herokuapp.com/api/artists"))
	http.HandleFunc("/api/locations-proxy", proxy("https://groupietrackers.herokuapp.com/api/locations"))
	http.HandleFunc("/api/dates-proxy", proxy("https://groupietrackers.herokuapp.com/api/dates"))
	http.HandleFunc("/api/relation-proxy", proxy("https://groupietrackers.herokuapp.com/api/relation"))
	log.Println("API proxy routes registered")

	// Serve static files from a single root: web/static
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

	// Serve the root `index.html` (Netlify serves this file at the root)
	serveIndex := func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("index.html"))
	}

	http.HandleFunc("/", serveIndex)

	// Ensure other app routes return the same index (so local behaviour matches Netlify)
	routes := []string{"/search", "/filters"}
	for _, rt := range routes {
		rlocal := rt
		http.HandleFunc(rlocal, serveIndex)
	}

	// Redirect /geoloc to /geoloc.html
	http.HandleFunc("/geoloc", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/geoloc.html", http.StatusMovedPermanently)
	})

	// Serve specific template HTML files from `web/templates/` when requested
	http.HandleFunc("/search.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "search.html"))
	})

	http.HandleFunc("/geoloc.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "geoloc.html"))
	})

	addr := ":" + port
	log.Printf("Starting server on %s — open http://localhost:%s/", addr, port)
	// start server
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
