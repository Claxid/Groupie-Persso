package handlers

import "net/http"

func SetupAPIRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/health", healthHandler)

	// Core REST endpoints
	mux.HandleFunc("/api/artists", ProxyHandler("https://groupietrackers.herokuapp.com/api/artists"))
	mux.HandleFunc("/api/locations", ProxyHandler("https://groupietrackers.herokuapp.com/api/locations"))
	mux.HandleFunc("/api/dates", ProxyHandler("https://groupietrackers.herokuapp.com/api/dates"))
	mux.HandleFunc("/api/relation", ProxyHandler("https://groupietrackers.herokuapp.com/api/relation"))
	mux.HandleFunc("/api/relations", ProxyHandler("https://groupietrackers.herokuapp.com/api/relation"))

	// Compatibility aliases
	mux.HandleFunc("/api/artists-proxy", ProxyHandler("https://groupietrackers.herokuapp.com/api/artists"))
	mux.HandleFunc("/api/locations-proxy", ProxyHandler("https://groupietrackers.herokuapp.com/api/locations"))
	mux.HandleFunc("/api/dates-proxy", ProxyHandler("https://groupietrackers.herokuapp.com/api/dates"))
	mux.HandleFunc("/api/relation-proxy", ProxyHandler("https://groupietrackers.herokuapp.com/api/relation"))
	mux.HandleFunc("/api/relations-proxy", ProxyHandler("https://groupietrackers.herokuapp.com/api/relation"))

	mux.HandleFunc("/api/register", HandleRegister)
	mux.HandleFunc("/api/login", HandleLogin)

	// Root + fallback now return JSON instead of HTML pages.
	mux.HandleFunc("/", rootAndFallbackHandler)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func rootAndFallbackHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writeCORSHeaders(w)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.URL.Path != "/" {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "route not found"})
		return
	}

	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET, OPTIONS")
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"name": "groupie-tracker-rest-api",
		"endpoints": []string{
			"GET /api/health",
			"GET /api/artists",
			"GET /api/locations",
			"GET /api/dates",
			"GET /api/relation",
			"POST /api/register",
			"POST /api/login",
		},
	})
}
