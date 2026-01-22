// Package main est le point d'entrée du serveur HTTP Groupie Tracker
package main

// Import des packages nécessaires
import (
	"database/sql"  // Package pour interagir avec les bases de données SQL
	"encoding/json" // Package pour encoder/décoder du JSON
	"fmt"           // Package pour formater des strings
	"io"            // Package pour les opérations I/O (lecture/écriture)
	"log"           // Package pour logger des messages dans la console
	"net/http"      // Package pour créer un serveur HTTP
	"os"            // Package pour interagir avec le système d'exploitation
	"path/filepath" // Package pour manipuler les chemins de fichiers
	"time"          // Package pour gérer le temps et les durées

	"github.com/go-sql-driver/mysql" // Driver MySQL pour Go (gestion connexion DB)
	"golang.org/x/crypto/bcrypt"     // Package bcrypt pour hacher les mots de passe de façon sécurisée
)

// Type user représente la structure d'un utilisateur dans la base de données
// Les tags `json:"..."` permettent de mapper les champs avec les clés JSON lors de l'encodage/décodage
type user struct {
	Nom      string `json:"nom"`      // Nom de famille de l'utilisateur
	Prenom   string `json:"prenom"`   // Prénom de l'utilisateur
	Sexe     string `json:"sexe"`     // Sexe de l'utilisateur (M/F/Autre)
	Password string `json:"password"` // Mot de passe en clair (sera haché avant stockage)
}

// Variable globale db pour stocker la connexion à la base de données MySQL
// Accessible depuis toutes les fonctions du package main
var db *sql.DB

