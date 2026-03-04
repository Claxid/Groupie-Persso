// favorite-manager.js - Gestionnaire global des favoris

class FavoriteManager {
    constructor() {
        this.favorites = new Set();
        this.initialized = false;
    }

    // Initialiser en chargeant les favoris existants
    async init() {
        if (this.initialized) return;
        try {
            const response = await fetch('/api/favorites');
            if (response.ok) {
                const favs = await response.json();
                this.favorites = new Set(favs.map(f => f.artist_id));
                this.initialized = true;
                console.log('✅ Favoris chargés:', this.favorites.size);
            }
        } catch (error) {
            console.warn('⚠️ Impossible de charger les favoris:', error);
        }
    }

    // Vérifier si un artiste est en favori
    isFavorite(artistId) {
        return this.favorites.has(artistId);
    }

    // Ajouter un artiste aux favoris
    async addFavorite(artistId, artistName, artistImage) {
        try {
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    artist_id: artistId,
                    artist_name: artistName,
                    artist_image: artistImage
                })
            });

            if (response.ok) {
                this.favorites.add(artistId);
                console.log('✅ Artiste ajouté aux favoris:', artistName);
                return true;
            } else {
                console.error('❌ Erreur lors de l\'ajout aux favoris');
                return false;
            }
        } catch (error) {
            console.error('❌ Erreur réseau:', error);
            return false;
        }
    }

    // Retirer un artiste des favoris
    async removeFavorite(artistId) {
        try {
            const response = await fetch(`/api/favorites?artist_id=${artistId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.favorites.delete(artistId);
                console.log('✅ Artiste retiré des favoris');
                return true;
            } else {
                console.error('❌ Erreur lors du retrait des favoris');
                return false;
            }
        } catch (error) {
            console.error('❌ Erreur réseau:', error);
            return false;
        }
    }

    // Basculer l'état favori
    async toggleFavorite(artistId, artistName, artistImage) {
        if (this.isFavorite(artistId)) {
            return await this.removeFavorite(artistId);
        } else {
            return await this.addFavorite(artistId, artistName, artistImage);
        }
    }

    // Créer un bouton favori pour une carte artiste
    createFavoriteButton(artistId, artistName, artistImage) {
        const btn = document.createElement('button');
        btn.className = 'favorite-btn';
        btn.setAttribute('aria-label', 'Ajouter aux favoris');
        btn.dataset.artistId = artistId;

        const updateButtonState = () => {
            if (this.isFavorite(artistId)) {
                btn.classList.add('active');
                btn.innerHTML = '❤️';
                btn.setAttribute('aria-label', 'Retirer des favoris');
                btn.title = 'Retirer des favoris';
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '🤍';
                btn.setAttribute('aria-label', 'Ajouter aux favoris');
                btn.title = 'Ajouter aux favoris';
            }
        };

        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const success = await this.toggleFavorite(artistId, artistName, artistImage);
            if (success) {
                updateButtonState();
                
                // Animation de feedback
                btn.style.transform = 'scale(1.3)';
                setTimeout(() => {
                    btn.style.transform = 'scale(1)';
                }, 200);
            } else {
                alert('Erreur: Impossible de mettre à jour les favoris. Vérifiez que la base de données est configurée.');
            }
        });

        updateButtonState();
        return btn;
    }
}

// Instance globale
window.favoriteManager = new FavoriteManager();

// Auto-initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.favoriteManager.init();
});
