package main

import "gorm.io/gorm"

type Favorite struct {
	gorm.Model
	ArtistID   int
	ArtistName string
}
