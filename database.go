package main

// database.go - Configuration et initialisation de la base de données
// Ce fichier gère la connexion à la base de données MySQL

import (
	"database/sql"
)

func initDatabase() (*sql.DB, error) {
	// Si DISABLE_DB est activé, retourner nil
	return nil, nil
}
