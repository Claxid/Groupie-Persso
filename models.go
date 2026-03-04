package main

import "time"

type Favorite struct {
	ID          int       `gorm:"primaryKey"`
	ArtistID    int       `gorm:"uniqueIndex"`
	ArtistName  string
	ArtistImage string
	CreatedAt   time.Time `gorm:"autoCreateTime"`
}
