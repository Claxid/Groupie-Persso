# Groupie — instructions locales et déploiement Netlify

But: rendre le serveur local identique à ce que Netlify sert (root `index.html` + `/static/`).

## 🆕 Système de Favoris avec PostgreSQL

Le projet inclut maintenant un système complet de favoris qui permet aux utilisateurs de sauvegarder leurs artistes préférés dans une base de données PostgreSQL.

### Fonctionnalités :
- ❤️ Ajouter/retirer des artistes en favoris
- 📋 Page dédiée pour voir tous vos favoris
- 💾 Données persistantes stockées dans PostgreSQL
- 🎨 Interface intuitive avec boutons cœur sur chaque artiste

### Configuration rapide :

1. **Installer PostgreSQL** (voir [DATABASE_SETUP.md](DATABASE_SETUP.md) pour les détails)

2. **Créer la base de données** :
   ```sql
   CREATE DATABASE groupie_tracker;
   ```

3. **Configurer les variables d'environnement** (optionnel) :
   ```bash
   # Copier le fichier exemple
   cp .env.example .env
   # Éditer .env avec vos identifiants PostgreSQL
   ```

4. **Démarrer l'application** :
   ```bash
   go run main.go
   ```

L'application créera automatiquement la table `favorites` au démarrage.

**Note :** L'application peut fonctionner sans PostgreSQL, mais les fonctionnalités de favoris seront désactivées.

Pour plus d'informations, consultez [DATABASE_SETUP.md](DATABASE_SETUP.md).

---

## Raccourcis utiles

- Démarrer le serveur Go local (écoute sur `:8080`):

```powershell
Set-Location -LiteralPath 'c:\Users\hohoj\OneDrive\Bureau\Groupie-perso\Groupie'
go run main.go
```

- Synchroniser les fichiers statiques (copie `web/static` -> `static`):

```powershell
Set-Location -LiteralPath 'c:\Users\hohoj\OneDrive\Bureau\Groupie-perso\Groupie'
.\sync-static.ps1
```

Netlify

- Si vous déployez sur Netlify en tant que site statique, configurez le "Publish directory" sur la racine du repo (le dossier qui contient `index.html`). Netlify servira `index.html` et le dossier `/static`.
- Si vous souhaitez que Netlify serve le contenu de `web` à la place, changez le publish directory sur `web` et adaptez les chemins dans `index.html`.

Notes

- Les autres templates `web/templates/*.html` et les fichiers JS ont été remplacés par des placeholders et redirigent ou renvoient un lien vers `/`.
- Utilisez le script `sync-static.ps1` avant de déployer si vous éditez `web/static` et souhaitez que la racine `static/` soit à jour.
// Placeholder for README.md