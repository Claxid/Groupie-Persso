package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"groupiepersso/internal/database"
	"groupiepersso/internal/models"
)

func ensureDBReady(w http.ResponseWriter) bool {
	if database.DB != nil {
		return true
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusServiceUnavailable)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error": "Base de données indisponible",
	})
	return false
}

// GetFavorites retourne tous les artistes favoris
func GetFavorites(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	if !ensureDBReady(w) {
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, artist_id, artist_name, artist_image, created_at 
		FROM favorites 
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Printf("Erreur lors de la récupération des favoris: %v", err)
		http.Error(w, "Erreur serveur", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var favorites []models.Favorite
	for rows.Next() {
		var fav models.Favorite
		if err := rows.Scan(&fav.ID, &fav.ArtistID, &fav.ArtistName, &fav.ArtistImage, &fav.CreatedAt); err != nil {
			log.Printf("Erreur lors du scan: %v", err)
			continue
		}
		favorites = append(favorites, fav)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(favorites)
}

// AddFavorite ajoute un artiste aux favoris
func AddFavorite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	if !ensureDBReady(w) {
		return
	}

	var fav models.Favorite
	if err := json.NewDecoder(r.Body).Decode(&fav); err != nil {
		log.Printf("Erreur lors du décodage JSON: %v", err)
		http.Error(w, "Données invalides", http.StatusBadRequest)
		return
	}

	// Insérer le favori (UNIQUE constraint empêchera les doublons)
	err := database.DB.QueryRow(`
		INSERT INTO favorites (artist_id, artist_name, artist_image) 
		VALUES ($1, $2, $3)
		ON CONFLICT (artist_id) DO NOTHING
		RETURNING id, created_at
	`, fav.ArtistID, fav.ArtistName, fav.ArtistImage).Scan(&fav.ID, &fav.CreatedAt)

	if err != nil {
		// Si aucune ligne retournée, c'est que l'artiste est déjà en favori
		log.Printf("Artiste déjà en favoris ou erreur: %v", err)
		// On récupère quand même les infos existantes
		err = database.DB.QueryRow(`
			SELECT id, created_at FROM favorites WHERE artist_id = $1
		`, fav.ArtistID).Scan(&fav.ID, &fav.CreatedAt)

		if err != nil {
			http.Error(w, "Erreur serveur", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(fav)
}

// RemoveFavorite supprime un artiste des favoris
func RemoveFavorite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	if !ensureDBReady(w) {
		return
	}

	// Récupérer l'ID de l'artiste depuis l'URL query parameter
	artistIDStr := r.URL.Query().Get("artist_id")
	if artistIDStr == "" {
		http.Error(w, "artist_id requis", http.StatusBadRequest)
		return
	}

	artistID, err := strconv.Atoi(artistIDStr)
	if err != nil {
		http.Error(w, "artist_id invalide", http.StatusBadRequest)
		return
	}

	result, err := database.DB.Exec(`DELETE FROM favorites WHERE artist_id = $1`, artistID)
	if err != nil {
		log.Printf("Erreur lors de la suppression: %v", err)
		http.Error(w, "Erreur serveur", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Favori non trouvé", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(map[string]string{"message": "Favori supprimé avec succès"})
}

// CheckFavorite vérifie si un artiste est en favori
func CheckFavorite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	if !ensureDBReady(w) {
		return
	}

	artistIDStr := r.URL.Query().Get("artist_id")
	if artistIDStr == "" {
		http.Error(w, "artist_id requis", http.StatusBadRequest)
		return
	}

	artistID, err := strconv.Atoi(artistIDStr)
	if err != nil {
		http.Error(w, "artist_id invalide", http.StatusBadRequest)
		return
	}

	var exists bool
	err = database.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM favorites WHERE artist_id = $1)`, artistID).Scan(&exists)
	if err != nil {
		log.Printf("Erreur lors de la vérification: %v", err)
		http.Error(w, "Erreur serveur", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(map[string]bool{"is_favorite": exists})
}
