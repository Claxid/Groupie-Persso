package handler

// Paquet handler: point d'entrée pour une fonction serverless (Vercel) servant de proxy

import (
	"io"       // Copie du corps de réponse
	"net/http" // Types HTTP serveur et client
	"time"     // Timeout pour les requêtes sortantes
)

// Handler route les chemins /api/* vers l'API Groupie Trackers distante
func Handler(w http.ResponseWriter, r *http.Request) {
	// URL distante ciblée en fonction du chemin local
	var remoteURL string

	// Sélectionne l'endpoint distant selon la route appelée
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
		// Route inconnue → 404 Not Found
		http.NotFound(w, r)
		return
	}

	// Client HTTP avec timeout de sécurité (évite les requêtes pendantes)
	client := &http.Client{Timeout: 10 * time.Second}
	// Appel HTTP GET vers l'API distante
	resp, err := client.Get(remoteURL)
	if err != nil {
		// Erreur réseau/distante → renvoie 502 Bad Gateway
		http.Error(w, "failed to fetch remote API", http.StatusBadGateway)
		return
	}
	// Assure la libération des ressources réseau
	defer resp.Body.Close()

	// Copie le Content-Type pour transparence côté client
	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	} else {
		// Valeur par défaut JSON si en-tête manquant
		w.Header().Set("Content-Type", "application/json")
	}
	// Autorise l'accès cross-origin pour appels frontend
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Réplique le code HTTP de la réponse distante
	w.WriteHeader(resp.StatusCode)
	// Copie le corps distant vers la réponse locale (streaming efficient)
	io.Copy(w, resp.Body)
}
