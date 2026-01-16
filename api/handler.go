package handler

import (
	"io"
	"net/http"
	"time"
)

func Handler(w http.ResponseWriter, r *http.Request) {
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
