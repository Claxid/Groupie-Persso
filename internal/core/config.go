package core

import (
	"fmt"
	"log"
	"os"

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

	return &Config{
		Port:              getEnv("PORT", "8080"),
		Environment:       getEnv("ENVIRONMENT", "production"),
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnv("DB_PORT", "3306"),
		DBUser:            getEnv("DB_USER", ""),
		DBPassword:        getEnv("DB_PASSWORD", ""),
		DBName:            getEnv("DB_NAME", "groupiepersso"),
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

// GetDBConnectionString retourne la chaîne de connexion MySQL
func (c *Config) GetDBConnectionString() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True",
		c.DBUser,
		c.DBPassword,
		c.DBHost,
		c.DBPort,
		c.DBName,
	)
}