// Fonction main : point d'entrée du programme, s'exécute au démarrage
func main() {
	// defer permet d'exécuter une fonction à la fin de main(), même en cas de panique
	defer func() {
		// recover() capture les paniques (erreurs fatales) pour éviter un crash brutal
		if r := recover(); r != nil {
			// log.Fatalf affiche le message et termine le programme avec code d'erreur
			log.Fatalf("panic occurred: %v", r)
		}
	}()

	// Vérifie la variable d'environnement DISABLE_DB
	// Si != "1", on tente de se connecter à MySQL
	if os.Getenv("DISABLE_DB") != "1" {
		var err error // Déclare la variable d'erreur

		// Appelle initDB() qui retourne (*sql.DB, error)
		db, err = initDB()

		// Si erreur de connexion (ex: MySQL down, mauvais mot de passe)
		if err != nil {
			// Log l'erreur mais continue l'exécution (mode dégradé sans DB)
			log.Printf("DB disabled (init failed): %v", err)
			db = nil // Assure que db est nil pour que les handlers sachent
		} else {
			// Connexion réussie
			log.Println("DB connection established")
		}
	} else {
		// DISABLE_DB=1 → désactivation explicite de la DB
		log.Println("DB disabled via DISABLE_DB=1")
	}

	// Récupère le port depuis la variable d'environnement PORT
	port := os.Getenv("PORT")

	// Si PORT n'est pas défini, utilise 8080 par défaut
	if port == "" {
		port = "8080"
	}

	// Crée une fonction proxy qui retourne un handler HTTP
	// Cette fonction factory permet de créer plusieurs proxies avec différentes URLs
	proxy := func(remote string) http.HandlerFunc {
		// Retourne une fonction qui correspond au type http.HandlerFunc
		return func(w http.ResponseWriter, r *http.Request) {
			// Log la requête pour debug
			log.Printf("Proxying request to: %s", remote)

			// Crée un client HTTP avec timeout de 10 secondes
			// Sans timeout, la requête pourrait bloquer indéfiniment
			client := &http.Client{Timeout: 10 * time.Second}

			// Fait une requête GET vers l'URL distante (API Groupie Trackers)
			resp, err := client.Get(remote)

			// Si erreur (timeout, connexion impossible, etc.)
			if err != nil {
				// Log l'erreur
				log.Printf("Error fetching %s: %v", remote, err)
				// Retourne une erreur 502 Bad Gateway au client
				http.Error(w, "failed to fetch remote API", http.StatusBadGateway)
				return // Termine la fonction ici
			}

			// defer resp.Body.Close() garantit la fermeture du body
			// Même si on return plus tôt ou s'il y a une erreur
			// Important pour éviter les fuites de mémoire
			defer resp.Body.Close()

			// Récupère le Content-Type de la réponse originale
			if ct := resp.Header.Get("Content-Type"); ct != "" {
				// Si présent, copie le Content-Type dans notre réponse
				w.Header().Set("Content-Type", ct)
			} else {
				// Sinon, assume que c'est du JSON (cas par défaut)
				w.Header().Set("Content-Type", "application/json")
			}

			// Header CRUCIAL : autorise tous les domaines à accéder à cette ressource
			// Sans ce header, le navigateur bloque la réponse (politique CORS)
			w.Header().Set("Access-Control-Allow-Origin", "*")

			// Écrit le status code de la réponse originale (200, 404, etc.)
			w.WriteHeader(resp.StatusCode)

			// Copie le body de la réponse distante vers notre réponse
			// io.Copy est efficace car il utilise un buffer interne
			_, err = io.Copy(w, resp.Body)

			// Si erreur lors de la copie (connexion interrompue, etc.)
			if err != nil {
				log.Printf("Error copying response body: %v", err)
			}

			// Log le succès
			log.Printf("Successfully proxied request to: %s", remote)
		}
	}

	// Enregistrement des routes proxy pour l'API Groupie Trackers
	// Ces proxies évitent les problèmes CORS en faisant transiter les requêtes par notre serveur

	// Route pour récupérer la liste des artistes
	http.HandleFunc("/api/artists-proxy", proxy("https://groupietrackers.herokuapp.com/api/artists"))

	// Route pour récupérer les lieux de concerts
	http.HandleFunc("/api/locations-proxy", proxy("https://groupietrackers.herokuapp.com/api/locations"))

	// Route pour récupérer les dates de concerts
	http.HandleFunc("/api/dates-proxy", proxy("https://groupietrackers.herokuapp.com/api/dates"))

	// Route pour récupérer les relations (lieux + dates par artiste)
	http.HandleFunc("/api/relation-proxy", proxy("https://groupietrackers.herokuapp.com/api/relation"))

	// Log la confirmation de l'enregistrement des routes
	log.Println("API proxy routes registered")

	// Configuration du serveur de fichiers statiques (CSS, JS, images)
	// Tous les fichiers statiques sont dans web/static/
	staticDir := filepath.Join("web", "static") // Construit le chemin: "web/static"
	log.Printf("static root: %s", staticDir)    // Log le chemin pour debug

	// Enregistre un handler pour toutes les requêtes commençant par /static/
	http.HandleFunc("/static/", func(w http.ResponseWriter, r *http.Request) {
		// Retire le préfixe "/static/" de l'URL pour obtenir le chemin relatif
		// Exemple: "/static/css/style.css" → "css/style.css"
		reqPath := r.URL.Path[len("/static/"):]

		// Construit le chemin complet du fichier sur le disque
		// filepath.FromSlash convertit les / en \ sur Windows
		full := filepath.Join(staticDir, filepath.FromSlash(reqPath))

		// Vérifie si le fichier existe et n'est pas un dossier
		// os.Stat retourne les infos du fichier (taille, permissions, etc.)
		if fi, err := os.Stat(full); err == nil && !fi.IsDir() {
			// Définit le Content-Type correct selon l'extension du fichier
			// Important pour que le navigateur interprète correctement le fichier
			ext := filepath.Ext(full) // Récupère l'extension (".css", ".js", etc.)

			// Switch pour définir le bon MIME type
			switch ext {
			case ".css":
				w.Header().Set("Content-Type", "text/css") // Feuilles de style
			case ".js":
				w.Header().Set("Content-Type", "application/javascript") // JavaScript
			case ".png":
				w.Header().Set("Content-Type", "image/png") // Images PNG
			case ".jpg", ".jpeg":
				w.Header().Set("Content-Type", "image/jpeg") // Images JPEG
			case ".svg":
				w.Header().Set("Content-Type", "image/svg+xml") // Images vectorielles SVG
			case ".gif":
				w.Header().Set("Content-Type", "image/gif") // Images GIF animées
			case ".webp":
				w.Header().Set("Content-Type", "image/webp") // Images WebP (moderne)
			}

			// Ajoute un header de cache pour améliorer les performances
			// max-age=31536000 = 1 an (les fichiers statiques changent rarement)
			// "public" = peut être mis en cache par n'importe quel cache (navigateur, proxy)
			w.Header().Set("Cache-Control", "public, max-age=31536000")

			// Sert le fichier au client
			http.ServeFile(w, r, full)
			return // Termine la fonction ici
		}

		// Si le fichier n'existe pas, retourne une erreur 404 Not Found
		http.NotFound(w, r)
	})

	// Fonction pour servir le fichier index.html (page d'accueil)
	// Utilisée pour les routes SPA (Single Page Application)
	serveIndex := func(w http.ResponseWriter, r *http.Request) {
		// Sert le fichier index.html situé à la racine du projet
		http.ServeFile(w, r, filepath.Join("index.html"))
	}

	// Enregistre la route racine "/" qui affiche index.html
	http.HandleFunc("/", serveIndex)

	// Liste des routes qui doivent aussi afficher index.html (routing SPA)
	// Sur ces routes, le JavaScript gère l'affichage dynamique
	routes := []string{"/search", "/filters"}

	// Boucle sur chaque route pour l'enregistrer
	for _, rt := range routes {
		rlocal := rt // Capture la variable dans la closure (important en Go)
		// Enregistre le handler pour cette route
		http.HandleFunc(rlocal, serveIndex)
	}

	// Redirection permanente de /geoloc vers /geoloc.html
	http.HandleFunc("/geoloc", func(w http.ResponseWriter, r *http.Request) {
		// http.StatusMovedPermanently = 301 (redirection permanente)
		http.Redirect(w, r, "/geoloc.html", http.StatusMovedPermanently)
	})

	// Route pour la page de recherche (sert le fichier HTML depuis web/templates/)
	http.HandleFunc("/search.html", func(w http.ResponseWriter, r *http.Request) {
		// Construit le chemin: web/templates/search.html
		http.ServeFile(w, r, filepath.Join("web", "templates", "search.html"))
	})

	// Route pour la page de login (avec et sans .html)
	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		// Sert login.html depuis le dossier templates
		http.ServeFile(w, r, filepath.Join("web", "templates", "login.html"))
	})

	// Route alternative /login.html (même fichier)
	http.HandleFunc("/login.html", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("web", "templates", "login.html"))
	})

	// Routes API pour l'authentification
	// Ces routes gèrent l'inscription et la connexion des utilisateurs
	http.HandleFunc("/api/register", handleRegister) // Inscription (création compte)
	http.HandleFunc("/api/login", handleLogin)       // Connexion (authentification)

	// Route pour la page de géolocalisation
	http.HandleFunc("/geoloc.html", func(w http.ResponseWriter, r *http.Request) {
		// Sert geoloc.html depuis templates (carte Leaflet)
		http.ServeFile(w, r, filepath.Join("web", "templates", "geoloc.html"))
	})

	// Construit l'adresse du serveur avec le port (ex: ":8080")
	addr := ":" + port

	// Log l'adresse d'accès pour l'utilisateur
	log.Printf("Starting server on %s — open http://localhost:%s/", addr, port)

	// Démarre le serveur HTTP et écoute sur le port spécifié
	// nil = utilise le multiplexeur par défaut (toutes les routes enregistrées)
	// Cette fonction bloque jusqu'à ce que le serveur s'arrête ou qu'une erreur survienne
	if err := http.ListenAndServe(addr, nil); err != nil {
		// Si erreur (port déjà utilisé, permissions insuffisantes, etc.)
		// log.Fatalf arrête le programme avec un code d'erreur
		log.Fatalf("server failed: %v", err)
	}
}

