package main

import (
	"log"
	"net/http"
	"path/filepath"
)

func main() {
	// Serve static files from the repository-root `static/` folder
	fs := http.FileServer(http.Dir(filepath.Join("static")))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

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

	addr := ":8080"
	log.Printf("Starting server on %s — open http://localhost:8080/", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
