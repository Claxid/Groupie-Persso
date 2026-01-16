package main

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Handler is the main entry point for Vercel serverless function
func Handler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// Handle static files
	if strings.HasPrefix(path, "/static/") {
		handleStatic(w, r)
		return
	}

	// Handle API proxy endpoints
	if strings.HasPrefix(path, "/api/") {
		handleAPIProxy(w, r)
		return
	}

	// Handle specific template routes
	if path == "/search.html" {
		serveTemplate(w, r, "search.html")
		return
	}

	// All other routes serve index.html (SPA behavior)
	indexPath := filepath.Join(".", "index.html")
	// Try different possible paths
	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		indexPath = filepath.Join("..", "index.html")
	}
	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		http.Error(w, "index.html not found", http.StatusNotFound)
		return
	}
	http.ServeFile(w, r, indexPath)
}

func handleStatic(w http.ResponseWriter, r *http.Request) {
	reqPath := r.URL.Path[len("/static/"):]

	// Try multiple possible base paths
	possiblePaths := []string{
		filepath.Join("web", "static", filepath.FromSlash(reqPath)),
		filepath.Join("..", "web", "static", filepath.FromSlash(reqPath)),
		filepath.Join(".", "web", "static", filepath.FromSlash(reqPath)),
	}

	var full string
	var fi os.FileInfo
	var err error

	for _, path := range possiblePaths {
		fi, err = os.Stat(path)
		if err == nil && !fi.IsDir() {
			full = path
			break
		}
	}

	if full != "" {
		// Set correct content-type based on file extension
		ext := filepath.Ext(full)
		switch ext {
		case ".css":
			w.Header().Set("Content-Type", "text/css; charset=utf-8")
		case ".js":
			w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
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

	http.NotFound(w, r)
}

func serveTemplate(w http.ResponseWriter, r *http.Request, templateName string) {
	possiblePaths := []string{
		filepath.Join("web", "templates", templateName),
		filepath.Join("..", "web", "templates", templateName),
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			http.ServeFile(w, r, path)
			return
		}
	}

	http.NotFound(w, r)
}

func handleAPIProxy(w http.ResponseWriter, r *http.Request) {
	var remoteURL string

	switch r.URL.Path {
	case "/api/artists-proxy":
		remoteURL = "https://groupietrackers.herokuapp.com/api/artists"
	case "/api/locations-proxy":
		remoteURL = "https://groupietrackers.herokuapp.com/api/locations"
	case "/api/dates-proxy":
		remoteURL = "https://groupietrackers.herokuapp.com/api/dates"
	case "/api/relations-proxy":
		remoteURL = "https://groupietrackers.herokuapp.com/api/relation"
	default:
		http.NotFound(w, r)
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(remoteURL)
	if err != nil {
		http.Error(w, "failed to fetch remote API", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy headers
	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	} else {
		w.Header().Set("Content-Type", "application/json")
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Relay status code and body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
