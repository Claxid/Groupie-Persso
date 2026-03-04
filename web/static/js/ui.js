// ============================================================================
// SECTION 1: NAVIGATION MOBILE RESPONSIVE
// ============================================================================
// Cette section gère l'interface utilisateur mobile avec un menu hamburger
// qui s'affiche automatiquement sur les écrans de moins de 700px de largeur.
// Utilise les attributs ARIA pour l'accessibilité des lecteurs d'écran.
// ============================================================================

// Attendre que le DOM soit complètement chargé avant d'initialiser la navigation
// Cela garantit que tous les éléments HTML sont disponibles pour manipulation
document.addEventListener('DOMContentLoaded', function () {
	// Récupérer l'élément de navigation principal par son ID
	// cet élément contient les liens du menu (Accueil, Recherche, etc.)
	var nav = document.getElementById('mainNav');
	
	// Si l'élément de navigation n'existe pas, abandonner l'initialisation
	// Cela évite les erreurs sur les pages qui n'ont pas de menu principal
	if (!nav) return;

	// Créer dynamiquement un bouton hamburger pour les petits écrans
	// Ce bouton sera invisible sur desktop (>700px) mais visible sur mobile
	var toggle = document.createElement('button');
	
	// Assigner un ID unique au bouton pour le ciblage CSS et JavaScript
	toggle.id = 'menuToggle';
	
	// Classe CSS qui stylise le bouton (position fixe, icône hamburger, etc.)
	toggle.className = 'menu-toggle';
	
	// Attribut ARIA pour indiquer l'état du menu (fermé par défaut)
	// Les lecteurs d'écran annoncent "réduit" ou "étendu" selon la valeur
	toggle.setAttribute('aria-expanded','false');
	
	// Label ARIA pour décrire l'action du bouton aux utilisateurs malvoyants
	// Important pour l'accessibilité WCAG 2.1 niveau AA
	toggle.setAttribute('aria-label','Ouvrir le menu');
	
	// Unicode \u2630 = ☰ (icône hamburger à trois lignes horizontales)
	// Symbole universel reconnu pour les menus mobiles
	toggle.textContent = '\u2630';

	// Récupérer le conteneur parent du menu (généralement un <header>)
	// pour y insérer le bouton hamburger à côté de la navigation
	var headerContainer = nav.parentElement;
	
	// Ajouter le bouton hamburger au DOM seulement si le conteneur existe
	// Cela évite les erreurs si la structure HTML est différente
	if (headerContainer) headerContainer.appendChild(toggle);

	// Fonction qui gère l'affichage du menu selon la taille de l'écran
	// Appelée au chargement initial et à chaque redimensionnement de fenêtre
	function updateNavVisibility() {
		// Breakpoint à 700px : en dessous, mode mobile ; au-dessus, mode desktop
		// Cette valeur correspond au media query CSS défini dans style.css
		if (window.innerWidth < 700) {
			// Vérifier si c'est la première initialisation avec un attribut data custom
			// dataset.init est utilisé comme flag pour éviter de cacher le menu à chaque resize
			if (!nav.dataset.init) {
				// Sur mobile, le menu commence fermé par défaut
				// L'utilisateur doit cliquer sur le hamburger pour l'ouvrir
				nav.style.display = 'none';
				
				// Marquer comme initialisé pour ne pas réexécuter ce bloc
				nav.dataset.init = 'true';
			}
		} else {
			// Sur desktop (>700px), afficher le menu en flexbox horizontal
			// display: flex permet l'alignement des liens de navigation en ligne
			nav.style.display = 'flex';
			
			// Réinitialiser l'état ARIA à "réduit" car le bouton n'est plus visible
			toggle.setAttribute('aria-expanded','false');
		}
	}

	// Écouteur d'événement pour le clic sur le bouton hamburger
	// Bascule entre l'état ouvert et fermé du menu mobile
	toggle.addEventListener('click', function () {
		// Déterminer si le menu est actuellement visible
		// true = visible, false = caché
		var showing = nav.style.display !== 'none';
		
		if (showing) {
			// Si le menu est ouvert, le fermer
			nav.style.display = 'none';
			
			// Mettre à jour l'attribut ARIA pour les lecteurs d'écran
			toggle.setAttribute('aria-expanded','false');
		} else {
			// Si le menu est fermé, l'ouvrir en mode flexbox vertical
			nav.style.display = 'flex';
			
			// Indiquer aux lecteurs d'écran que le menu est maintenant étendu
			toggle.setAttribute('aria-expanded','true');
		}
	});

	// Système de défilement fluide pour les ancres internes (liens #section)
	// Améliore l'UX en remplaçant le saut brusque par une animation douce
	document.querySelectorAll('a[href^="#"]').forEach(function (a) {
		// Pour chaque lien commençant par #, ajouter un écouteur de clic
		a.addEventListener('click', function (e) {
			// Récupérer l'élément cible via le sélecteur href (ex: #about)
			var tgt = document.querySelector(this.getAttribute('href'));
			
			// Si l'élément cible existe dans le DOM, effectuer le scroll fluide
			if (tgt) {
				// Empêcher le comportement par défaut (saut instantané)
				e.preventDefault();
				
				// Scroller vers l'élément avec animation CSS (behavior: smooth)
				// Supporté nativement par tous les navigateurs modernes
				tgt.scrollIntoView({behavior:'smooth'});
			}
		});
	});

	// Écouter les événements de redimensionnement de fenêtre
	// Pour ajuster automatiquement la visibilité du menu (mobile ↔ desktop)
	window.addEventListener('resize', updateNavVisibility);
	
	// Appeler immédiatement la fonction pour initialiser l'état au chargement
	updateNavVisibility();
});

// ============================================================================
// SECTION 2: SYSTÈME DE VINYLES ANIMÉS AVEC API GROUPIE TRACKERS
// ============================================================================
// Cette section gère l'affichage dynamique des artistes sous forme de vinyles
// cliquables qui tournent au survol et jouent de la musique.
// Les données proviennent de l'API Groupie Trackers via un proxy local pour
// résoudre les problèmes CORS, avec fallback vers l'API distante.
// ============================================================================

