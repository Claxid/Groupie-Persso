package main

import (
	"log"
	"os"

	"groupiepersso/internal/core"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Favorite représente un artiste favori
type Favorite struct {
	ID          int    `gorm:"primaryKey"`
	ArtistID    int    `gorm:"uniqueIndex"`
	ArtistName  string
	ArtistImage string
	CreatedAt   int64
}

func main() {
	cfg := core.LoadConfig()

	// Parser DATABASE_URL si présent
	if err := cfg.ParseDatabaseURL(); err != nil {
		log.Fatalf("❌ Erreur parsing DATABASE_URL: %v", err)
	}

	dsn := cfg.GetDBConnectionString()
	log.Printf("📦 Connexion à PostgreSQL: %s", dsn)

	// Initialiser GORM
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Erreur connexion PostgreSQL: %v", err)
	}

	// AutoMigrate crée la table si elle n'existe pas
	if err := db.AutoMigrate(&Favorite{}); err != nil {
		log.Fatalf("❌ Erreur migration: %v", err)
	}

	log.Println("✅ Base de données initialisée avec succès!")
	log.Println("✅ Table 'favorites' créée/vérifiée")

	os.Exit(0)
}
