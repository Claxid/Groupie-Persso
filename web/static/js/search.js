
document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('searchForm');
	const results = document.getElementById('results');
	const input = document.getElementById('query');

	async function performSearch(q) {
		if (!results) return;
		results.innerHTML = '<p>Recherche en cours…</p>';
		try {
			// Use the proxy that exists in main.go to avoid CORS and remote issues
			const resp = await fetch('/api/artists-proxy', { headers: { 'Accept': 'application/json' } });
			if (!resp.ok) throw new Error('Réponse réseau incorrecte: ' + resp.status);
			const data = await resp.json();

			if (!Array.isArray(data) || data.length === 0) {
				results.innerHTML = '<p>Aucun artiste disponible depuis l\'API.</p>';
				return;
			}

			const qLower = String(q || '').toLowerCase();
			const filtered = qLower
				? data.filter(a => (a.name || '').toLowerCase().includes(qLower))
				: data.slice(0, 20);

			if (filtered.length === 0) {
				results.innerHTML = '<p>Aucun artiste trouvé.</p>';
				return;
			}

			results.innerHTML = filtered.map(renderArtist).join('');
		} catch (err) {
			results.innerHTML = `<p>Erreur lors de la recherche: ${escapeHtml(err.message)}</p>`;
		}
	}

	if (form) {
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			const q = (input && input.value || '').trim();
			if (!q) return;
			performSearch(q);
		});
	}

	// If the page was opened with a query param (?q=...), run the search automatically
	if (typeof window !== 'undefined') {
		const params = new URLSearchParams(window.location.search);
		const q = params.get('q') || params.get('artist');
		if (q) {
			if (input) input.value = q;
			performSearch(q);
		}
	}

	function renderArtist(artist) {
		const name = escapeHtml(artist.name || '—');
		// remote API might have 'location' or 'city' fields; attempt common keys
		const city = (artist.city || artist.location || artist.place) ? `<p>Ville: ${escapeHtml(artist.city || artist.location || artist.place)}</p>` : '';
		const genre = artist.genre ? `<p>Genre: ${escapeHtml(artist.genre)}</p>` : '';
		const link = artist.url || artist.website || artist.link ? `<p><a href="${escapeAttr(artist.url || artist.website || artist.link)}" target="_blank" rel="noopener noreferrer">Profil / site</a></p>` : '';
		return `\n<article class="artist">\n  <h2>${name}</h2>\n  ${city}\n  ${genre}\n  ${link}\n</article>`;
	}

	function escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function escapeAttr(s) {
		return escapeHtml(s).replace(/"/g, '&quot;');
	}
});

