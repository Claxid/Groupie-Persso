package main

// database.go est désactivé - on utilise internal/database/postgres.go à la place
// qui gère sql.DB avec la bonne structure de table

var DB interface{} // Placeholder pour compatibilité

// InitDatabase est désactivé - l'initialisation se fait via internal/database.InitDB()
func InitDatabase() {
	// GORM est désactivé. Les favoris utilisent uniquement sql.DB via internal/handlers
}