// Fonction initDB initialise et configure la connexion à la base de données MySQL
// Retourne (*sql.DB, error) : pointeur vers la connexion ou une erreur
func initDB() (*sql.DB, error) {
	// Configuration de la connexion MySQL avec le package go-sql-driver
	dsn := mysql.Config{
		// Nom d'utilisateur (depuis variable d'env ou "root" par défaut)
		User: getenvDefault("DB_USER", "root"),

		// Mot de passe (depuis variable d'env ou vide par défaut)
		Passwd: getenvDefault("DB_PASS", ""),

		// Protocole réseau (tcp pour connexion via socket)
		Net: "tcp",

		// Adresse du serveur MySQL (host:port)
		// Construit avec fmt.Sprintf en combinant host et port
		Addr: fmt.Sprintf("%s:%s",
			getenvDefault("DB_HOST", "localhost"), // Hôte par défaut: localhost
			getenvDefault("DB_PORT", "3306")),     // Port par défaut: 3306 (standard MySQL)

		// Nom de la base de données à utiliser
		DBName: getenvDefault("DB_NAME", "groupi_tracker"),

		// Autorise l'authentification native MySQL (compatibilité)
		AllowNativePasswords: true,

		// Parse automatiquement les colonnes DATE/DATETIME en time.Time Go
		ParseTime: true,

		// Utilise le fuseau horaire local pour les dates
		Loc: time.Local,

		// Paramètres supplémentaires de connexion
		Params: map[string]string{
			// Charset utf8mb4 supporte tous les caractères Unicode (emojis inclus)
			"charset": "utf8mb4",
		},
	}

	// Ouvre une connexion à MySQL avec la configuration DSN
	// N'effectue PAS encore de connexion réelle (lazy connection)
	database, err := sql.Open("mysql", dsn.FormatDSN())

	// Si erreur lors de l'ouverture (DSN invalide, driver manquant)
	if err != nil {
		return nil, err // Retourne nil et l'erreur
	}

	// Configure le pool de connexions pour optimiser les performances

	// Nombre maximum de connexions ouvertes simultanément (limite la charge)
	database.SetMaxOpenConns(10)

	// Nombre de connexions inactives maintenues en pool (réutilisation rapide)
	database.SetMaxIdleConns(5)

	// Durée de vie maximale d'une connexion (30 minutes avant renouvellement)
	// Prévient les timeouts MySQL après inactivité prolongée
	database.SetConnMaxLifetime(30 * time.Minute)

	// Teste la connexion réelle à MySQL (envoie un ping)
	// C'est ICI que la connexion TCP est vraiment établie
	if err := database.Ping(); err != nil {
		return nil, err // Retourne l'erreur si MySQL est inaccessible
	}

	// Connexion réussie, retourne le pointeur vers la DB
	return database, nil
}

