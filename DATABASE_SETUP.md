# Configuration PostgreSQL pour le Système de Favoris

## Prérequis

- PostgreSQL installé (version 12 ou supérieure recommandée)
- Go 1.21 ou supérieur

## Installation de PostgreSQL

### Windows
1. Téléchargez PostgreSQL depuis https://www.postgresql.org/download/windows/
2. Suivez l'assistant d'installation
3. Notez le mot de passe que vous définissez pour l'utilisateur `postgres`

### macOS
```bash
brew install postgresql
brew services start postgresql
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Configuration de la Base de Données

### 1. Créer la base de données

Connectez-vous à PostgreSQL :
```bash
psql -U postgres
```

Créez la base de données :
```sql
CREATE DATABASE groupie_tracker;
```

Quittez psql :
```
\q
```

### 2. Variables d'environnement

Créez un fichier `.env` à la racine du projet (ou définissez les variables dans votre système) :

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
DB_NAME=groupie_tracker
```

**Note:** Le fichier `.env` est ignoré par git pour des raisons de sécurité.

### Variables par défaut

Si aucune variable n'est définie, le système utilisera :
- `DB_HOST`: localhost
- `DB_PORT`: 5432
- `DB_USER`: postgres
- `DB_PASSWORD`: postgres
- `DB_NAME`: groupie_tracker

## Installation des dépendances Go

```bash
go mod download
```

## Démarrage de l'application

```bash
go run main.go
```

L'application créera automatiquement la table `favorites` au démarrage si elle n'existe pas.

## Structure de la table favorites

```sql
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    artist_id INTEGER NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    artist_image VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(artist_id)
);

CREATE INDEX idx_artist_id ON favorites(artist_id);
```

## Vérification

Pour vérifier que tout fonctionne :

1. Démarrez l'application
2. Ouvrez http://localhost:8080
3. Cliquez sur le cœur blanc (🤍) sur une carte d'artiste
4. Le cœur devrait devenir rouge (❤️)
5. Allez sur http://localhost:8080/favorites.html pour voir vos favoris

## Dépannage

### Erreur de connexion à PostgreSQL

Si vous voyez l'avertissement :
```
⚠️ Avertissement: Impossible de se connecter à PostgreSQL
```

Vérifiez :
1. PostgreSQL est bien démarré
2. Les identifiants dans vos variables d'environnement sont corrects
3. La base de données `groupie_tracker` existe

### L'application démarre sans base de données

L'application peut fonctionner sans PostgreSQL, mais les fonctionnalités de favoris seront désactivées. Un message d'avertissement sera affiché dans les logs :
```
Le serveur continuera sans fonctionnalités de favoris
```

## API Endpoints

- `GET /api/favorites` - Liste tous les favoris
- `POST /api/favorites` - Ajoute un favori
  ```json
  {
    "artist_id": 1,
    "artist_name": "Queen",
    "artist_image": "https://..."
  }
  ```
- `DELETE /api/favorites?artist_id=1` - Supprime un favori
- `GET /api/favorites/check?artist_id=1` - Vérifie si un artiste est en favoris

## Production

Pour un déploiement en production :

1. Utilisez des variables d'environnement sécurisées
2. Activez SSL : changez `sslmode=disable` en `sslmode=require` dans `internal/database/postgres.go`
3. Utilisez un utilisateur PostgreSQL avec des permissions limitées (pas `postgres`)
4. Sauvegardez régulièrement votre base de données

## Support

Si vous rencontrez des problèmes, vérifiez :
- Les logs de l'application
- Les logs PostgreSQL
- Que toutes les dépendances Go sont bien installées : `go mod tidy`