// Attendre le chargement complet du DOM avant d'initialiser les vinyles
// Ceci garantit que .vinyl-grid existe dans le HTML
document.addEventListener('DOMContentLoaded', function () {
	// Message de debug pour confirmer que le script est exécuté
	console.log('🎵 ui.js: DOMContentLoaded event fired');
	
	// ========================================================================
	// CONSTANTES D'API - SYSTÈME DE PROXY LOCAL + FALLBACK DISTANT
	// ========================================================================
	// Les URLs locales passent par notre serveur Go (main.go) qui agit comme
	// proxy CORS. Si le proxy échoue, on bascule automatiquement vers l'API
	// Groupie Trackers directe (avec risque de CORS selon le navigateur).
	// ========================================================================
	
	// URL du proxy local pour récupérer la liste des artistes
	// Route définie dans main.go : http.HandleFunc("/api/artists-proxy", ...)
	const LOCAL_API = '/api/artists-proxy';
	
	// URL directe de l'API Groupie Trackers pour les artistes (fallback)
	// Utilisée si le proxy local est indisponible ou retourne une erreur
	const REMOTE_API = 'https://groupietrackers.herokuapp.com/api/artists';
	
	// URL du proxy local pour récupérer les lieux de concerts des artistes
	// Format: {"index": [{"id": 1, "locations": ["usa-new_york", ...]}, ...]}
	const LOCAL_LOCATIONS_API = '/api/locations-proxy';
	
	// URL directe de l'API Groupie Trackers pour les locations (fallback)
	const REMOTE_LOCATIONS_API = 'https://groupietrackers.herokuapp.com/api/locations';
	
	// URL du proxy local pour récupérer les dates de concerts des artistes
	// Format: {"index": [{"id": 1, "dates": ["*23-08-2019", ...]}, ...]}
	const LOCAL_DATES_API = '/api/dates-proxy';
	
	// URL directe de l'API Groupie Trackers pour les dates (fallback)
	const REMOTE_DATES_API = 'https://groupietrackers.herokuapp.com/api/dates';
	
	// URL du proxy local pour récupérer les relations dates↔lieux
	// Format: {"index": [{"id": 1, "datesLocations": {"usa-new_york": ["*23-08-2019"], ...}}, ...]}
	// Correspond à la route Go /api/relation-proxy (sans s)
	const LOCAL_RELATIONS_API = '/api/relation-proxy';
	
	// URL directe de l'API Groupie Trackers pour les relations (fallback)
	// Note: l'API utilise '/relation' (singulier) au lieu de '/relations'
	const REMOTE_RELATIONS_API = 'https://groupietrackers.herokuapp.com/api/relation';

	// Jeu de données minimal de secours si les APIs échouent
	const SAMPLE_ARTISTS = [
		{ id: 0, name: 'Artist Demo 1', image: '/static/images/vinyle.png', members: [], creationDate: 2000 },
		{ id: 1, name: 'Artist Demo 2', image: '/static/images/vinyle.png', members: [], creationDate: 2005 }
	];
	
	// MP3 de secours (3 secondes) utilisé si iTunes et Deezer échouent
	// Permet de toujours avoir un audio jouable même sans aperçu musical trouvé
	const FALLBACK_PREVIEW = 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3';
	
	// Message de debug avec sélecteur CSS pour vérifier la requête
	console.log('🎵 ui.js: Looking for vinyl-grid with selector: .vinyl-area .vinyl-grid');
	
	// Récupérer le conteneur HTML qui recevra les vinyles dynamiques
	// Structure attendue : <div class="vinyl-area"><div class="vinyl-grid"></div></div>
	const vinylGrid = document.querySelector('.vinyl-area .vinyl-grid');
	
	// Debug pour confirmer la présence ou l'absence du conteneur
	// !!vinylGrid convertit en booléen (true si existe, false sinon)
	console.log('🎵 ui.js: vinylGrid found:', !!vinylGrid, vinylGrid);
	
	// Si le conteneur n'existe pas, abandonner l'initialisation
	// Cela arrive sur les pages search.html ou geoloc.html qui n'ont pas de vinyles
	if (!vinylGrid) {
		console.error('❌ ui.js: vinyl-grid not found, returning');
		return;
	}
	
	// Confirmation que le conteneur est prêt pour recevoir les artistes
	console.log('✅ ui.js: vinyl-grid found, starting initialization');

	// ========================================================================
	// VARIABLES GLOBALES POUR LE CACHE DES DONNÉES API
	// ========================================================================
	// Ces variables stockent les données chargées depuis l'API pour éviter
	// de les retélécharger à chaque ouverture de modal artiste.
	// null = pas encore chargé, objet = données en cache
	// ========================================================================
	
	// Cache pour les lieux de concerts de tous les artistes
	// Structure après chargement: {index: [{id: 1, locations: ["usa-new_york"]}, ...]}
	let locationsData = null;
	
	// Cache pour les dates de concerts de tous les artistes
	// Structure après chargement: {index: [{id: 1, dates: ["*23-08-2019"]}, ...]}
	let datesData = null;
	
	// Cache pour les relations dates↔lieux de tous les artistes
	// Structure: {index: [{id: 1, datesLocations: {"usa-new_york": ["*23-08-2019"]}}, ...]}
	let relationsData = null;

	// ========================================================================
	// SYSTÈME DE GESTION AUDIO - UN SEUL VINYLE PEUT JOUER À LA FOIS
	// ========================================================================
	// Ces variables globales permettent de stopper le vinyle précédent
	// lorsqu'un nouvel artiste est survolé, évitant la cacophonie sonore.
	// ========================================================================
	
	// Référence vers l'élément <audio> actuellement en lecture
	// Permet de le stopper quand un autre vinyle commence à jouer
	let currentAudio = null;
	
	// Référence vers la frame visuelle (div.vinyl-frame) du vinyle en cours
	// Permet de retirer la classe CSS 'playing' qui anime la rotation
	let currentFrame = null;

	// ========================================================================
	// FONCTION UTILITAIRE DE FETCH AVEC GESTION D'ERREURS
	// ========================================================================
	// Fonction réutilisable pour charger des données JSON depuis une URL
	// avec détection automatique des erreurs HTTP (404, 500, etc.)
	// ========================================================================
	
	// Fonction asynchrone qui retourne une Promise<object> du JSON parse
	async function tryFetch(url) {
		// Effectuer la requête HTTP avec cache désactivé (cache: 'no-store')
		// Cela force le navigateur à toujours recharger les données fraîches
		// Important pour éviter des données obsolètes en développement
		const res = await fetch(url, {cache: 'no-store'});
		
		// Vérifier le code de statut HTTP (res.ok = true si 200-299)
		// Lance une exception si erreur 4xx ou 5xx
		if (!res.ok) throw new Error('API response ' + res.status);
		
		// Parser le body JSON et le retourner comme objet JavaScript
		// Lance automatiquement une exception si le JSON est invalide
		return res.json();
	}

	// ========================================================================
	// FONCTIONS DE CHARGEMENT DES DONNÉES AVEC PROXY + FALLBACK
	// ========================================================================
	// Chaque fonction essaie d'abord le proxy local (plus rapide, pas de CORS)
	// puis bascule vers l'API distante en cas d'échec.
	// Cela garantit la résilience de l'application même si le backend est down.
	// ========================================================================

	// Charger les lieux de concerts (locations) de tous les artistes
	async function loadLocations() {
		try {
			// Tentative 1 : charger depuis le proxy local Go (route /api/locations-proxy)
			// Avantage : pas de problème CORS, plus rapide car même domaine
			locationsData = await tryFetch(LOCAL_LOCATIONS_API);
		} catch (err) {
			// Si le proxy local échoue (serveur down, erreur 500, etc.)
			// tenter de charger directement depuis l'API Groupie Trackers
			try {
				locationsData = await tryFetch(REMOTE_LOCATIONS_API);
			} catch (err2) {
				// Si les deux sources échouent, logger l'erreur mais ne pas crasher
				// L'application continuera sans données de lieux (modal affichera "Aucun lieu")
				console.warn('Failed to load locations from both proxy and remote API', err, err2);
			}
		}
	}

	// Charger les dates de concerts de tous les artistes
	async function loadDates() {
		try {
			// Tentative 1 : charger depuis le proxy local Go (route /api/dates-proxy)
			datesData = await tryFetch(LOCAL_DATES_API);
		} catch (err) {
			// Fallback vers l'API distante si le proxy local échoue
			try {
				datesData = await tryFetch(REMOTE_DATES_API);
			} catch (err2) {
				// Si les deux sources échouent, continuer sans dates
				// Le modal affichera "Aucune date connue"
				console.warn('Failed to load dates from both proxy and remote API', err, err2);
			}
		}
	}

	// Charger les relations (mapping dates↔lieux) de tous les artistes
	async function loadRelations() {
		try {
			// Tentative 1 : charger depuis le proxy local Go (route /api/relations-proxy)
			relationsData = await tryFetch(LOCAL_RELATIONS_API);
			
			// Message de succès pour le debug
			console.log('✅ Relations loaded from local proxy');
		} catch (err) {
			// Message d'avertissement si le proxy local échoue
			console.warn('⚠️ Local relations API failed, trying remote...', err);
			
			try {
				// Fallback vers l'API distante Groupie Trackers
				relationsData = await tryFetch(REMOTE_RELATIONS_API);
				
				// Message de succès pour le fallback
				console.log('✅ Relations loaded from remote API');
			} catch (err2) {
				// Si les deux sources échouent, logger l'erreur complète
				console.error('❌ Failed to load relations from both APIs', err, err2);
				
				// Créer un objet par défaut vide pour éviter les erreurs null
				// L'application continuera à fonctionner sans données de relations
				relationsData = { index: [] };
			}
		}
	}

	// ========================================================================
	// FONCTIONS HELPER POUR RÉCUPÉRER LES DONNÉES D'UN ARTISTE SPÉCIFIQUE
	// ========================================================================
	// Ces fonctions parcourent les données mises en cache pour extraire
	// les informations d'un seul artiste à partir de son ID.
	// Utilisées lors de l'ouverture du modal pour afficher les détails.
	// ========================================================================

	// Récupérer la liste des lieux de concerts pour un artiste donné
	// @param artistId: number - ID de l'artiste (1 à 52 dans l'API Groupie Trackers)
	// @return: string[] | null - Tableau de lieux (ex: ["usa-new_york"]) ou null
	function getLocationsForArtist(artistId) {
		// Vérifier que les données sont chargées et ont la structure attendue
		// locationsData.index est le tableau contenant tous les artistes
		if (!locationsData || !locationsData.index) return null;
		
		// Trouver l'objet artiste correspondant à l'ID recherché
		// find() retourne le premier élément où la condition est vraie
		const artistLoc = locationsData.index.find(l => l.id === artistId);
		
		// Retourner le tableau locations si trouvé, sinon null
		// Opérateur ternaire : condition ? siVrai : siFaux
		return artistLoc ? artistLoc.locations : null;
	}

	// Récupérer la liste des dates de concerts pour un artiste donné
	// @param artistId: number - ID de l'artiste
	// @return: string[] | null - Tableau de dates (ex: ["*23-08-2019"]) ou null
	function getDatesForArtist(artistId) {
		// Vérifier la structure des données de dates
		if (!datesData || !datesData.index) return null;
		
		// Rechercher l'objet dates correspondant à cet artiste
		const artistDates = datesData.index.find(d => d.id === artistId);
		
		// Retourner le tableau de dates ou null si non trouvé
		return artistDates ? artistDates.dates : null;
	}

	// Récupérer les relations (mapping dates↔lieux) pour un artiste donné
	// @param artistId: number - ID de l'artiste
	// @return: object | null - Objet {"usa-new_york": ["*23-08-2019"], ...} ou null
	function getRelationsForArtist(artistId) {
		// Vérifier la structure des données de relations
		if (!relationsData || !relationsData.index) return null;
		
		// Rechercher l'objet relations correspondant à cet artiste
		const artistRel = relationsData.index.find(r => r.id === artistId);
		
		// Retourner l'objet datesLocations (clé = lieu, valeur = array de dates)
		return artistRel ? artistRel.datesLocations : null;
	}

	// ========================================================================
	// FONCTION PRINCIPALE : CHARGEMENT ET AFFICHAGE DES ARTISTES
	// ========================================================================
	// Cette fonction orchestrate le chargement de toutes les données nécessaires
	// (artistes + locations + dates + relations) et génère dynamiquement
	// les éléments HTML pour afficher les vinyles animés.
	// ========================================================================
	async function loadArtists() {
		// Charger les données supplémentaires en parallèle avec Promise.all()
		// Cela optimise le temps de chargement (3 requêtes simultanées au lieu de séquentielles)
		// Les catch individuels permettent de continuer même si une API échoue
		try {
			// Promise.all attend que toutes les promesses se résolvent
			await Promise.all([
				// Chaque .catch() empêche un échec individuel de bloquer les autres
				loadLocations().catch(e => console.warn('Locations load failed:', e)),
				loadDates().catch(e => console.warn('Dates load failed:', e)),
				loadRelations().catch(e => console.warn('Relations load failed:', e))
			]);
			
			// Message de succès si au moins une des API a réussi
			console.log('✅ All supplementary data loaded (or failed gracefully)');
		} catch (err) {
			// Ce catch ne devrait jamais se déclencher grâce aux catch internes
			// mais il est là par sécurité pour éviter un crash complet
			console.warn('⚠️ Some supplementary data failed to load, continuing...', err);
		}

		// Variable pour stocker les données artistes (tableau d'objets)
		let data;
		
		try {
			// Tentative de chargement depuis le proxy local (plus rapide, pas de CORS)
			console.log('📡 Fetching artists from local proxy...');
			data = await tryFetch(LOCAL_API);
			console.log('✅ Artists loaded from local proxy');
		} catch (err) {
			// Si le proxy local échoue, avertir et tenter le fallback
			console.warn('⚠️ Local proxy failed, trying remote API...', err);
			
			try {
				// Fallback : charger directement depuis l'API Groupie Trackers
				// Peut échouer à cause de CORS selon la configuration du navigateur
				data = await tryFetch(REMOTE_API);
				console.log('✅ Artists loaded from remote API');
			} catch (err2) {
				// Si les deux sources échouent, abandonner complètement
				// L'application ne peut pas fonctionner sans données d'artistes
				console.error('❌ Failed to load artists from both APIs', err, err2);
				// Utiliser le fallback local minimal pour afficher au moins 2 vinyles
				data = SAMPLE_ARTISTS;
			}
		}

		// Normaliser le format des données (gérer différentes structures de réponse)
		// Certaines API retournent un array direct, d'autres un objet {artists: [...]}
		const artists = Array.isArray(data) ? data : (data.artists || data);
		
		// Vérifier que nous avons bien des données d'artistes à afficher
		if (!artists || !artists.length) {
			console.error('❌ No artists data found');
			return; // abandonner si pas de données
		}

		// Message de succès avec le nombre d'artistes récupérés
		console.log(`✅ Found ${artists.length} artists, creating vinyl items...`);

		// Vider la grille de vinyles avant de la remplir (idempotent)
		// Permet de recharger les artistes sans duplication
		vinylGrid.innerHTML = '';

		// ====================================================================
		// BOUCLE PRINCIPALE : CRÉER UN ÉLÉMENT HTML POUR CHAQUE ARTISTE
		// ====================================================================
		// Pour chaque artiste, créer un vinyle cliquable avec :
		// - Image de l'artiste comme pochette
		// - Nom affiché en caption
		// - Audio préchargé depuis iTunes/Deezer
		// - Animation de rotation au survol
		// - Modal d'informations au clic
		// ====================================================================
		artists.forEach((a, idx) => {
			// Créer le conteneur principal du vinyle
			const item = document.createElement('div');
			
			// Classe CSS pour le layout et l'animation fade-in
			item.className = 'vinyl-item fade-in';
			
			// Délai d'animation échelonné : chaque vinyle apparaît 60ms après le précédent
			// Crée un effet de cascade visuel élégant (60ms = 0.06s)
			item.style.animationDelay = `${idx * 60}ms`;

			// Créer la frame (cadre rond) qui contient l'image et tourne au survol
			// Créer la frame (cadre rond) qui contient l'image et tourne au survol
			const frame = document.createElement('div');
			
			// Classe CSS qui applique la forme circulaire et les animations
			frame.className = 'vinyl-frame';

			// ================================================================
			// CRÉATION DE L'ÉLÉMENT AUDIO POUR CHAQUE VINYLE
			// ================================================================
			// Chaque vinyle a son propre <audio> préchargé avec une preview
			// iTunes (30s) ou Deezer (30s) qui se joue au survol prolongé.
			// ================================================================
			
			// Créer l'élément <audio> HTML5 pour ce vinyle
			const audio = document.createElement('audio');
			
			// preload='auto' : le navigateur télécharge l'audio en arrière-plan
			// Cela réduit la latence au moment de jouer la musique
			audio.preload = 'auto';
			
			// Volume à 85% pour ne pas être trop fort (0.85 sur échelle 0-1)
			audio.volume = 0.85;
			
			// crossOrigin='anonymous' : nécessaire pour charger des MP3 cross-domain
			// Sans cet attribut, les navigateurs bloquent les médias externes par sécurité
			audio.crossOrigin = 'anonymous';
			
			// Cacher visuellement l'élément audio (on n'affiche pas les contrôles natifs)
			audio.style.display = 'none';
			
			// Ajouter l'audio au DOM du vinyle (parent : item)
			item.appendChild(audio);
			
			// ================================================================
			// VARIABLES D'ÉTAT POUR LE CHARGEMENT AUDIO
			// ================================================================
			// Permettent de suivre si l'audio est prêt et d'éviter les requêtes
			// multiples simultanées vers iTunes/Deezer.
			// ================================================================
			
			// Indicateur : true si l'audio est complètement chargé et jouable
			let audioReady = false;
			
			// Indicateur : true si une requête de recherche musicale est en cours
			// Évite de lancer plusieurs fetch iTunes/Deezer en parallèle
			let audioLoading = false;
			
			// Écouteur d'événement : déclenché quand l'audio est prêt à jouer
			// canplaythrough = suffisamment de données chargées pour lecture fluide
			audio.addEventListener('canplaythrough', function() {
				// Marquer l'audio comme prêt
				audioReady = true;
				
				// Message de debug pour confirmer le chargement
				console.log('✅ Audio loaded and ready for:', a.name);
			});
			
			// Écouteur d'événement : déclenché en cas d'erreur de chargement audio
			// Causes possibles : CORS, URL invalide, format non supporté, réseau
			audio.addEventListener('error', function(e) {
				// Logger l'erreur complète pour debugging
				console.error('❌ Audio loading error for', a.name, ':', e);
				
				// Réinitialiser l'état prêt car l'audio a échoué
				audioReady = false;
			});
			
			// ================================================================
			// FONCTION DE RECHERCHE DE PREVIEW MUSICALE
			// ================================================================
			// Cherche une preview audio de 30s pour l'artiste donné en essayant
			// d'abord iTunes (meilleure qualité) puis Deezer en fallback.
			// Retourne l'URL HTTPS du MP3 ou null si aucune preview trouvée.
			// ================================================================
			
			// Fonction asynchrone qui retourne Promise<string | null>
			async function fetchMusicPreview(artistName) {
				// Si une recherche est déjà en cours, ne pas en lancer une autre
				// Évite les doublons et la surcharge de l'API
				if (audioLoading) return null;
				
				// Marquer qu'une recherche est en cours
				audioLoading = true;
				
				// Encoder le nom de l'artiste pour l'URL (remplace espaces, accents, etc.)
				// Exemple : "Foo Fighters" → "Foo%20Fighters"
				const encodedName = encodeURIComponent(artistName);
				
				// Message de debug pour tracer la recherche
				console.log('🎵 Searching music for:', artistName);
				
				// ============================================================
				// TENTATIVE 1 : API ITUNES (PRIORITAIRE)
				// ============================================================
				// iTunes offre des previews de 30s de haute qualité audio.
				// Format de l'API : https://itunes.apple.com/search?term=<artist>&entity=song&limit=1&media=music
				// ============================================================
				try {
					// Construire l'URL de recherche iTunes
					// entity=song : chercher uniquement des chansons (pas albums/artistes)
					// limit=1 : récupérer seulement le premier résultat (économise bande passante)
					// media=music : filtrer uniquement le contenu musical
					const itunesUrl = `https://itunes.apple.com/search?term=${encodedName}&entity=song&limit=1&media=music`;
					
					// Debug : afficher l'URL complète pour vérification
					console.log('📡 Fetching from iTunes:', itunesUrl);
					
					// Effectuer la requête HTTP vers iTunes
					const itunesRes = await fetch(itunesUrl);
					
					// Parser la réponse JSON
					const itunesData = await itunesRes.json();
					
					// Debug : afficher la structure de la réponse
					console.log('📦 iTunes response:', itunesData);
					
					// Vérifier si des résultats ont été trouvés
					// Structure attendue : {resultCount: 1, results: [{previewUrl: "..."}]}
					if (itunesData.results && itunesData.results.length > 0) {
						// Extraire l'URL de preview du premier résultat
						let preview = itunesData.results[0].previewUrl;
						
						// Vérifier que l'URL existe
						if (preview) {
							// Forcer HTTPS pour éviter les erreurs mixed content
							// Les navigateurs bloquent les requêtes HTTP depuis des pages HTTPS
							if (preview.startsWith('http://')) {
								preview = preview.replace('http://', 'https://');
							}
							
							// Succès : preview trouvée
							console.log('✅ iTunes preview found:', preview);
							
							// Libérer le verrou de chargement
							audioLoading = false;
							
							// Retourner l'URL HTTPS de la preview
							return `/api/audio-proxy?url=${encodeURIComponent(preview)}`;
						}
					}
					
					// Aucune preview trouvée dans les résultats iTunes
					console.log('⚠️ No iTunes results for:', artistName);
				} catch (err) {
					// Erreur lors de la requête iTunes (réseau, timeout, CORS, etc.)
					console.error('❌ iTunes API error:', err);
				}
				
				// ============================================================
				// TENTATIVE 2 : API DEEZER (FALLBACK)
				// ============================================================
				// Si iTunes échoue, essayer Deezer qui offre aussi des previews 30s.
				// Format de l'API : https://api.deezer.com/search?q=<artist>&limit=1
				// ============================================================
				try {
					// Construire l'URL de recherche Deezer
					// q= : paramètre de requête textuelle
					// limit=1 : récupérer seulement le premier résultat
					const deezerUrl = `https://api.deezer.com/search?q=${encodedName}&limit=1`;
					
					// Debug : afficher l'URL Deezer
					console.log('📡 Fetching from Deezer:', deezerUrl);
					
					// Effectuer la requête HTTP vers Deezer
					const deezerRes = await fetch(deezerUrl);
					
					// Parser la réponse JSON
					const deezerData = await deezerRes.json();
					
					// Debug : afficher la structure de la réponse
					console.log('📦 Deezer response:', deezerData);
					
					// Vérifier si des résultats ont été trouvés
					// Structure attendue : {data: [{preview: "..."}]}
					if (deezerData.data && deezerData.data.length > 0) {
						// Extraire l'URL de preview du premier résultat
						let preview = deezerData.data[0].preview;
						
						// Vérifier que l'URL existe
						if (preview) {
							// Forcer HTTPS pour la sécurité
							if (preview.startsWith('http://')) {
								preview = preview.replace('http://', 'https://');
							}
							
							// Succès : preview Deezer trouvée
							console.log('✅ Deezer preview found:', preview);
							
							// Libérer le verrou de chargement
							audioLoading = false;
							
							// Retourner l'URL HTTPS de la preview
							return `/api/audio-proxy?url=${encodeURIComponent(preview)}`;
						}
					}
					
					// Aucune preview trouvée dans les résultats Deezer
					console.log('⚠️ No Deezer results for:', artistName);
				} catch (err) {
					// Erreur lors de la requête Deezer (réseau, timeout, etc.)
					console.error('❌ Deezer API error:', err);
				}
				
				// ============================================================
				// ÉCHEC COMPLET : AUCUNE PREVIEW TROUVÉE
				// ============================================================
				// Si ni iTunes ni Deezer n'ont retourné de preview, on utilisera
				// le MP3 fallback par défaut (3s sample) défini plus haut.
				// ============================================================
				
				// Logger l'échec pour le monitoring
				console.warn('❌ No preview found for:', artistName);
				
				// Libérer le verrou de chargement
				audioLoading = false;
				
				// Retourner null pour signaler l'échec
				return null;
			}
			
			// ================================================================
			// PRÉCHARGEMENT IMMÉDIAT DE LA PREVIEW AUDIO
			// ================================================================
			// Dès que le vinyle est créé, lancer la recherche de preview en
			// arrière-plan pour que l'audio soit prêt quand l'utilisateur survole.
			// ================================================================
			
			// Lancer la recherche de preview pour cet artiste (asynchrone)
			// .then() s'exécutera quand la Promise fetchMusicPreview() se résout
			fetchMusicPreview(a.name || '').then(previewUrl => {
				// Si une preview a été trouvée (iTunes ou Deezer)
				if (previewUrl) {
					// Debug : confirmer l'URL récupérée
					console.log('🔗 Setting audio src:', previewUrl);
					
					// Assigner l'URL à l'élément <audio>
					audio.src = previewUrl;
					
					// Lancer le préchargement de l'audio (grâce à preload='auto')
					audio.load();
				} else {
					// Aucune preview trouvée, utiliser le fallback (sample 3s)
					console.warn('⚠️ No audio preview found, using fallback for:', a.name);
					
					// Assigner l'URL du MP3 fallback
					audio.src = FALLBACK_PREVIEW;
					
					// Charger le fallback
					audio.load();
				}
			});

			// ================================================================
			// CRÉATION DE L'IMAGE DE COUVERTURE (POCHETTE DU VINYLE)
			// ================================================================
			// L'image affichée au centre du vinyle, représentant l'artiste.
			// ================================================================
			
			// Créer l'élément <img> pour la pochette
			const cover = document.createElement('img');
			
			// Classe CSS pour le styling (border-radius, object-fit, etc.)
			cover.className = 'vinyl-cover';
			
			// Attribut alt pour l'accessibilité (lecteurs d'écran)
			cover.alt = a.name || '';
			
			// Utiliser l'image de l'artiste depuis l'API si disponible
			// Sinon, utiliser une image vinyle générique par défaut
			if (a.image) {
				cover.src = a.image; // URL de l'image artiste (ex: Groupie Trackers API)
			} else {
				cover.src = '/static/images/vinyle.png'; // Image par défaut
			}

			// Assembler les éléments : cover va dans frame, frame va dans item
			frame.appendChild(cover);
			item.appendChild(frame);

			// ================================================================
			// CRÉATION DE LA LÉGENDE (NOM DE L'ARTISTE)
			// ================================================================
			// Texte affiché sous le vinyle pour identifier l'artiste.
			// ================================================================
			
			// Créer le conteneur de caption
			const caption = document.createElement('div');
			
			// Classe CSS pour le styling du texte (font, color, etc.)
			caption.className = 'vinyl-caption';
			
			// Insérer le nom de l'artiste comme contenu textuel
			caption.textContent = a.name || '';
			
			// Ajouter la caption au vinyle
			item.appendChild(caption);

			// Ajouter le bouton favori
			if (window.favoriteManager) {
				const favoriteBtn = window.favoriteManager.createFavoriteButton(
					a.id, 
					a.name || '', 
					a.image || ''
				);
				favoriteBtn.className = 'favorite-btn vinyl-favorite-btn';
				item.appendChild(favoriteBtn);
			}

			// ================================================================
			// SYSTÈME DE LECTURE AUDIO AU SURVOL PROLONGÉ (2.5 SECONDES)
			// ================================================================
			// L'audio se joue automatiquement si l'utilisateur survole le vinyle
			// pendant plus de 2.5 secondes. Un seul audio peut jouer à la fois.
			// ================================================================
			
			// Variable d'état : true si l'audio est actuellement en train de jouer
			let isPlaying = false;
			
			// Variable d'état : true si une tentative de lecture est en cours (évite doublons)
			let playAttempted = false;
			
			// Référence au timer de survol (setTimeout) pour pouvoir l'annuler
			let hoverTimeout = null;
			
			// Changer le curseur en pointeur pour indiquer l'interactivité
			frame.style.cursor = 'pointer';
			
			// ================================================================
			// FONCTION POUR TENTER DE JOUER L'AUDIO
			// ================================================================
			// Gère le démarrage de la lecture avec retry et fallback.
			// ================================================================
			function tryPlayAudio() {
				// Debug : tracer la tentative de lecture
				console.log('🖱️ Attempting to play audio for:', a.name, 'Audio src:', audio.src, 'Ready:', audioReady);
				
				// Si aucune source audio n'est définie (chargement initial échoué)
				if (!audio.src) {
					// Message de debug
					console.log('⏳ No audio source, fetching now...');
					
					// Relancer une recherche de preview
					fetchMusicPreview(a.name || '').then(previewUrl => {
						// Si une preview est trouvée cette fois
						if (previewUrl) {
							audio.src = previewUrl;
							audio.load();
							// Wait a bit for metadata to load, then try to play
							setTimeout(() => {
								console.log('🔄 Retrying play after fetch...');
								tryPlayAudio();
							}, 500);
						} else {
							console.error('❌ Failed to fetch preview for:', a.name);
						}
					});
					return;
				}
				
				if (!isPlaying && !playAttempted) {
					playAttempted = true;
					console.log('▶️ Attempting to play audio for:', a.name);
					console.log('🔊 Audio element state:', {
						src: audio.src,
						readyState: audio.readyState,
						paused: audio.paused,
						volume: audio.volume,
						duration: audio.duration
					});

					// Stop any previously playing audio
					if (currentAudio && currentAudio !== audio) {
						try { 
							currentAudio.pause(); 
							currentAudio.currentTime = 0;
							console.log('⏹️ Stopped previous audio');
						} catch(_){}
						if (currentFrame) { currentFrame.classList.remove('playing'); }
					}
					
					const playPromise = audio.play();
					if (playPromise !== undefined) {
						playPromise
							.then(() => {
								isPlaying = true;
								playAttempted = false;
								frame.classList.add('playing');
								currentAudio = audio;
								currentFrame = frame;
								console.log('✅ Audio playing successfully for:', a.name);
							})
							.catch(err => {
								playAttempted = false;
								console.error('❌ Audio play failed for', a.name);
								console.error('Error details:', err);
								console.error('Audio state:', {
									src: audio.src,
									readyState: audio.readyState,
									networkState: audio.networkState,
									error: audio.error
								});
								// try fallback once if not already on fallback
								if (audio.src !== FALLBACK_PREVIEW) {
									console.warn('⚠️ Retrying with fallback audio for:', a.name);
									audio.src = FALLBACK_PREVIEW;
									audio.load();
									setTimeout(() => tryPlayAudio(), 300);
								}
							});
					}
				}
			}
			
			// Start timer on mouseenter
			frame.addEventListener('mouseenter', function () {
				console.log('🖱️ Mouse entered vinyl for:', a.name);
				hoverTimeout = setTimeout(() => {
					console.log('⏰ 2.5s hover elapsed, playing audio for:', a.name);
					tryPlayAudio();
				}, 2500); // 2.5 seconds
			});
			
			// Cancel timer on mouseleave and stop music
			frame.addEventListener('mouseleave', function () {
				console.log('🖱️ Mouse left vinyl for:', a.name);
				if (hoverTimeout) {
					clearTimeout(hoverTimeout);
					hoverTimeout = null;
				}
				// Stop music if it's playing
				if (isPlaying && currentAudio === audio) {
					audio.pause();
					audio.currentTime = 0;
					isPlaying = false;
					frame.classList.remove('playing');
					currentAudio = null;
					currentFrame = null;
					console.log('⏹️ Music stopped for:', a.name);
				}
			});
			
			// Click to open artist modal
			frame.addEventListener('click', function () {
				console.log('🖱️ Vinyl clicked for:', a.name);
				// Stop music if playing
				if (isPlaying) {
					audio.pause();
					audio.currentTime = 0;
					isPlaying = false;
					frame.classList.remove('playing');
					if (currentAudio === audio) { 
						currentAudio = null; 
						currentFrame = null; 
					}
				}
				// Cancel hover timer if active
				if (hoverTimeout) {
					clearTimeout(hoverTimeout);
					hoverTimeout = null;
				}
				openArtistModal(a);
			});

			vinylGrid.appendChild(item);
		});
	}

	// ========================================================================
	// MODAL D'ARTISTE : CONTENEUR GLOBAL ET FABRIQUE D'ÉLÉMENTS
	// ========================================================================
	// Le modal affiche les détails d'un artiste (membres, dates, lieux, relations)
	// Il est créé une seule fois puis réutilisé pour chaque artiste.
	// createEl() est une petite fabrique pour accélérer la création de nœuds DOM.

	// Référence globale vers le conteneur du modal (créé une seule fois)
	let modalEl = null;

	// Fabrique utilitaire pour créer des éléments DOM rapidement
	// @param tag: string - nom de la balise (ex: 'div', 'button')
	// @param className: string | undefined - classe(s) CSS à appliquer
	// @param text: string | undefined - texte à insérer comme contenu
	// @return: HTMLElement - l'élément créé et configuré
	function createEl(tag, className, text) {
		// Créer l'élément HTML demandé
		var el = document.createElement(tag);
		// Si une classe CSS est fournie, l'appliquer
		if (className) el.className = className;
		// Si un texte est fourni, le définir comme contenu (textContent)
		if (text) el.textContent = text;
		// Retourner l'élément prêt à être inséré dans le DOM
		return el;
	}

	// Construire (ou reconstruire) la structure du modal dans le DOM
	function createModal() {
		// Créer le conteneur principal du modal (overlay semi-transparent)
		modalEl = createEl('div', 'artist-modal');
		// ID unique pour ciblage CSS et accessibilité
		modalEl.id = 'artistModal';

		// Panneau central du modal qui contient le contenu
		var panel = createEl('div', 'artist-modal__panel');
		// Rôle ARIA pour indiquer un dialogue (modal)
		panel.setAttribute('role', 'dialog');
		// Indiquer que le dialogue est modal (bloque l'arrière-plan)
		panel.setAttribute('aria-modal', 'true');

		// Bouton de fermeture (croix ×)
		var closeBtn = createEl('button', 'artist-modal__close', '×');
		// Label ARIA pour décrire l'action
		closeBtn.setAttribute('aria-label', 'Fermer');
		// Fermer le modal au clic sur la croix
		closeBtn.addEventListener('click', hideModal);
		// Conserver une référence pour montrer/cacher dynamiquement (ex: vue détail)
		modalEl.closeBtn = closeBtn;

		// Conteneur du contenu du modal (head, body, sections)
		var content = createEl('div', 'artist-modal__content');

		// Assembler le panneau : bouton de fermeture + contenu
		panel.appendChild(closeBtn);
		panel.appendChild(content);
		// Ajouter le panneau au conteneur overlay
		modalEl.appendChild(panel);
		// Insérer le modal dans le <body> du document
		document.body.appendChild(modalEl);
		// Fermer le modal si on clique en dehors du panneau (sur l'overlay)
		modalEl.addEventListener('click', function (e) { if (e.target === modalEl) hideModal(); });
	}

	// Construire la liste des membres de l'artiste
	// @param membersArr: string[] | undefined - noms des membres
	// @return: HTMLElement - <ul> avec <li> pour chaque membre ou <em> si vide
	function buildMembersList(membersArr) {
		// Si pas de membres, retourner un texte informatif
		if (!membersArr || !membersArr.length) {
			var empty = createEl('em');
			empty.textContent = 'Aucun membre listé';
			return empty;
		}
		// Créer une liste non ordonnée
		var ul = createEl('ul', 'artist-members');
		// Ajouter chaque membre comme élément de liste
		membersArr.forEach(function (m) {
			ul.appendChild(createEl('li', '', m));
		});
		// Retourner la liste construite
		return ul;
	}

	// Construire une section d'information avec un titre et un contenu
	// @param title: string - Titre de la section (ex: 'Dates')
	// @param contentEl: HTMLElement | undefined - contenu à insérer
	// @return: HTMLElement - <section> prêt à être inséré
	function buildSection(title, contentEl) {
		var section = createEl('section', 'artist-section');
		// En-tête de section
		section.appendChild(createEl('h3', '', title));
		// Contenu optionnel
		if (contentEl) section.appendChild(contentEl);
		return section;
	}

	// Section des lieux de concerts pour un artiste
	function buildLocationsSection(artist) {
		// Récupérer la liste des lieux pour l'ID d'artiste
		var locations = getLocationsForArtist(artist.id);
		// Si aucune donnée, retourner une section avec message
		if (!locations || !locations.length) {
			return buildSection('Lieux de concerts', createEl('p', 'muted', 'Aucun lieu disponible pour cet artiste.'));
		}
		// Construire la liste des lieux
		var locList = createEl('ul', 'artist-locations');
		locations.forEach(function (loc) {
			// Transformer le nom brut (ex: 'usa-new_york') en libellé lisible
			locList.appendChild(createEl('li', '', formatLocationName(loc)));
		});
		// Retourner la section complète
		return buildSection('Lieux de concerts', locList);
	}

	// Section des dates de concerts pour un artiste
	function buildDatesSection(artist) {
		var artistDates = getDatesForArtist(artist.id);
		// Message si aucune date connue
		if (!artistDates || !artistDates.length) {
			return buildSection('Dates', createEl('p', 'muted', 'Aucune date connue pour cet artiste.'));
		}
		// Construire la liste des dates formattées
		var dateList = createEl('ul', 'artist-dates');
		artistDates.forEach(function (d) {
			dateList.appendChild(createEl('li', '', formatDateLabel(d)));
		});
		return buildSection('Dates', dateList);
	}

	// Section des relations dates↔lieux pour un artiste (groupées par lieu)
	function buildRelationsSection(artist) {
		var rel = getRelationsForArtist(artist.id);
		// Si aucune relation, afficher un message
		if (!rel || Object.keys(rel).length === 0) {
			return buildSection('Dates par lieu', createEl('p', 'muted', 'Aucune relation disponible.'));
		}
		// Conteneur global pour les groupes par lieu
		var relList = createEl('div', 'artist-relations');
		// Parcourir chaque clé de lieu (ex: 'usa-new_york')
		Object.keys(rel).forEach(function (locKey) {
			// Groupe pour ce lieu
			var group = createEl('div', 'artist-relations__group');
			// En-tête du groupe : libellé du lieu formaté
			group.appendChild(createEl('div', 'artist-relations__loc', formatLocationName(locKey)));
			// Tableau des dates pour ce lieu
			var datesArr = rel[locKey] || [];
			// Liste des dates
			var ul = createEl('ul', 'artist-relations__dates');
			datesArr.forEach(function (d) {
				ul.appendChild(createEl('li', '', formatDateLabel(d)));
			});
			// Assembler liste et groupe
			group.appendChild(ul);
			// Ajouter le groupe au conteneur global
			relList.appendChild(group);
		});
		// Retourner la section complète
		return buildSection('Dates par lieu', relList);
	}

	// Formater un nom de lieu brut ('usa-new_york') en libellé lisible ('Usa, New York')
	function formatLocationName(loc) {
		if (!loc) return '';
		// Remplacer les underscores par des espaces et les tirets par des virgules + espace
		var formatted = loc.replace(/_/g, ' ').replace(/-/g, ', ');
		// Capitaliser chaque mot (première lettre en majuscule)
		return formatted.split(' ').map(function (w) {
			return w ? w.charAt(0).toUpperCase() + w.slice(1) : '';
		}).join(' ');
	}

	// Formater une date brute (ex: '*23-08-2019') en libellé lisible ('23/08/2019')
	function formatDateLabel(dateStr) {
		if (!dateStr) return '';
		// Certains formats commencent par '*' : enlever ce préfixe si présent
		var clean = dateStr.replace(/^\*/, '');
		// Remplacer les tirets par des slashes pour un format plus courant
		return clean.replace(/-/g, '/');
	}

	// Ouvrir le modal et afficher les informations d'un artiste
	// @param artist: object - données de l'artiste depuis l'API Groupie Trackers
	function openArtistModal(artist) {
		// Créer le modal s'il n'existe pas encore (lazy init)
		if (!modalEl) createModal();
		// Récupérer le conteneur du contenu
		var panel = modalEl.querySelector('.artist-modal__content');
		// Nettoyer le contenu précédent (si un autre artiste a été affiché)
		while (panel.firstChild) panel.removeChild(panel.firstChild);

		// Normaliser le format des membres (Array<string>)
		var membersArr = Array.isArray(artist.members) ? artist.members : (artist.members ? [artist.members] : []);
		// En-tête visuel du modal (image + infos principales)
		var hero = createEl('div', 'artist-modal__hero');

		// Afficher l'image de l'artiste si disponible
		if (artist.image) {
			var cover = createEl('img', 'artist-cover');
			cover.src = artist.image;
			cover.alt = artist.name || '';
			hero.appendChild(cover);
		}

		// En-tête textuel : nom et année de création
		var head = createEl('div', 'artist-modal__head');
		head.appendChild(createEl('h2', '', artist.name || 'Artiste'));
		head.appendChild(createEl('p', 'muted', 'Année de création: ' + (artist.creationDate || '—')));
		hero.appendChild(head);

		// Corps du modal : vue principale + actions + vue détaillée
		var body = createEl('div', 'artist-modal__body');
		// Vue principale avec membres et premier album
		var mainView = createEl('div', 'artist-main');
		mainView.appendChild(createEl('h3', '', 'Membres'));
		mainView.appendChild(buildMembersList(membersArr));
		mainView.appendChild(createEl('p', '', 'Premier album: ' + (artist.firstAlbum || '—')));

		// Barre d'actions (boutons : Locations, Dates, Relations)
		var actions = createEl('div', 'artist-links');
		// Vue détaillée (cachée par défaut) qui affiche la section choisie
		var detail = createEl('div', 'artist-detail is-hidden');
		// En-tête de la vue détaillée (bouton retour + titre)
		var detailHeader = createEl('div', 'artist-detail__head');
		var backBtn = createEl('button', 'artist-link-btn artist-link-btn--ghost', 'Retour');
		var detailTitle = createEl('h3', '', '');
		var detailContent = createEl('div', 'artist-detail__content');

		// Fonction pour revenir à la vue principale
		function showMain() {
			mainView.classList.remove('is-hidden');
			actions.classList.remove('is-hidden');
			detail.classList.add('is-hidden');
			hero.classList.remove('is-hidden');
			// Réafficher le bouton de fermeture du modal (masqué en vue détail)
			if (modalEl.closeBtn) modalEl.closeBtn.classList.remove('is-hidden');
		}

		// Définir le type et le comportement du bouton retour
		backBtn.type = 'button';
		backBtn.addEventListener('click', function () {
			showMain();
			// Retirer le focus du bouton pour améliorer l'UX
			backBtn.blur();
		});

		// Assembler l'en-tête de la vue détaillée
		detailHeader.appendChild(backBtn);
		detailHeader.appendChild(detailTitle);
		detail.appendChild(detailHeader);
		// Conteneur où sera injectée la section choisie
		detail.appendChild(detailContent);

		// Ajouter un bouton d'information et son comportement d'affichage
		function addInfoButton(label, key, builder) {
			var btn = createEl('button', 'artist-link-btn', label);
			btn.type = 'button';
			btn.addEventListener('click', function () {
				// Construire la section via le builder (ex: buildLocationsSection)
				var section = builder();
				// Si aucune donnée, afficher un message générique
				if (!section) {
					section = buildSection(label, createEl('p', 'muted', 'Données indisponibles pour cet artiste.'));
				}
				// Mettre à jour le titre de la vue détaillée
				detailTitle.textContent = label;
				// Vider le contenu détaillé avant d'insérer la nouvelle section
				while (detailContent.firstChild) detailContent.removeChild(detailContent.firstChild);
				// Insérer la section construite
				detailContent.appendChild(section);
				// Basculer l'affichage : cacher la vue principale et montrer la vue détail
				mainView.classList.add('is-hidden');
				actions.classList.add('is-hidden');
				detail.classList.remove('is-hidden');
				// Cacher l'en-tête visuel (image et infos) pour focaliser sur le détail
				hero.classList.add('is-hidden');
				// Cacher la croix de fermeture pour éviter conflit avec le bouton retour
				if (modalEl.closeBtn) modalEl.closeBtn.classList.add('is-hidden');
				// Mettre le focus sur le bouton retour pour accessibilité clavier
				backBtn.focus();
			});
			// Ajouter le bouton à la barre d'actions
			actions.appendChild(btn);
		}

		// Créer les trois boutons d'information
		addInfoButton('Locations', 'locations', function () { return buildLocationsSection(artist); });
		addInfoButton('Dates', 'dates', function () { return buildDatesSection(artist); });
		addInfoButton('Relations', 'relations', function () { return buildRelationsSection(artist); });

		// Assembler le corps du modal
		body.appendChild(mainView);
		body.appendChild(actions);
		body.appendChild(detail);

		// Injecter l'en-tête visuel et le corps dans le contenu du modal
		panel.appendChild(hero);
		panel.appendChild(body);
		// Ouvrir le modal (classe CSS 'open' affiche l'overlay)
		modalEl.classList.add('open');
	}

	// Fermer le modal en retirant la classe 'open'
	function hideModal() {
		if (modalEl) modalEl.classList.remove('open');
	}

	// Charger les artistes et initialiser la grille de vinyles
	// Appelé à la fin de DOMContentLoaded pour démarrer l'application
	loadArtists();
	});

