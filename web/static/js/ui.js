// Minimal UI helpers: mobile nav toggle and smooth-scroll
document.addEventListener('DOMContentLoaded', function () {
	var nav = document.getElementById('mainNav');
	if (!nav) return;

	// Create toggle button for small screens
	var toggle = document.createElement('button');
	toggle.id = 'menuToggle';
	toggle.className = 'menu-toggle';
	toggle.setAttribute('aria-expanded','false');
	toggle.setAttribute('aria-label','Ouvrir le menu');
	toggle.textContent = '\u2630'; // simple hamburger

	var headerContainer = nav.parentElement;
	if (headerContainer) headerContainer.appendChild(toggle);

	function updateNavVisibility() {
		if (window.innerWidth < 700) {
			if (!nav.dataset.init) {
				// start collapsed on small screens
				nav.style.display = 'none';
				nav.dataset.init = 'true';
			}
		} else {
			nav.style.display = 'flex';
			toggle.setAttribute('aria-expanded','false');
		}
	}

	toggle.addEventListener('click', function () {
		var showing = nav.style.display !== 'none';
		if (showing) {
			nav.style.display = 'none';
			toggle.setAttribute('aria-expanded','false');
		} else {
			nav.style.display = 'flex';
			toggle.setAttribute('aria-expanded','true');
		}
	});

	// Smooth scroll for internal links
	document.querySelectorAll('a[href^="#"]').forEach(function (a) {
		a.addEventListener('click', function (e) {
			var tgt = document.querySelector(this.getAttribute('href'));
			if (tgt) {
				e.preventDefault();
				tgt.scrollIntoView({behavior:'smooth'});
			}
		});
	});

	window.addEventListener('resize', updateNavVisibility);
	updateNavVisibility();
});

