package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// InitDB initialise la connexion à la base de données PostgreSQL
func InitDB() error {
	// Récupération des variables d'environnement
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}

	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}

	user := os.Getenv("DB_USER")
	if user == "" {
		user = "postgres"
	}

	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "postgres"
	}

	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "groupie_tracker"
	}

	// Chaîne de connexion PostgreSQL
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("erreur lors de l'ouverture de la connexion: %v", err)
	}

	// Vérification de la connexion
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("erreur lors du ping de la base de données: %v", err)
	}

	log.Println("✅ Connexion à PostgreSQL établie avec succès")

	// Création de la table des favoris si elle n'existe pas
	if err := createTables(); err != nil {
		return fmt.Errorf("erreur lors de la création des tables: %v", err)
	}

	return nil
}

// createTables crée les tables nécessaires si elles n'existent pas
func createTables() error {
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
	return nil
}

// CloseDB ferme la connexion à la base de données
func CloseDB() {
	if DB != nil {
		DB.Close()
		log.Println("Connexion à la base de données fermée")
	}
}
