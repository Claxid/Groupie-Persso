# Groupie-Persso

Application web musicale en Go (backend) + HTML/CSS/JS (frontend).

## Installation rapide

```
git clone https://github.com/Claxid/Groupie-Persso.git
cd Groupie-Persso
go mod download
go build -o groupie-tracker.exe main.go database.go auth.go routes.go
./groupie-tracker.exe
```

## Configuration

Variables d'environnement: PORT (8080), DISABLE_DB (0), DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME

## Description des fonctions

### main.go

func main() - Point d'entree, gestion paniques, init DB conditionnelle, setup routes, demarrage serveur

Lignes importantes:
- defer func() { if r := recover(); r != nil { log.Fatalf(...) } }() 
  Capture les paniques Go non gerees
- if os.Getenv("DISABLE_DB") != "1" { if c,e := InitDB(); ... }
  Connexion DB optionnelle (peut desactiver avec DISABLE_DB=1)
- log.Fatal(http.ListenAndServe(":"+p, nil))
  Demarre serveur HTTP, Fatal = arrete l'app en cas d'erreur

---

### database.go

func InitDB() - Etablit connexion MySQL avec pooling, charset utf8mb4, timeout 30min

Lignes importantes:
- dsn := mysql.Config{User: getenvDefault("DB_USER", "root"), ...}
  Configuration DSN avec parametres MySQL depuis variables environnement
- database.SetMaxOpenConns(10) / SetMaxIdleConns(5)
  Limite: 10 connexions max ouvertes, 5 inactives gardees en reserve
- database.SetConnMaxLifetime(30 * time.Minute)
  Ferme connexions apres 30 minutes (evite problemes serveur MySQL)
- if err := database.Ping(); err != nil { return nil, err }
  Valide que connexion fonctionne avant de la retourner

func getenvDefault(key, def string) - Lit variable environnement, retourne valeur par defaut si vide

Lignes importantes:
- if v := os.Getenv(key); v != "" { return v }
  Teste si variable existe et n'est pas vide
- return def
  Retourne valeur par defaut si variable non trouvee

---

### auth.go

type User - Struct avec Nom, Prenom, Sexe, Password (pour JSON parsing)

func HandleRegister(db *sql.DB) - Cree nouvel utilisateur, validation, bcrypt hash, insert DB

Lignes importantes:
- if req.Nom == "" || req.Prenom == "" || ... || len(req.Password) < 6
  Validation stricte: tous champs requis, password minimum 6 caracteres
- hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
  Hash mot de passe avec bcrypt (jamais stocke en clair)
- result, err := db.Exec(query, req.Nom, req.Prenom, req.Sexe, string(hash))
  Insert utilisateur en DB avec mot de passe hashe
- id, _ := result.LastInsertId()
  Recupere ID auto-increment de l'utilisateur cree

func HandleLogin(db *sql.DB) - Authentifie utilisateur, verifie credentials avec bcrypt

Lignes importantes:
- var req struct { IDUser int; Password string }
  Decode JSON avec ID utilisateur et mot de passe
- row := db.QueryRow("SELECT `password`, ... FROM `user` WHERE `id_user` = ?", req.IDUser)
  Requete parametrisee pour recuperer hash stocke (previent SQL injection)
- if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil
  Compare mot de passe fourni avec hash stocke (seule facon de verifier)

func writeJSON(w, status, payload) - Helper repondre en JSON avec status HTTP

Lignes importantes:
- w.Header().Set("Content-Type", "application/json")
  Define header HTTP pour indiquer JSON
- w.WriteHeader(status)
  Envoie code status HTTP (201, 401, 200, etc)
- json.NewEncoder(w).Encode(payload)
  Encode et ecrit payload en JSON dans reponse

---

### routes.go

func SetupRoutes(db) - Configure 4 proxies API, fichiers statiques, templates, endpoints auth

Lignes importantes:
- http.HandleFunc("/api/artists-proxy", CreateProxy("https://groupietrackers.herokuapp.com/api/artists"))
  Enregistre route proxy pour chaque endpoint Groupie Trackers (4 routes)
- http.HandleFunc("/static/", ServeStatic(staticDir))
  Configure serveur fichiers statiques avec detection MIME type
- for _, rt := range routes { http.HandleFunc(rlocal, serveIndex) }
  Boucle pour enregistrer plusieurs routes avec meme handler

func CreateProxy(remote string) - Factory proxy HTTP, requete GET distant (timeout 10s), forward reponse

Lignes importantes:
- client := &http.Client{Timeout: 10 * time.Second}
  Client HTTP avec timeout 10s (evite attente infinie)
- resp, err := client.Get(remote)
  Effectue requete GET vers API distante
- if ct := resp.Header.Get("Content-Type"); ct != "" { w.Header().Set("Content-Type", ct) }
  Copie Content-Type de l'API distant (JSON, etc)
- io.Copy(w, resp.Body)
  Forward contenu entier de reponse au client (efficace, ne charge pas en memoire)

func ServeStatic(staticDir string) - Sert fichiers statiques, detecte MIME type, cache 1 an

Lignes importantes:
- reqPath := r.URL.Path[len("/static/"):] / full := filepath.Join(staticDir, ...)
  Extrait chemin du fichier et construit chemin absolu securise
- switch ext { case ".css": w.Header().Set("Content-Type", "text/css") }
  Detecte extension et definit Content-Type correct
- w.Header().Set("Cache-Control", "public, max-age=31536000")
  Cache agressif 1 an (31536000 secondes) pour performance
- http.NotFound(w, r)
  Retourne 404 si fichier n'existe pas

---

## Routes principales

/ - Page accueil | /search, /filters - Pages templates | /login - Auth
/api/artists-proxy, /locations-proxy, /dates-proxy, /relation-proxy - Groupie API
/api/register, /api/login - Endpoints auth
/static/* - Fichiers CSS, JS, images

## Build

go build -o groupie-tracker.exe main.go database.go auth.go routes.go

## Licence

Libre d'utilisation.