// --- Vinyls: fetch artists and bind to decorative vinyl elements ---
document.addEventListener('DOMContentLoaded', function () {
	const LOCAL_API = '/api/artists-proxy';
	const REMOTE_API = 'https://groupietrackers.herokuapp.com/api/artists';
	const LOCAL_LOCATIONS_API = '/api/locations-proxy';
	const REMOTE_LOCATIONS_API = 'https://groupietrackers.herokuapp.com/api/locations';
	const LOCAL_DATES_API = '/api/dates-proxy';
	const REMOTE_DATES_API = 'https://groupietrackers.herokuapp.com/api/dates';
	const LOCAL_RELATIONS_API = '/api/relations-proxy';
	const REMOTE_RELATIONS_API = 'https://groupietrackers.herokuapp.com/api/relation';
	const vinylGrid = document.querySelector('.vinyl-area .vinyl-grid');
	if (!vinylGrid) return;

	let locationsData = null;
	let datesData = null;
	let relationsData = null;

	async function tryFetch(url) {
		const res = await fetch(url, {cache: 'no-store'});
		if (!res.ok) throw new Error('API response ' + res.status);
		return res.json();
	}

	async function loadLocations() {
		try {
			locationsData = await tryFetch(LOCAL_LOCATIONS_API);
		} catch (err) {
			// fallback to remote API if local proxy fails
			try {
				locationsData = await tryFetch(REMOTE_LOCATIONS_API);
			} catch (err2) {
				console.warn('Failed to load locations from both proxy and remote API', err, err2);
			}
		}
	}

	async function loadDates() {
		try {
			datesData = await tryFetch(LOCAL_DATES_API);
		} catch (err) {
			try {
				datesData = await tryFetch(REMOTE_DATES_API);
			} catch (err2) {
				console.warn('Failed to load dates from both proxy and remote API', err, err2);
			}
		}
	}

	async function loadRelations() {
		try {
			relationsData = await tryFetch(LOCAL_RELATIONS_API);
		} catch (err) {
			try {
				relationsData = await tryFetch(REMOTE_RELATIONS_API);
			} catch (err2) {
				console.warn('Failed to load relations from both proxy and remote API', err, err2);
			}
		}
	}

	function getLocationsForArtist(artistId) {
		if (!locationsData || !locationsData.index) return null;
		const artistLoc = locationsData.index.find(l => l.id === artistId);
		return artistLoc ? artistLoc.locations : null;
	}

	function getDatesForArtist(artistId) {
		if (!datesData || !datesData.index) return null;
		const artistDates = datesData.index.find(d => d.id === artistId);
		return artistDates ? artistDates.dates : null;
	}

	function getRelationsForArtist(artistId) {
		if (!relationsData || !relationsData.index) return null;
		const artistRel = relationsData.index.find(r => r.id === artistId);
		return artistRel ? artistRel.datesLocations : null;
	}

	async function loadArtists() {
		// Load supporting data first
		await Promise.all([loadLocations(), loadDates(), loadRelations()]);

		let data;
		try {
			data = await tryFetch(LOCAL_API);
		} catch (err) {
			// fallback to remote API if local proxy fails
			try {
				data = await tryFetch(REMOTE_API);
			} catch (err2) {
				console.warn('Failed to load artists from both proxy and remote API', err, err2);
				return;
			}
		}

		const artists = Array.isArray(data) ? data : (data.artists || data);
		if (!artists || !artists.length) return;

		// clear grid first (idempotent)
		vinylGrid.innerHTML = '';

		// create one vinyl-item per artist
		artists.forEach((a, idx) => {
			const item = document.createElement('div');
			item.className = 'vinyl-item fade-in';
			item.style.animationDelay = `${idx * 60}ms`;

			const frame = document.createElement('div');
			frame.className = 'vinyl-frame';

			const cover = document.createElement('img');
			cover.className = 'vinyl-cover';
			cover.alt = a.name || '';
			// prefer artist image if present
			if (a.image) cover.src = a.image; else cover.src = '/static/images/vinyle.png';

			frame.appendChild(cover);
			item.appendChild(frame);

			const caption = document.createElement('div');
			caption.className = 'vinyl-caption';
			caption.textContent = a.name || '';
			item.appendChild(caption);

			// clicking the vinyl opens the artist modal
			frame.style.cursor = 'pointer';
			frame.addEventListener('click', function () {
				openArtistModal(a);
			});

			vinylGrid.appendChild(item);
		});
	}
	// create modal container once
	let modalEl = null;

	function createEl(tag, className, text) {
		var el = document.createElement(tag);
		if (className) el.className = className;
		if (text) el.textContent = text;
		return el;
	}

	function createModal() {
		modalEl = createEl('div', 'artist-modal');
		modalEl.id = 'artistModal';

		var panel = createEl('div', 'artist-modal__panel');
		panel.setAttribute('role', 'dialog');
		panel.setAttribute('aria-modal', 'true');

		var closeBtn = createEl('button', 'artist-modal__close', '×');
		closeBtn.setAttribute('aria-label', 'Fermer');
		closeBtn.addEventListener('click', hideModal);

		var content = createEl('div', 'artist-modal__content');

		panel.appendChild(closeBtn);
		panel.appendChild(content);
		modalEl.appendChild(panel);
		document.body.appendChild(modalEl);
		modalEl.addEventListener('click', function (e) { if (e.target === modalEl) hideModal(); });
	}

	function buildMembersList(membersArr) {
		if (!membersArr || !membersArr.length) {
			var empty = createEl('em');
			empty.textContent = 'Aucun membre listé';
			return empty;
		}
		var ul = createEl('ul', 'artist-members');
		membersArr.forEach(function (m) {
			ul.appendChild(createEl('li', '', m));
		});
		return ul;
	}

	function buildLinks(artist, apiUrl) {
		var p = createEl('p', 'artist-links');
		function addLink(href, label) {
			if (!href) return;
			var a = createEl('a');
			a.href = href;
			a.target = '_blank';
			a.rel = 'noopener';
			a.textContent = label;
			p.appendChild(a);
		}
		addLink(artist.locations, 'Locations');
		addLink(artist.concertDates, 'Concert dates');
		addLink(artist.relations, 'Relations');
		return p;
	}

	function formatLocationName(loc) {
		if (!loc) return '';
		var formatted = loc.replace(/_/g, ' ').replace(/-/g, ', ');
		return formatted.split(' ').map(function (w) {
			return w ? w.charAt(0).toUpperCase() + w.slice(1) : '';
		}).join(' ');
	}

	function formatDateLabel(dateStr) {
		if (!dateStr) return '';
		var clean = dateStr.replace(/^\*/, '');
		return clean.replace(/-/g, '/');
	}

	function openArtistModal(artist) {
		if (!modalEl) createModal();
		var panel = modalEl.querySelector('.artist-modal__content');
		while (panel.firstChild) panel.removeChild(panel.firstChild);

		var membersArr = Array.isArray(artist.members) ? artist.members : (artist.members ? [artist.members] : []);
		var hero = createEl('div', 'artist-modal__hero');

		if (artist.image) {
			var cover = createEl('img', 'artist-cover');
			cover.src = artist.image;
			cover.alt = artist.name || '';
			hero.appendChild(cover);
		}

		var head = createEl('div', 'artist-modal__head');
		head.appendChild(createEl('h2', '', artist.name || 'Artiste'));
		head.appendChild(createEl('p', 'muted', 'Année de création: ' + (artist.creationDate || '—')));
		hero.appendChild(head);

		var body = createEl('div', 'artist-modal__body');
		body.appendChild(createEl('h3', '', 'Membres'));
		body.appendChild(buildMembersList(membersArr));
		body.appendChild(createEl('p', '', 'Premier album: ' + (artist.firstAlbum || '—')));

		// Add locations section
		var locations = getLocationsForArtist(artist.id);
		if (locations && locations.length > 0) {
			body.appendChild(createEl('h3', '', 'Lieux de concerts'));
			var locList = createEl('ul', 'artist-locations');
			locations.forEach(function (loc) {
				locList.appendChild(createEl('li', '', formatLocationName(loc)));
			});
			body.appendChild(locList);
		}

		// Add dates section
		var artistDates = getDatesForArtist(artist.id);
		if (artistDates && artistDates.length > 0) {
			body.appendChild(createEl('h3', '', 'Dates'));
			var dateList = createEl('ul', 'artist-dates');
			artistDates.forEach(function (d) {
				dateList.appendChild(createEl('li', '', formatDateLabel(d)));
			});
			body.appendChild(dateList);
		}

		// Add relations section (dates by location)
		var rel = getRelationsForArtist(artist.id);
		if (rel && Object.keys(rel).length > 0) {
			body.appendChild(createEl('h3', '', 'Dates par lieu'));
			var relList = createEl('div', 'artist-relations');
			Object.keys(rel).forEach(function (locKey) {
				var group = createEl('div', 'artist-relations__group');
				group.appendChild(createEl('div', 'artist-relations__loc', formatLocationName(locKey)));
				var datesArr = rel[locKey] || [];
				var ul = createEl('ul', 'artist-relations__dates');
				datesArr.forEach(function (d) {
					ul.appendChild(createEl('li', '', formatDateLabel(d)));
				});
				group.appendChild(ul);
				relList.appendChild(group);
			});
			body.appendChild(relList);
		}

		var apiUrl = 'https://groupietrackers.herokuapp.com/api/artists/' + encodeURIComponent(artist.id || artist.name || '');
		body.appendChild(buildLinks(artist, apiUrl));

		panel.appendChild(hero);
		panel.appendChild(body);
		modalEl.classList.add('open');
	}

	function hideModal() {
		if (modalEl) modalEl.classList.remove('open');
	}

	loadArtists();
});

