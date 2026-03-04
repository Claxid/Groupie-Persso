package main

import (
	"html/template"
	"net/http"
	"strconv"
)

func addFavorite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	if DB == nil {
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

	fav := Favorite{ArtistID: artistID, ArtistName: artistName}
	if err := DB.Create(&fav).Error; err != nil {
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

	if DB == nil {
		http.Error(w, "Base de données indisponible", http.StatusServiceUnavailable)
		return
	}

	var favorites []Favorite
	if err := DB.Find(&favorites).Error; err != nil {
		http.Error(w, "Erreur lecture favoris", http.StatusInternalServerError)
		return
	}

	tpl, err := template.ParseFiles("templates/favorites.html")
	if err != nil {
		http.Error(w, "Erreur template favorites", http.StatusInternalServerError)
		return
	}

	if err := tpl.Execute(w, favorites); err != nil {
		http.Error(w, "Erreur rendu template", http.StatusInternalServerError)
		return
	}
}

func removeFavorite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	if DB == nil {
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

	if err := DB.Delete(&Favorite{}, id).Error; err != nil {
		http.Error(w, "Erreur suppression favori", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/favorites", http.StatusSeeOther)
}
