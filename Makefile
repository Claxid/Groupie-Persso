.PHONY: build run dev migrate test clean

# Compilation du serveur principal
build:
	@echo "🔨 Compilation..."
	go build -o groupiepersso .

# Compilation de l'outil de migration
build-migrate:
	@echo "🔨 Compilation migration..."
	go build -o migrate ./cmd/migrate

# Compilation complète (serveur + migration)
build-all: build build-migrate
	@echo "✅ Compilation complète terminée"

# Lancer le serveur localement
run: build
	@echo "🚀 Lancement du serveur..."
	./groupiepersso

# Développement avec hot reload (si air est installé)
dev:
	@echo "🔄 Mode développement (air)..."
	air

# Exécuter la migration de base de données
migrate: build-migrate
	@echo "📦 Exécution migration..."
	./migrate

# Tests
test:
	@echo "🧪 Tests..."
	go test ./...

# Nettoyage
clean:
	@echo "🧹 Nettoyage..."
	rm -f groupiepersso migrate
	go clean

# Préparation pour Scalingo
scalingo-build: build-all
	@echo "✅ Prêt pour Scalingo!"
	ls -lh groupiepersso migrate
