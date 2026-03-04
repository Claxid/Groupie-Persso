// favorites.js - Gestion de la page des favoris

document.addEventListener('DOMContentLoaded', async () => {
    const resultsContainer = document.getElementById('favorites-results');
    const noFavoritesDiv = document.getElementById('no-favorites');
    const countDiv = document.getElementById('favorites-count');

    // Récupération des favoris depuis l'API
    async function loadFavorites() {
        try {
            const response = await fetch('/api/favorites');
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des favoris');
            }
            const favorites = await response.json();
            displayFavorites(favorites);
        } catch (error) {
            console.error('Erreur:', error);
            resultsContainer.innerHTML = '<p class="error">Erreur lors du chargement des favoris. Assurez-vous que la base de données est configurée.</p>';
        }
    }

    // Affichage des favoris
    function displayFavorites(favorites) {
        if (!favorites || favorites.length === 0) {
            resultsContainer.style.display = 'none';
            noFavoritesDiv.style.display = 'block';
            countDiv.textContent = '';
            return;
        }

        resultsContainer.style.display = 'grid';
        noFavoritesDiv.style.display = 'none';
        countDiv.textContent = `${favorites.length} artiste${favorites.length > 1 ? 's' : ''} en favoris`;

        resultsContainer.innerHTML = '';
        
        favorites.forEach(favorite => {
            const card = createArtistCard(favorite);
            resultsContainer.appendChild(card);
        });
    }

    // Création d'une carte artiste
    function createArtistCard(favorite) {
        const card = document.createElement('article');
        card.className = 'artist-card visible';
        card.dataset.artistId = favorite.artist_id;

        // Image
        if (favorite.artist_image) {
            const media = document.createElement('div');
            media.className = 'artist-media';
            const img = document.createElement('img');
            img.src = favorite.artist_image;
            img.alt = `Photo de ${favorite.artist_name}`;
            img.loading = 'lazy';
            media.appendChild(img);
            card.appendChild(media);
        }

        // Corps de la carte
        const body = document.createElement('div');
        body.className = 'artist-body';

        const h2 = document.createElement('h2');
        h2.textContent = favorite.artist_name;
        body.appendChild(h2);

        // Date d'ajout
        const dateAdded = document.createElement('p');
        dateAdded.className = 'artist-meta';
        const date = new Date(favorite.created_at);
        dateAdded.textContent = `Ajouté le ${date.toLocaleDateString('fr-FR')}`;
        body.appendChild(dateAdded);

        // Bouton supprimer
        const removeBtn = document.createElement('button');
        removeBtn.className = 'favorite-btn active';
        removeBtn.innerHTML = '❤️ Retirer des favoris';
        removeBtn.setAttribute('aria-label', 'Retirer des favoris');
        removeBtn.onclick = async (e) => {
            e.stopPropagation();
            await removeFavorite(favorite.artist_id, card);
        };
        body.appendChild(removeBtn);

        card.appendChild(body);
        return card;
    }

    // Suppression d'un favori
    async function removeFavorite(artistId, cardElement) {
        try {
            const response = await fetch(`/api/favorites?artist_id=${artistId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression');
            }

            // Animation de suppression
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                cardElement.remove();
                // Recharger pour mettre à jour le compteur
                loadFavorites();
            }, 300);

        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la suppression du favori');
        }
    }

    // Chargement initial
    loadFavorites();
});
