package main

import (
	"fmt"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		fmt.Println("⚠️ DATABASE_URL non défini, favoris package main désactivés")
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
