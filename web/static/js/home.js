// home.js - Charge et affiche les artistes sur la page d'accueil
document.addEventListener('DOMContentLoaded', async () => {
	const artistsGrid = document.getElementById('artistsGrid');
	if (!artistsGrid) return;

	try {
		// Charger les artistes depuis l'API
		const response = await fetch('/api/artists-proxy');
		if (!response.ok) {
			throw new Error(`Erreur HTTP: ${response.status}`);
		}

		const artists = await response.json();
		
		if (!Array.isArray(artists) || artists.length === 0) {
			artistsGrid.innerHTML = '<p>Aucun artiste disponible pour le moment.</p>';
			return;
		}

		// Afficher les 12 premiers artistes
		const displayArtists = artists.slice(0, 12);
		artistsGrid.innerHTML = '';

		displayArtists.forEach((artist, idx) => {
			const card = document.createElement('article');
			card.className = 'artist-card';

			// Image de l'artiste
			const imageUrl = artist.image || artist.imageUrl || artist.picture || artist.photo || artist.thumbnail || artist.img || artist.thumb || artist.image_url || artist.photo_url || artist.avatar;
			if (imageUrl) {
				const media = document.createElement('div');
				media.className = 'artist-media';
				const img = document.createElement('img');
				img.src = imageUrl;
				img.alt = `Photo de ${artist.name || ''}`;
				img.loading = 'lazy';
				media.appendChild(img);
				card.appendChild(media);
			}

			// Corps de la carte
			const body = document.createElement('div');
			body.className = 'artist-body';
			
			const h2 = document.createElement('h2');
			h2.textContent = artist.name || '—';
			body.appendChild(h2);

			// Année de création
			const creationYear = artist.creationDate || artist.creation_date;
			if (creationYear) {
				const p = document.createElement('p');
				p.className = 'artist-meta';
				p.textContent = `Créé en ${creationYear}`;
				body.appendChild(p);
			}

			// Premier album
			const firstAlbum = artist.firstAlbum || artist.first_album;
			if (firstAlbum) {
				const p = document.createElement('p');
				p.className = 'artist-meta';
				p.textContent = `Premier album: ${firstAlbum}`;
				body.appendChild(p);
			}

			// Membres
			const members = artist.members;
			if (members && Array.isArray(members)) {
				const p = document.createElement('p');
				p.className = 'artist-meta';
				p.textContent = `${members.length} membre(s)`;
				body.appendChild(p);
			}

			card.appendChild(body);
			artistsGrid.appendChild(card);

			// Animation d'apparition progressive
			requestAnimationFrame(() => {
				setTimeout(() => {
					card.classList.add('visible');
				}, idx * 50);
			});
		});

		// Ajouter un bouton "Voir plus" si il y a plus de 12 artistes
		if (artists.length > 12) {
			const moreBtn = document.createElement('div');
			moreBtn.className = 'more-artists-btn';
			moreBtn.innerHTML = '<a href="/search.html" class="btn">Voir tous les artistes</a>';
			artistsGrid.appendChild(moreBtn);
		}

	} catch (error) {
		console.error('Erreur lors du chargement des artistes:', error);
		artistsGrid.innerHTML = '<p>Erreur lors du chargement des artistes. Veuillez réessayer plus tard.</p>';
	}
});

function escapeHtml(text) {
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return String(text || '').replace(/[&<>"']/g, m => map[m]);
}
