# 🚀 Guide de Déploiement sur Scalingo

## Prérequis

- Compte [Scalingo](https://scalingo.com) (gratuit)
- Scalingo CLI installé :   
  ```bash
  # Windows (chocolatey)
  choco install scalingo
  
  # macOS
  brew install scalingo
  
  # Linux
  curl -O https://cli-dl.scalingo.com/install && bash install
  ```

## Étape 1 : Créer l'application Scalingo

```bash
# Se connecter à Scalingo
scalingo login

# Créer l'app
scalingo create groupie-tracker

# Ou cloner depuis Git
cd Groupie-Persso
scalingo create --remote scalingo --github Claxid/Groupie-Persso
```

## Étape 2 : Ajouter l'addon PostgreSQL

L'addon gratuit vous offrira 512 MB de stockage, ce qui est largement suffisant pour les favoris.

**Via le dashboard :**
1. Allez sur https://dashboard.scalingo.com
2. Sélectionnez votre app
3. Allez dans "Addons"
4. Ajouter "PostgreSQL" → PostgreSQL Free

**Via la CLI :**
```bash
scalingo addons-add postgresql-free
```

Scalingo crée automatiquement une variable `DATABASE_URL` 🎉

## Étape 3 : Compiler et déployer

### Option A : Git Push (recommandé)

```bash
# Ajouter le remote Scalingo
git remote add scalingo https://git.scalingo.io/groupie-tracker.git

# Pusher
git push scalingo main

# Scalingo compile, exécute les migrations, et déploie
```

### Option B : Après git push

```bash
# Voir les logs de déploiement
scalingo logs

# Accéder à l'application
scalingo open
```

## Étape 4 : Vérifier le déploiement

```bash
# Voir le statut
scalingo ps

# Voir les logs
scalingo logs -f

# Vérifier les variables d'environnement
scalingo env
```

## 🔍 Vérification du système de favoris

### 1. Vérifier que la BDD est connectée

```bash
scalingo logs | grep "DATABASE_URL\|connection\|migration"
```

Vous devriez voir :
```
✅ Base de données initialisée avec succès!
✅ Table 'favorites' créée/vérifiée
```

### 2. Tester l'API favoris

```bash
# Récupérer le domaine de votre app
scalingo open

# Puis tester les endpoints
curl https://groupie-tracker-XXXX.scalingo.io/api/favorites
```

### 3. Depuis l'interface web

1. Ouvrir https://groupie-tracker-XXXX.scalingo.io
2. Cliquer sur la ❤️ d'un artiste
3. Aller sur la page des favoris pour vérifier

## ⚠️ Dépannage

### L'app envoie constamment une erreur de migration

```bash
# Voir les logs détaillés
scalingo logs -f

# Si erreur de certificat SSL:
# Éditer .env ou dans le dashboard et ajouter:
# DATABASE_URL="postgresql://..." (sans sslmode=require si problèmes)
```

### L'app se relance continuellement

```bash
# Vérifier le health check
scalingo status

# Voir les crashs
scalingo logs --tail 50
```

### Les favoris ne se sauvegardent pas

```bash
# Vérifier si DATABASE_URL est défini
scalingo env | grep DATABASE_URL

# Si vide, réajouter l'addon PostgreSQL:
scalingo addons-add postgresql-free
```

### Réappliquer les migrations manuellement

```bash
# Créer un one-off dyno
scalingo run './migrate'

# Voir les résultats
scalingo logs -f
```

## 📊 Monitoring

### Voir utilisation DB

```bash
scalingo addons  # Affiche stats
```

### Autoscaling (optionnel)

Pour augmenter la capacité si trop de requêtes :

```bash
scalingo scale web=2  # 2 dynos
```

## 🔐 Sécurité en production

Personnaliser les variables d'environnement importantes :

```bash
scalingo env-set JWT_SECRET="votre-secret-forte"
scalingo env-set SESSION_SECRET="autre-secret-forte"
scalingo env-set ENVIRONMENT="production"
```

## Mise à jour

```bash
# Après des changements locaux
git add .
git commit -m "description"
git push scalingo main

# Scalingo redéploie automatiquement
```

## 💾 Sauvegarde PostgreSQL

**Important :** Sauvegardez régulièrement votre DB !

```bash
# Dump de la BDD
scalingo db-backup create postgresql

# Voir les backups
scalingo db-backup list postgresql

# Restaurer un backup
scalingo db-backup restore postgresql
```

## Support

- [Documentation Scalingo Go](https://doc.scalingo.com/languages/go/)
- [Documentation Addons](https://doc.scalingo.com/addons/)
- [Support Scalingo](https://support.scalingo.com)

## Variables d'environnement importantes

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DATABASE_URL` | ✅ Fourni automatiquement par Scalingo | - |
| `PORT` | Port d'écoute | 8080 |
| `ENVIRONMENT` | production/development | production |
| `GROUPIE_TRACKERS_API` | URL API des artistes | https://groupietrackers... |
| `ALLOWED_ORIGINS` | CORS origins | * |

---

✅ **Vous êtes prêt !** Le système de favoris fonctionne maintenant avec PostgreSQL sur Scalingo ! 🎉
