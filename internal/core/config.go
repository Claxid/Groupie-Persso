package core

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config contient toutes les variables d'environnement de l'application
type Config struct {
	Port              string
	Environment       string
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
	DatabaseURL       string // Pour Scalingo/production
	GroupieTrackerAPI string
	JWTSecret         string
	SessionSecret     string
	AllowedOrigins    string
	LogLevel          string
}

// LoadConfig charge les variables d'environnement
func LoadConfig() *Config {
	// Charger le fichier .env s'il existe (pour développement local)
	_ = godotenv.Load()

	// Priorité aux URLs de base de données fournies par la plateforme
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = os.Getenv("SCALINGO_POSTGRESQL_URL")
	}
	if databaseURL == "" {
		databaseURL = os.Getenv("POSTGRESQL_URL")
	}
	if databaseURL == "" {
		databaseURL = os.Getenv("DB_URL")
	}

	return &Config{
		Port:              getEnv("PORT", "8080"),
		Environment:       getEnv("ENVIRONMENT", "production"),
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnv("DB_PORT", "5432"),
		DBUser:            getEnv("DB_USER", "postgres"),
		DBPassword:        getEnv("DB_PASSWORD", ""),
		DBName:            getEnv("DB_NAME", "groupiepersso"),
		DatabaseURL:       databaseURL,
		GroupieTrackerAPI: getEnv("GROUPIE_TRACKERS_API", "https://groupietrackers.herokuapp.com/api"),
		JWTSecret:         getEnv("JWT_SECRET", ""),
		SessionSecret:     getEnv("SESSION_SECRET", ""),
		AllowedOrigins:    getEnv("ALLOWED_ORIGINS", "*"),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
	}
}

// getEnv récupère une variable d'environnement avec une valeur par défaut
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		if key == "JWT_SECRET" || key == "SESSION_SECRET" && defaultValue == "" {
			log.Printf("⚠️  WARNING: %s not set, using empty default. Set this in production!", key)
		}
		return defaultValue
	}
	return value
}

// GetDBConnectionString retourne la chaîne de connexion PostgreSQL
func (c *Config) GetDBConnectionString() string {
	// Si DATABASE_URL est défini (Scalingo), l'utiliser directement
	if c.DatabaseURL != "" {
		log.Println("✅ Utilisation d'une URL PostgreSQL fournie par l'environnement")
		// Scalingo supporte : "require", "verify-full", "verify-ca", "disable"
		// mais pas "prefer", donc on remplace
		connStr := strings.ReplaceAll(c.DatabaseURL, "sslmode=prefer", "sslmode=require")
		return connStr
	}

	// Sinon, construire à partir des variables individuelles
	connStr := fmt.Sprintf("host=%s port=%s user=%s dbname=%s sslmode=disable",
		c.DBHost,
		c.DBPort,
		c.DBUser,
		c.DBName,
	)

	if c.DBPassword != "" {
		connStr += fmt.Sprintf(" password=%s", c.DBPassword)
	}

	return connStr
}

// ParseDatabaseURL extrait les composants de DATABASE_URL
func (c *Config) ParseDatabaseURL() error {
	if c.DatabaseURL == "" {
		return nil
	}

	u, err := url.Parse(c.DatabaseURL)
	if err != nil {
		return fmt.Errorf("erreur parsing DATABASE_URL: %v", err)
	}

	c.DBHost = u.Hostname()
	c.DBPort = u.Port()
	if c.DBPort == "" {
		c.DBPort = "5432"
	}

	c.DBUser = u.User.Username()
	if password, ok := u.User.Password(); ok {
		c.DBPassword = password
	}

	// Enlever le leading slash du path pour obtenir le nom de la DB
	c.DBName = strings.TrimPrefix(u.Path, "/")

	return nil
}
