# Structure du Projet Groupie Tracker

## Organisation du code

Le projet a été réorganisé pour réduire `main.go` à ~40 lignes. Le code est maintenant réparti dans les fichiers suivants :

### Fichiers principaux
- **main.go** (~40 lignes) : Point d'entrée, initialisation DB et serveur
- **database.go** : Gestion de la connexion MySQL (InitDB, configuration)
- **auth.go** : Handlers d'authentification (login, register, bcrypt)
- **routes.go** : Configuration des routes HTTP, proxies API, fichiers statiques

### Dossiers internes (alternative avec modules)
Si vous préférez une organisation modulaire stricte:
- **internal/database/** : Connexion DB
- **internal/handlers/** : Auth, proxy, static files
- **internal/router/** : Setup des routes

## Compilation

```bash
go mod tidy
go build -o groupie-tracker.exe
```

## Exécution

```bash
# Avec base de données
./groupie-tracker.exe

# Sans base de données
DISABLE_DB=1 ./groupie-tracker.exe
```

## Variables d'environnement

- `PORT` : Port du serveur (défaut: 8080)
- `DISABLE_DB` : Désactive MySQL si =1
- `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT`, `DB_NAME` : Configuration MySQL

## Structure simplifiée

Le fichier `main.go` contient uniquement :
1. Gestion des paniques
2. Initialisation DB conditionnelle
3. Setup des routes
4. Démarrage du serveur

Toute la logique métier est déléguée aux fichiers spécialisés.
