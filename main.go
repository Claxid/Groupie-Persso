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
	// Serve static files from a single root: web/static
	staticDir := filepath.Join("web", "static")
	log.Printf("static root: %s", staticDir)

	http.HandleFunc("/static/", func(w http.ResponseWriter, r *http.Request) {
		// trim leading /static/
		reqPath := r.URL.Path[len("/static/"):]
		full := filepath.Join(staticDir, filepath.FromSlash(reqPath))
		if fi, err := os.Stat(full); err == nil && !fi.IsDir() {
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
	routes := []string{"/search", "/filters", "/geoloc"}
	for _, rt := range routes {
		rlocal := rt
		http.HandleFunc(rlocal, serveIndex)
	}

	// Serve specific template HTML files from `web/templates/` when requested
	http.HandleFunc("/search.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "search.html"))
	})

	addr := ":8080"
	log.Printf("Starting server on %s — open http://localhost:8080/", addr)
	// start server
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

// Note: the proxy handler is added below to avoid CORS issues when the browser
// requests the external API. It simply relays the remote response.
func init() {
	http.HandleFunc("/api/artists-proxy", func(w http.ResponseWriter, r *http.Request) {
		// remote API
		remote := "https://groupietrackers.herokuapp.com/api/artists"
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get(remote)
		if err != nil {
			http.Error(w, "failed to fetch remote API", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// copy selected headers (content-type)
		if ct := resp.Header.Get("Content-Type"); ct != "" {
			w.Header().Set("Content-Type", ct)
		} else {
			w.Header().Set("Content-Type", "application/json")
		}
		// allow same-origin fetches from the browser
		w.Header().Set("Access-Control-Allow-Origin", "*")

		// relay status code and body
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	http.HandleFunc("/api/locations-proxy", func(w http.ResponseWriter, r *http.Request) {
		// remote API for locations
		remote := "https://groupietrackers.herokuapp.com/api/locations"
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get(remote)
		if err != nil {
			http.Error(w, "failed to fetch locations API", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// copy selected headers (content-type)
		if ct := resp.Header.Get("Content-Type"); ct != "" {
			w.Header().Set("Content-Type", ct)
		} else {
			w.Header().Set("Content-Type", "application/json")
		}
		// allow same-origin fetches from the browser
		w.Header().Set("Access-Control-Allow-Origin", "*")

		// relay status code and body
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	http.HandleFunc("/api/dates-proxy", func(w http.ResponseWriter, r *http.Request) {
		// remote API for dates
		remote := "https://groupietrackers.herokuapp.com/api/dates"
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get(remote)
		if err != nil {
			http.Error(w, "failed to fetch dates API", http.StatusBadGateway)
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
		io.Copy(w, resp.Body)
	})

	http.HandleFunc("/api/relations-proxy", func(w http.ResponseWriter, r *http.Request) {
		// remote API for relations
		remote := "https://groupietrackers.herokuapp.com/api/relation"
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get(remote)
		if err != nil {
			http.Error(w, "failed to fetch relations API", http.StatusBadGateway)
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
		io.Copy(w, resp.Body)
	})
}
