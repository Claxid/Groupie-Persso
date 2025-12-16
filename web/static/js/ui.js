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
	const vinylGrid = document.querySelector('.vinyl-area .vinyl-grid');
	if (!vinylGrid) return;

	async function tryFetch(url) {
		const res = await fetch(url, {cache: 'no-store'});
		if (!res.ok) throw new Error('API response ' + res.status);
		return res.json();
	}

	async function loadArtists() {
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

			// clicking opens an improved in-page modal with artist details
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