// Fonction getenvDefault récupère une variable d'environnement avec valeur par défaut
// Paramètres: key (nom de la variable), def (valeur par défaut si absente)
// Retourne: la valeur de la variable ou la valeur par défaut
func getenvDefault(key, def string) string {
	// os.Getenv récupère la variable d'environnement
	if v := os.Getenv(key); v != "" {
		// Si la variable existe et n'est pas vide, on la retourne
		return v
	}
	// Sinon, on retourne la valeur par défaut fournie
	return def
}

// Fonction writeJSON encode et envoie une réponse JSON au client
// Paramètres: w (ResponseWriter), status (code HTTP), payload (données à encoder)
func writeJSON(w http.ResponseWriter, status int, payload any) {
	// Définit le Content-Type pour indiquer que c'est du JSON
	w.Header().Set("Content-Type", "application/json")

	// Écrit le code de statut HTTP (200, 400, 500, etc.)
	w.WriteHeader(status)

	// Encode le payload en JSON et l'écrit dans la réponse
	// json.NewEncoder(w) crée un encoder qui écrit directement dans w
	// .Encode(payload) convertit payload en JSON et l'envoie
	// Le underscore _ ignore l'erreur potentielle (simplification)
	_ = json.NewEncoder(w).Encode(payload)
}

