document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('searchForm');
	const results = document.getElementById('results');
	const input = document.getElementById('query');
	const suggestionsEl = document.getElementById('suggestions');
	const quickFilters = document.getElementById('quickFilters');
	const clearBtn = document.getElementById('clearSearch');

	let allArtists = [];
	let activeFilter = null;
	let modalEl = null;
	let modalBackdrop = null;

	function ensureModal() {
		if (modalEl) return;
		modalBackdrop = document.createElement('div');
		modalBackdrop.className = 'search-modal-backdrop';
		modalEl = document.createElement('div');
		modalEl.className = 'search-modal';

		const closeBtn = document.createElement('button');
		closeBtn.className = 'search-modal__close';
		closeBtn.textContent = '×';
		closeBtn.addEventListener('click', hideModal);

		const content = document.createElement('div');
		content.className = 'search-modal__content';
		modalEl.appendChild(closeBtn);
		modalEl.appendChild(content);

		modalBackdrop.appendChild(modalEl);
		document.body.appendChild(modalBackdrop);

		modalBackdrop.addEventListener('click', (e) => {
			if (e.target === modalBackdrop) hideModal();
		});
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') hideModal();
		});
	}

	function hideModal() {
		if (modalBackdrop) modalBackdrop.classList.remove('open');
	}

	function renderModalContent(artist) {
		if (!modalEl) return;
		const content = modalEl.querySelector('.search-modal__content');
		if (!content) return;
		content.innerHTML = '';

		const header = document.createElement('div');
		header.className = 'search-modal__header';
		const h2 = document.createElement('h2');
		h2.textContent = artist.name || 'Artiste';
		header.appendChild(h2);

		if (artist.creationDate || artist.firstAlbum) {
			const meta = document.createElement('p');
			meta.className = 'search-modal__meta';
			const creation = artist.creationDate ? `Création: ${artist.creationDate}` : '';
			const album = artist.firstAlbum ? `Premier album: ${artist.firstAlbum}` : '';
			meta.textContent = [creation, album].filter(Boolean).join(' — ');
			header.appendChild(meta);
		}

		if (artist.image) {
			const imgWrap = document.createElement('div');
			imgWrap.className = 'search-modal__media';
			const img = document.createElement('img');
			img.src = artist.image;
			img.alt = artist.name || '';
			img.loading = 'lazy';
			imgWrap.appendChild(img);
			content.appendChild(imgWrap);
		}

		content.appendChild(header);

		const members = Array.isArray(artist.members) ? artist.members : [];
		const info = document.createElement('div');
		info.className = 'search-modal__info';
		if (members.length) {
			const title = document.createElement('h3');
			title.textContent = 'Membres';
			info.appendChild(title);
			const ul = document.createElement('ul');
			ul.className = 'search-modal__list';
			members.forEach(m => {
				const li = document.createElement('li');
				li.textContent = m;
				ul.appendChild(li);
			});
			info.appendChild(ul);
		}

		content.appendChild(info);

		const links = document.createElement('div');
		links.className = 'search-modal__links';
		const official = artist.url || artist.website || artist.link;
		if (official) {
			const a = document.createElement('a');
			a.href = official;
			a.target = '_blank';
			a.rel = 'noopener noreferrer';
			a.textContent = 'Ouvrir le site officiel';
			links.appendChild(a);
		}
		content.appendChild(links);
	}

	function showModal(artist) {
		ensureModal();
		renderModalContent(artist);
		if (modalBackdrop) modalBackdrop.classList.add('open');
	}

	async function ensureData() {
		if (allArtists.length) return allArtists;

		async function fetchArtists(url) {
			const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
			if (!resp.ok) throw new Error('Réponse réseau incorrecte: ' + resp.status);
			return resp.json();
		}

		let data;
		try {
			data = await fetchArtists('/api/artists-proxy');
		} catch (err) {
			// Fallback direct vers l'API publique si le proxy n'est pas dispo (Netlify/statique)
			try {
				data = await fetchArtists('https://groupietrackers.herokuapp.com/api/artists');
			} catch (fallbackErr) {
				throw fallbackErr;
			}
		}

		allArtists = Array.isArray(data) ? data : (data.artists || []);
		return allArtists;
	}

	function filterByBadge(artist, filterId) {
		if (!filterId) return true;
		const name = (artist.name || '').toLowerCase();
		const creation = Number(artist.creationDate || artist.creation_date || 0);
		const albumYear = parseInt((artist.firstAlbum || '').slice(-4), 10);
		const location = ((artist.country || artist.location || artist.place || '') + '').toLowerCase();

		switch (filterId) {
			case 'rock':
				return /rock|metal|punk|roll/.test(name);
			case 'seventies':
				return (creation >= 1970 && creation < 1980) || (albumYear >= 1970 && albumYear < 1980);
			case 'usa':
				if (!location) return true; // pas d'info, on n'exclut pas
				return /(usa|united states|new york|los angeles|california)/.test(location);
			case 'month':
				// pas de dates précises dans l'API de base : on conserve mais on limite
				return true;
			default:
				return true;
		}
	}

	function renderResults(list) {
		if (!results) return;
		results.innerHTML = '';
		if (!list.length) {
			results.innerHTML = '<p>Aucun artiste trouvé.</p>';
			return;
		}

		list.forEach((artist, idx) => {
			const card = document.createElement('article');
			card.className = 'artist-card';
			card.tabIndex = 0;
			card.setAttribute('role','button');

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

			const body = document.createElement('div');
			body.className = 'artist-body';
			const h2 = document.createElement('h2');
			h2.textContent = artist.name || '—';
			body.appendChild(h2);

			const cityVal = artist.city || artist.location || artist.place;
			if (cityVal) {
				const p = document.createElement('p');
				p.className = 'artist-meta';
				p.textContent = cityVal;
				body.appendChild(p);
			}

			const genreVal = artist.genre;
			if (genreVal) {
				const p = document.createElement('p');
				p.className = 'artist-meta';
				p.textContent = genreVal;
				body.appendChild(p);
			}

			const linkUrl = artist.url || artist.website || artist.link;
			if (linkUrl) {
				const p = document.createElement('p');
				p.className = 'artist-link';
				const a = document.createElement('a');
				a.href = linkUrl;
				a.target = '_blank';
				a.rel = 'noopener noreferrer';
				a.textContent = 'Profil / site';
				p.appendChild(a);
				body.appendChild(p);
			}

			card.appendChild(body);
			results.appendChild(card);

			card.addEventListener('click', () => showModal(artist));
			card.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					showModal(artist);
				}
			});

			// micro fade-in
			requestAnimationFrame(() => {
				setTimeout(() => { card.classList.add('visible'); }, idx * 40);
			});
		});
	}

	async function performSearch(q) {
		if (!results) return;
		results.innerHTML = '<p>Recherche en cours…</p>';
		try {
			const data = await ensureData();
			if (!Array.isArray(data) || data.length === 0) {
				results.innerHTML = '<p>Aucun artiste disponible depuis l\'API.</p>';
				return;
			}

			const qLower = String(q || '').toLowerCase();
			let filtered = qLower
				? data.filter(a => (a.name || '').toLowerCase().includes(qLower))
				: data.slice(0, 24);

			filtered = filtered.filter(a => filterByBadge(a, activeFilter));

			if (filtered.length === 0) {
				results.innerHTML = '<p>Aucun artiste trouvé.</p>';
				return;
			}

			renderResults(filtered);
		} catch (err) {
			results.innerHTML = `<p>Erreur lors de la recherche: ${escapeHtml(err.message)}</p>`;
		}
	}

	function updateSuggestions() {
		if (!suggestionsEl || !input) return;
		const q = input.value.trim().toLowerCase();
		if (q.length < 2 || !allArtists.length) {
			suggestionsEl.classList.remove('show');
			suggestionsEl.innerHTML = '';
			return;
		}
		const matches = allArtists
			.filter(a => (a.name || '').toLowerCase().startsWith(q))
			.slice(0, 5);
		if (!matches.length) {
			suggestionsEl.classList.remove('show');
			suggestionsEl.innerHTML = '';
			return;
		}
		suggestionsEl.innerHTML = '';
		matches.forEach(m => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.textContent = m.name || '';
			btn.addEventListener('click', () => {
				input.value = m.name || '';
				suggestionsEl.classList.remove('show');
				performSearch(input.value.trim());
			});
			suggestionsEl.appendChild(btn);
		});
		suggestionsEl.classList.add('show');
	}

	function setActiveFilter(id) {
		activeFilter = id === activeFilter ? null : id;
		if (!quickFilters) return;
		quickFilters.querySelectorAll('.chip').forEach(chip => {
			const isActive = chip.dataset.filter === activeFilter;
			chip.classList.toggle('active', isActive);
		});
		performSearch(input ? input.value.trim() : '');
	}

	if (quickFilters) {
		quickFilters.addEventListener('click', (e) => {
			const btn = e.target.closest('[data-filter]');
			if (!btn) return;
			setActiveFilter(btn.dataset.filter);
		});
	}

	if (input) {
		input.addEventListener('input', () => {
			ensureData().then(updateSuggestions).catch(() => {});
		});
		input.addEventListener('focus', () => {
			ensureData().then(updateSuggestions).catch(() => {});
		});
		document.addEventListener('click', (e) => {
			if (!suggestionsEl) return;
			if (!suggestionsEl.contains(e.target) && e.target !== input) {
				suggestionsEl.classList.remove('show');
			}
		});
	}

	if (form) {
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			const q = (input && input.value || '').trim();
			performSearch(q);
		});
	}

	if (clearBtn) {
		clearBtn.addEventListener('click', () => {
			if (input) input.value = '';
			suggestionsEl && suggestionsEl.classList.remove('show');
			activeFilter = null;
			if (quickFilters) quickFilters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
			results.innerHTML = '<p>Entrez un nom ou utilisez un filtre pour voir les résultats.</p>';
		});
	}

	// If the page was opened with a query param (?q=...), run the search automatically
	if (typeof window !== 'undefined') {
		const params = new URLSearchParams(window.location.search);
		const q = params.get('q') || params.get('artist');
		if (q) {
			if (input) input.value = q;
			ensureData().then(() => performSearch(q));
		} else {
			// prefetch data to enable instant suggestions
			ensureData().catch(() => {});
		}
	}

	function escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
});

