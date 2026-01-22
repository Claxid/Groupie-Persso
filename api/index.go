package main

// Fonction serverless principale (Vercel): sert fichiers statiques, templates et proxy API

import (
	"io"            // Copie de flux pour relayer le corps de réponse
	"net/http"      // Serveur HTTP et client
	"os"            // Accès au système de fichiers
	"path/filepath" // Manipulation sécurisée des chemins
	"strings"       // Opérations sur les chaînes (préfixes de chemin)
	"time"          // Timeout pour requêtes HTTP sortantes
)

// Handler est le point d'entrée appelé par la plateforme
func Handler(w http.ResponseWriter, r *http.Request) {
	// Récupère le chemin de la requête
	path := r.URL.Path

	// Sert les fichiers statiques sous /static/*
	if strings.HasPrefix(path, "/static/") {
		handleStatic(w, r)
		return
	}

	// Proxy pour les endpoints API sous /api/*
	if strings.HasPrefix(path, "/api/") {
		handleAPIProxy(w, r)
		return
	}

	// Sert explicitement le template de recherche
	if path == "/search.html" {
		serveTemplate(w, r, "search.html")
		return
	}

	// Comportement SPA: toutes autres routes → index.html
	indexPath := filepath.Join(".", "index.html")
	// Tente des chemins alternatifs selon la racine de déploiement
	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		indexPath = filepath.Join("..", "index.html")
	}
	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		http.Error(w, "index.html not found", http.StatusNotFound)
		return
	}
	// Sert le fichier index.html trouvé
	http.ServeFile(w, r, indexPath)
}

// handleStatic sert un fichier sous web/static en détectant le bon chemin et le type MIME
func handleStatic(w http.ResponseWriter, r *http.Request) {
	// Chemin relatif demandé après /static/
	reqPath := r.URL.Path[len("/static/"):]

	// Liste des bases potentielles (différentes racines selon déploiement)
	possiblePaths := []string{
		filepath.Join("web", "static", filepath.FromSlash(reqPath)),
		filepath.Join("..", "web", "static", filepath.FromSlash(reqPath)),
		filepath.Join(".", "web", "static", filepath.FromSlash(reqPath)),
	}

	var full string    // Chemin final s'il est trouvé
	var fi os.FileInfo // Infos fichier
	var err error      // Erreur temporaire

	// Recherche du premier chemin existant et non dossier
	for _, path := range possiblePaths {
		fi, err = os.Stat(path)
		if err == nil && !fi.IsDir() {
			full = path
			break
		}
	}

	if full != "" {
		// Détermine le type de contenu (MIME) à partir de l'extension
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

		// Cache long pour les assets statiques (1 an)
		w.Header().Set("Cache-Control", "public, max-age=31536000")

		// Sert le fichier demandé
		http.ServeFile(w, r, full)
		return
	}

	// Aucun fichier trouvé → 404
	http.NotFound(w, r)
}

// sert un template HTML depuis web/templates par nom
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

	// Template introuvable → 404
	http.NotFound(w, r)
}

// Proxy côté serveur pour l'API Groupie Trackers (évite CORS côté client)
func handleAPIProxy(w http.ResponseWriter, r *http.Request) {
	var remoteURL string // URL distante à appeler

	// Map routes locales → endpoints distants
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

	// Client HTTP avec timeout de 10s pour robustesse
	client := &http.Client{Timeout: 10 * time.Second}
	// Appel GET à l'API distante
	resp, err := client.Get(remoteURL)
	if err != nil {
		// Erreur réseau → 502
		http.Error(w, "failed to fetch remote API", http.StatusBadGateway)
		return
	}
	// Ferme le body pour libérer les ressources
	defer resp.Body.Close()

	// Relaye Content-Type si présent, sinon JSON par défaut
	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	} else {
		w.Header().Set("Content-Type", "application/json")
	}
	// Autorise l'origine quelconque (nécessaire côté navigateur)
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Relaye le code HTTP d'origine
	w.WriteHeader(resp.StatusCode)
	// Stream du corps de réponse distant vers le client
	io.Copy(w, resp.Body)
}