// Fonction handleRegister gère l'inscription d'un nouvel utilisateur
// Crée un compte avec mot de passe haché de façon sécurisée (bcrypt)
func handleRegister(w http.ResponseWriter, r *http.Request) {
	// Vérification 1: Accepte uniquement les requêtes POST
	// Méthode REST standard pour création de ressource
	if r.Method != http.MethodPost {
		// Retourne erreur 405 Method Not Allowed si pas POST
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return // Termine la fonction
	}

	// Vérification 2: Vérifie que la base de données est disponible
	if db == nil {
		// Retourne erreur 503 Service Unavailable si pas de DB
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database unavailable"})
		return
	}

	// Déclaration d'une variable pour stocker les données utilisateur
	var req user

	// Décodage du JSON reçu dans le body de la requête
	// json.NewDecoder(r.Body) lit le body
	// .Decode(&req) parse le JSON et remplit la structure user
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Si le JSON est malformé, retourne erreur 400 Bad Request
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	// Log pour le debug (affiche les infos de la tentative d'inscription)
	// %q pour quoted string, %d pour nombre
	log.Printf("Register attempt: Nom=%q, Prenom=%q, Sexe=%q, PwdLen=%d",
		req.Nom, req.Prenom, req.Sexe, len(req.Password))

	// Validation des champs: vérifie qu'aucun champ n'est vide
	// ET que le mot de passe fait au moins 6 caractères
	if req.Nom == "" || req.Prenom == "" || req.Sexe == "" || len(req.Password) < 6 {
		// Retourne erreur 400 avec message générique (sécurité)
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing or invalid fields"})
		return
	}

	// Hachage sécurisé du mot de passe avec bcrypt
	// bcrypt.DefaultCost = 10 (2^10 = 1024 itérations)
	// Génère automatiquement un salt unique pour chaque utilisateur
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	// Si erreur lors du hachage (rare, problème mémoire)
	if err != nil {
		// Retourne erreur 500 Internal Server Error
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to hash password"})
		return
	}

	// Préparation de la requête SQL avec placeholders (?)
	// Les backticks ` sont nécessaires car "Prénom" contient un accent
	// Les ? sont remplacés par les valeurs de façon sécurisée (prévient injections SQL)
	query := "INSERT INTO `user` (`Nom`, `Prénom`, `sexe`, `password`) VALUES (?, ?, ?, ?)"

	// Exécution de la requête INSERT
	// db.Exec remplace les ? par les valeurs fournies de manière sécurisée
	result, err := db.Exec(query, req.Nom, req.Prenom, req.Sexe, string(hash))

	// Si erreur (ex: utilisateur existe déjà, contrainte UNIQUE violée)
	if err != nil {
		// Retourne erreur 409 Conflict (code approprié pour conflit de données)
		writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
		return
	}

	// Récupère l'ID auto-généré par MySQL (AUTO_INCREMENT)
	id, _ := result.LastInsertId()

	// Retourne une réponse de succès 201 Created avec l'ID utilisateur
	// Le client a besoin de cet ID pour se connecter ensuite
	writeJSON(w, http.StatusCreated, map[string]any{
		"message":        "user created",
		"id_utilisateur": id,
	})
}

// Fonction handleLogin gère l'authentification d'un utilisateur existant
// Vérifie l'ID utilisateur et le mot de passe avec bcrypt
func handleLogin(w http.ResponseWriter, r *http.Request) {
	// Vérification 1: Accepte uniquement les requêtes POST
	if r.Method != http.MethodPost {
		// Retourne erreur 405 si pas POST
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	// Vérification 2: Vérifie que la DB est disponible
	if db == nil {
		// Retourne erreur 503 si pas de DB
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database unavailable"})
		return
	}

	// Structure anonyme pour décoder les credentials du body JSON
	var req struct {
		IDUser   int    `json:"id_utilisateur"` // ID numérique de l'utilisateur
		Password string `json:"password"`       // Mot de passe en clair (sera comparé au hash)
	}

	// Décode le JSON du body dans la structure req
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Si JSON invalide, retourne erreur 400
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	// Validation: vérifie que l'ID est positif et le password non vide
	if req.IDUser <= 0 || req.Password == "" {
		// Retourne erreur 400 si credentials manquants
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing credentials"})
		return
	}

	// Variables pour stocker les données récupérées de la DB
	var storedHash string  // Hash bcrypt stocké en DB
	var nom, prenom string // Nom et prénom de l'utilisateur
	var sexe string        // Sexe de l'utilisateur

	// Requête SQL SELECT pour récupérer l'utilisateur par son ID
	// QueryRow retourne une seule ligne (ou erreur si aucune)
	row := db.QueryRow("SELECT `password`, `Nom`, `Prénom`, `sexe` FROM `user` WHERE `id_user` = ?", req.IDUser)

	// Scan remplit les variables avec les colonnes récupérées
	// L'ordre doit correspondre à celui du SELECT
	if err := row.Scan(&storedHash, &nom, &prenom, &sexe); err != nil {
		// Si erreur (utilisateur inexistant, etc.)
		// Retourne 401 Unauthorized avec message générique (sécurité)
		// On ne dit pas si c'est l'ID ou le password qui est faux
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	// Compare le password fourni avec le hash stocké en DB
	// bcrypt.CompareHashAndPassword est résistant aux timing attacks
	// (prend toujours le même temps, peu importe si le password est correct)
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
		// Si le password ne correspond pas, retourne 401
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	// Authentification réussie! Retourne les infos utilisateur
	// Note: on ne retourne PAS le mot de passe ou son hash (sécurité)
	writeJSON(w, http.StatusOK, map[string]any{
		"message": "login ok", // Message de succès
		"user": map[string]any{
			"id_utilisateur": req.IDUser, // ID pour les prochaines requêtes
			"nom":            nom,        // Nom de famille
			"prenom":         prenom,     // Prénom
			"sexe":           sexe,       // Sexe
		},
	})
}
