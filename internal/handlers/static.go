package handlers

import (
	"net/http"
	"os"
	"path/filepath"
)

// ServeStatic gère les fichiers statiques
func ServeStatic(staticDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqPath := r.URL.Path[len("/static/"):]
		full := filepath.Join(staticDir, filepath.FromSlash(reqPath))

		if fi, err := os.Stat(full); err == nil && !fi.IsDir() {
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
			w.Header().Set("Cache-Control", "public, max-age=31536000")
			http.ServeFile(w, r, full)
			return
		}
		http.NotFound(w, r)
	}
}
