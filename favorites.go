package main

import (
	"database/sql"
	"html/template"
	"log"
	"net/http"
	"strconv"

	"groupiepersso/internal/database"
)

func addFavorite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	if database.DB == nil {
		http.Error(w, "Base de données indisponible", http.StatusServiceUnavailable)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Formulaire invalide", http.StatusBadRequest)
		return
	}

	artistID, err := strconv.Atoi(r.FormValue("artist_id"))
	if err != nil {
		http.Error(w, "artist_id invalide", http.StatusBadRequest)
		return
	}

	artistName := r.FormValue("artist_name")
	if artistName == "" {
		http.Error(w, "artist_name requis", http.StatusBadRequest)
		return
	}

	// Utiliser sql.DB directement (INSERT ... ON CONFLICT DO NOTHING)
	_, err = database.DB.Exec(`
		INSERT INTO favorites (artist_id, artist_name, artist_image)
		VALUES ($1, $2, '')
		ON CONFLICT (artist_id) DO NOTHING
	`, artistID, artistName)

	if err != nil {
		log.Printf("❌ Erreur insertion favori (SQL): %v", err)
		http.Error(w, "Erreur insertion favori", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/favorites", http.StatusSeeOther)
}

func favoritesPage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	if database.DB == nil {
		http.Error(w, "Base de données indisponible", http.StatusServiceUnavailable)
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, artist_id, artist_name, artist_image, created_at
		FROM favorites
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Printf("❌ Erreur lecture favoris: %v", err)
		http.Error(w, "Erreur lecture favoris", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var favorites []map[string]interface{}
	for rows.Next() {
		var id int
		var artistID int
		var artistName string
		var artistImage string
		var createdAt sql.NullString

		if err := rows.Scan(&id, &artistID, &artistName, &artistImage, &createdAt); err != nil {
			log.Printf("❌ Erreur scan: %v", err)
			continue
		}

		createdAtStr := ""
		if createdAt.Valid {
			createdAtStr = createdAt.String
		}

		favorites = append(favorites, map[string]interface{}{
			"ID":          id,
			"ArtistID":    artistID,
			"ArtistName":  artistName,
			"ArtistImage": artistImage,
			"CreatedAt":   createdAtStr,
		})
	}

	tpl, err := template.ParseFiles("templates/favorites.html")
	if err != nil {
		log.Printf("❌ Erreur parse template: %v", err)
		http.Error(w, "Erreur template favorites", http.StatusInternalServerError)
		return
	}

	if err := tpl.Execute(w, favorites); err != nil {
		log.Printf("❌ Erreur rendu template: %v", err)
		http.Error(w, "Erreur rendu template", http.StatusInternalServerError)
		return
	}
}

func removeFavorite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	if database.DB == nil {
		http.Error(w, "Base de données indisponible", http.StatusServiceUnavailable)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Formulaire invalide", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(r.FormValue("id"))
	if err != nil {
		http.Error(w, "id invalide", http.StatusBadRequest)
		return
	}

	result, err := database.DB.Exec(`DELETE FROM favorites WHERE id = $1`, id)
	if err != nil {
		log.Printf("❌ Erreur suppression favori: %v", err)
		http.Error(w, "Erreur suppression favori", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		log.Printf("⚠️ Aucune ligne supprimée (id=%d)", id)
	}

	http.Redirect(w, r, "/favorites", http.StatusSeeOther)
}

