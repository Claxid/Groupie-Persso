package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	"groupiepersso/internal/core"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// InitDB initialise la connexion à la base de données PostgreSQL
func InitDB() error {
	log.Println("🔄 InitDB() démarrage...")
	
	cfg := core.LoadConfig()
	log.Printf("📋 cfg.DatabaseURL: %v", cfg.DatabaseURL)
	
	if err := cfg.ParseDatabaseURL(); err != nil {
		return fmt.Errorf("erreur parsing DATABASE_URL: %v", err)
	}

	connStr := cfg.GetDBConnectionString()
	log.Printf("🔐 Connection string: %s", maskPassword(connStr))

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Printf("❌ Erreur sql.Open(): %v", err)
		return fmt.Errorf("erreur lors de l'ouverture de la connexion: %v", err)
	}
	log.Println("✅ sql.Open() réussi")

	// Vérification de la connexion
	if err = DB.Ping(); err != nil {
		log.Printf("❌ Erreur DB.Ping(): %v", err)
		return fmt.Errorf("erreur lors du ping de la base de données: %v", err)
	}
	log.Println("✅ DB.Ping() réussi")

	log.Println("✅ Connexion à PostgreSQL établie avec succès")

	// Création de la table des favoris si elle n'existe pas
	if err := createTables(); err != nil {
		return fmt.Errorf("erreur lors de la création des tables: %v", err)
	}

	return nil
}

// createTables crée les tables nécessaires si elles n'existent pas
func createTables() error {
	if DB == nil {
		return fmt.Errorf("connexion à la base de données non initialisée")
	}

	query := `
	CREATE TABLE IF NOT EXISTS favorites (
		id SERIAL PRIMARY KEY,
		artist_id INTEGER NOT NULL,
		artist_name VARCHAR(255) NOT NULL,
		artist_image VARCHAR(512),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(artist_id)
	);
	
	CREATE INDEX IF NOT EXISTS idx_artist_id ON favorites(artist_id);
	`

	_, err := DB.Exec(query)
	if err != nil {
		return fmt.Errorf("erreur lors de la création de la table favorites: %v", err)
	}

	log.Println("✅ Table 'favorites' créée ou vérifiée avec succès")
	log.Println("✅ InitDB() complété avec succès")
	return nil
}

// maskPassword masque le mot de passe dans une connection string pour la sécurité des logs
func maskPassword(connStr string) string {
	// Simple masking: remplace le mot de passe par ****
	return strings.ReplaceAll(connStr, "password=", "password=****")
}

// CloseDB ferme la connexion à la base de données
func CloseDB() {
	if DB != nil {
		DB.Close()
		log.Println("Connexion à la base de données fermée")
	}
}
