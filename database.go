package main

import (
	"fmt"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	// Même ordre de détection que internal/core/config.go
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("SCALINGO_POSTGRESQL_URL")
	}
	if dsn == "" {
		dsn = os.Getenv("POSTGRESQL_URL")
	}
	if dsn == "" {
		dsn = os.Getenv("DB_URL")
	}
	
	if dsn == "" {
		fmt.Println("⚠️ Aucune DATABASE_URL détectée, favoris désactivés")
		return
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("❌ Erreur connexion PostgreSQL (GORM):", err)
		return
	}

	if err := DB.AutoMigrate(&Favorite{}); err != nil {
		fmt.Println("❌ Erreur AutoMigrate Favorite:", err)
		return
	}

	fmt.Println("✅ Connexion GORM OK + AutoMigrate Favorite")
}
