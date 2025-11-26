
document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('searchForm');
	const results = document.getElementById('results');

	if (!form) return;

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const q = document.getElementById('query').value.trim();
		if (!q) return;
		results.innerHTML = '<p>Recherche en cours…</p>';

		try {
			const resp = await fetch('/api/search?artist=' + encodeURIComponent(q), { headers: { 'Accept': 'application/json' } });
			if (!resp.ok) throw new Error('Réponse réseau incorrecte: ' + resp.status);
			const data = await resp.json();

			if (!Array.isArray(data) || data.length === 0) {
				results.innerHTML = '<p>Aucun artiste trouvé.</p>';
				return;
			}

			results.innerHTML = data.map(renderArtist).join('');
		} catch (err) {
			results.innerHTML = `<p>Erreur lors de la recherche: ${escapeHtml(err.message)}</p>`;
		}
	});

	function renderArtist(artist) {
		const name = escapeHtml(artist.name || '—');
		const city = artist.city ? `<p>Ville: ${escapeHtml(artist.city)}</p>` : '';
		const genre = artist.genre ? `<p>Genre: ${escapeHtml(artist.genre)}</p>` : '';
		const link = artist.link ? `<p><a href="${escapeAttr(artist.link)}" target="_blank" rel="noopener noreferrer">Profil / site</a></p>` : '';
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

