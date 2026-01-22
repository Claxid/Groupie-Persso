package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

type user struct {
	Nom      string `json:"nom"`
	Prenom   string `json:"prenom"`
	Sexe     string `json:"sexe"`
	Password string `json:"password"`
}

var db *sql.DB

func main() {
	defer func() {
		if r := recover(); r != nil {
			log.Fatalf("panic occurred: %v", r)
		}
	}()

	if os.Getenv("DISABLE_DB") != "1" {
		var err error
		db, err = initDB()
		if err != nil {
			log.Printf("DB disabled (init failed): %v", err)
			db = nil
		} else {
			log.Println("DB connection established")
		}
	} else {
		log.Println("DB disabled via DISABLE_DB=1")
	}

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

	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "login.html"))
	})

	http.HandleFunc("/login.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "login.html"))
	})

	// Auth API endpoints
	http.HandleFunc("/api/register", handleRegister)
	http.HandleFunc("/api/login", handleLogin)

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

func initDB() (*sql.DB, error) {
	dsn := mysql.Config{
		User:                 getenvDefault("DB_USER", "root"),
		Passwd:               getenvDefault("DB_PASS", ""),
		Net:                  "tcp",
		Addr:                 fmt.Sprintf("%s:%s", getenvDefault("DB_HOST", "localhost"), getenvDefault("DB_PORT", "3306")),
		DBName:               getenvDefault("DB_NAME", "groupi_tracker"),
		AllowNativePasswords: true,
		ParseTime:            true,
		Loc:                  time.Local,
		Params: map[string]string{
			"charset": "utf8mb4",
		},
	}

	database, err := sql.Open("mysql", dsn.FormatDSN())
	if err != nil {
		return nil, err
	}

	database.SetMaxOpenConns(10)
	database.SetMaxIdleConns(5)
	database.SetConnMaxLifetime(30 * time.Minute)

	if err := database.Ping(); err != nil {
		return nil, err
	}

	return database, nil
}

func getenvDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// handleRegister creates a new user with hashed password.
func handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if db == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database unavailable"})
		return
	}

	var req user
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	log.Printf("Register attempt: Nom=%q, Prenom=%q, Sexe=%q, PwdLen=%d", req.Nom, req.Prenom, req.Sexe, len(req.Password))

	if req.Nom == "" || req.Prenom == "" || req.Sexe == "" || len(req.Password) < 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing or invalid fields"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to hash password"})
		return
	}

	query := "INSERT INTO `user` (`Nom`, `Prénom`, `sexe`, `password`) VALUES (?, ?, ?, ?)"
	result, err := db.Exec(query, req.Nom, req.Prenom, req.Sexe, string(hash))
	if err != nil {
		writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	writeJSON(w, http.StatusCreated, map[string]any{"message": "user created", "id_utilisateur": id})
}

// handleLogin verifies id_user + password.
func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if db == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database unavailable"})
		return
	}

	var req struct {
		IDUser   int    `json:"id_utilisateur"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	if req.IDUser <= 0 || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing credentials"})
		return
	}

	var storedHash string
	var nom, prenom string
	var sexe string
	row := db.QueryRow("SELECT `password`, `Nom`, `Prénom`, `sexe` FROM `user` WHERE `id_user` = ?", req.IDUser)
	if err := row.Scan(&storedHash, &nom, &prenom, &sexe); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"message": "login ok",
		"user": map[string]any{
			"id_utilisateur": req.IDUser,
			"nom":            nom,
			"prenom":         prenom,
			"sexe":           sexe,
		},
	})
}
