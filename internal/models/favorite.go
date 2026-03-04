package models

import "time"

// Favorite représente un artiste favori
type Favorite struct {
	ID          int       `json:"id"`
	ArtistID    int       `json:"artist_id"`
	ArtistName  string    `json:"artist_name"`
	ArtistImage string    `json:"artist_image"`
	CreatedAt   time.Time `json:"created_at"`
}
