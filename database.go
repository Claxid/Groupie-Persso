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
	
	fmt.Println("✅ DATABASE_URL détectée")

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Printf("❌ Erreur gorm.Open(): %v\n", err)
		return
	}
	fmt.Println("✅ gorm.Open() réussi")

	if err := DB.AutoMigrate(&Favorite{}); err != nil {
		fmt.Printf("❌ Erreur AutoMigrate Favorite: %v\n", err)
		return
	}
	fmt.Println("✅ AutoMigrate Favorite réussi")
	fmt.Println("✅ InitDatabase() COMPLÉTÉE AVEC SUCCÈS")
}
