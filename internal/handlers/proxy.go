package handlers

import (
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
)

func ProxyHandler(remote string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			writeCORSHeaders(w)
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", "GET, OPTIONS")
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}

		log.Printf("Proxying request to: %s", remote)
		targetURL, err := url.Parse(remote)
		if err != nil {
			log.Printf("Invalid proxy target %s: %v", remote, err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "invalid proxy target"})
			return
		}

		query := targetURL.Query()
		for key, values := range r.URL.Query() {
			for _, value := range values {
				query.Add(key, value)
			}
		}
		targetURL.RawQuery = query.Encode()

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get(targetURL.String())
		if err != nil {
			log.Printf("Error fetching %s: %v", remote, err)
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "failed to fetch remote API"})
			return
		}
		defer resp.Body.Close()

		if ct := resp.Header.Get("Content-Type"); ct != "" {
			w.Header().Set("Content-Type", ct)
		} else {
			w.Header().Set("Content-Type", "application/json")
		}
		writeCORSHeaders(w)

		w.WriteHeader(resp.StatusCode)
		_, err = io.Copy(w, resp.Body)
		if err != nil {
			log.Printf("Error copying response body: %v", err)
		}
		log.Printf("Successfully proxied request to: %s", remote)
	}
}
