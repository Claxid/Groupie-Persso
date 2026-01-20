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
	console.log('🎵 ui.js: DOMContentLoaded event fired');
	
	const LOCAL_API = '/api/artists-proxy';
	const REMOTE_API = 'https://groupietrackers.herokuapp.com/api/artists';
	const LOCAL_LOCATIONS_API = '/api/locations-proxy';
	const REMOTE_LOCATIONS_API = 'https://groupietrackers.herokuapp.com/api/locations';
	const LOCAL_DATES_API = '/api/dates-proxy';
	const REMOTE_DATES_API = 'https://groupietrackers.herokuapp.com/api/dates';
	const LOCAL_RELATIONS_API = '/api/relations-proxy';
	const REMOTE_RELATIONS_API = 'https://groupietrackers.herokuapp.com/api/relation';
	const FALLBACK_PREVIEW = 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3';
	
	console.log('🎵 ui.js: Looking for vinyl-grid with selector: .vinyl-area .vinyl-grid');
	const vinylGrid = document.querySelector('.vinyl-area .vinyl-grid');
	console.log('🎵 ui.js: vinylGrid found:', !!vinylGrid, vinylGrid);
	
	if (!vinylGrid) {
		console.error('❌ ui.js: vinyl-grid not found, returning');
		return;
	}
	
	console.log('✅ ui.js: vinyl-grid found, starting initialization');

	let locationsData = null;
	let datesData = null;
	let relationsData = null;

	// Ensure only one audio plays at a time
	let currentAudio = null;
	let currentFrame = null;

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
			console.log('✅ Relations loaded from local proxy');
		} catch (err) {
			console.warn('⚠️ Local relations API failed, trying remote...', err);
			try {
				relationsData = await tryFetch(REMOTE_RELATIONS_API);
				console.log('✅ Relations loaded from remote API');
			} catch (err2) {
				console.error('❌ Failed to load relations from both APIs', err, err2);
				// Don't fail, just continue without relations
				relationsData = { index: [] };
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
		// Load supporting data first, but don't block on failures
		try {
			await Promise.all([
				loadLocations().catch(e => console.warn('Locations load failed:', e)),
				loadDates().catch(e => console.warn('Dates load failed:', e)),
				loadRelations().catch(e => console.warn('Relations load failed:', e))
			]);
			console.log('✅ All supplementary data loaded (or failed gracefully)');
		} catch (err) {
			console.warn('⚠️ Some supplementary data failed to load, continuing...', err);
		}

		let data;
		try {
			console.log('📡 Fetching artists from local proxy...');
			data = await tryFetch(LOCAL_API);
			console.log('✅ Artists loaded from local proxy');
		} catch (err) {
			console.warn('⚠️ Local proxy failed, trying remote API...', err);
			// fallback to remote API if local proxy fails
			try {
				data = await tryFetch(REMOTE_API);
				console.log('✅ Artists loaded from remote API');
			} catch (err2) {
				console.error('❌ Failed to load artists from both APIs', err, err2);
				return;
			}
		}

		const artists = Array.isArray(data) ? data : (data.artists || data);
		if (!artists || !artists.length) {
			console.error('❌ No artists data found');
			return;
		}

		console.log(`✅ Found ${artists.length} artists, creating vinyl items...`);

		// clear grid first (idempotent)
		vinylGrid.innerHTML = '';

		// create one vinyl-item per artist
		artists.forEach((a, idx) => {
			const item = document.createElement('div');
			item.className = 'vinyl-item fade-in';
			item.style.animationDelay = `${idx * 60}ms`;

			const frame = document.createElement('div');
			frame.className = 'vinyl-frame';

			// Create audio element for click-to-play music
			const audio = document.createElement('audio');
			audio.preload = 'auto';
			audio.volume = 0.85;
			audio.crossOrigin = 'anonymous';
			audio.style.display = 'none';
			item.appendChild(audio);
			
			// Track loading state
			let audioReady = false;
			let audioLoading = false;
			
			audio.addEventListener('canplaythrough', function() {
				audioReady = true;
				console.log('✅ Audio loaded and ready for:', a.name);
			});
			
			audio.addEventListener('error', function(e) {
				console.error('❌ Audio loading error for', a.name, ':', e);
				audioReady = false;
			});
			
			// Function to fetch music from multiple APIs
			async function fetchMusicPreview(artistName) {
				if (audioLoading) return null;
				audioLoading = true;
				
				const encodedName = encodeURIComponent(artistName);
				console.log('🎵 Searching music for:', artistName);
				
				// Try iTunes API first (30 second previews)
				try {
					const itunesUrl = `https://itunes.apple.com/search?term=${encodedName}&entity=song&limit=1&media=music`;
					console.log('📡 Fetching from iTunes:', itunesUrl);
					const itunesRes = await fetch(itunesUrl);
					const itunesData = await itunesRes.json();
					console.log('📦 iTunes response:', itunesData);
					
					if (itunesData.results && itunesData.results.length > 0) {
						let preview = itunesData.results[0].previewUrl;
						if (preview) {
							if (preview.startsWith('http://')) {
								preview = preview.replace('http://', 'https://');
							}
							console.log('✅ iTunes preview found:', preview);
							audioLoading = false;
							return preview;
						}
					}
					console.log('⚠️ No iTunes results for:', artistName);
				} catch (err) {
					console.error('❌ iTunes API error:', err);
				}
				
				// Try Deezer API as fallback
				try {
					const deezerUrl = `https://api.deezer.com/search?q=${encodedName}&limit=1`;
					console.log('📡 Fetching from Deezer:', deezerUrl);
					const deezerRes = await fetch(deezerUrl);
					const deezerData = await deezerRes.json();
					console.log('📦 Deezer response:', deezerData);
					
					if (deezerData.data && deezerData.data.length > 0) {
						let preview = deezerData.data[0].preview;
						if (preview) {
							if (preview.startsWith('http://')) {
								preview = preview.replace('http://', 'https://');
							}
							console.log('✅ Deezer preview found:', preview);
							audioLoading = false;
							return preview;
						}
					}
					console.log('⚠️ No Deezer results for:', artistName);
				} catch (err) {
					console.error('❌ Deezer API error:', err);
				}
				
				console.warn('❌ No preview found for:', artistName);
				audioLoading = false;
				return null;
			}
			
			// Fetch and set audio source immediately
			fetchMusicPreview(a.name || '').then(previewUrl => {
				if (previewUrl) {
					console.log('🔗 Setting audio src:', previewUrl);
					audio.src = previewUrl;
					audio.load();
				} else {
					console.warn('⚠️ No audio preview found, using fallback for:', a.name);
					audio.src = FALLBACK_PREVIEW;
					audio.load();
				}
			});

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

			// Toggle play/pause music on click
			let isPlaying = false;
			let playAttempted = false;
			
			frame.style.cursor = 'pointer';
			frame.addEventListener('click', function (e) {
				console.log('🖱️ Vinyl clicked for:', a.name, 'Audio src:', audio.src, 'Ready:', audioReady);
				
				// If no audio source yet, fetch it now
				if (!audio.src) {
					console.log('⏳ No audio source, fetching now...');
					fetchMusicPreview(a.name || '').then(previewUrl => {
						if (previewUrl) {
							audio.src = previewUrl;
							audio.load();
							// Wait a bit for metadata to load, then try to play
							setTimeout(() => {
								console.log('🔄 Retrying play after fetch...');
								frame.click();
							}, 500);
						} else {
							console.error('❌ Failed to fetch preview for:', a.name);
							alert('Désolé, aucune musique disponible pour ' + a.name);
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
									setTimeout(() => frame.click(), 300);
								} else {
									alert('Erreur de lecture audio: ' + err.message);
								}
							});
					}
				} else if (isPlaying) {
					console.log('⏹️ Stopping audio for:', a.name);
					audio.pause();
					audio.currentTime = 0;
					isPlaying = false;
					frame.classList.remove('playing');
					playAttempted = false;
					if (currentAudio === audio) { currentAudio = null; currentFrame = null; }
				}
			});
			
			// Double-click to open artist modal
			frame.addEventListener('dblclick', function () {
				// Stop music if playing
				if (isPlaying) {
					audio.pause();
					audio.currentTime = 0;
					isPlaying = false;
					frame.classList.remove('playing');
				}
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
		// Store reference to close button for showing/hiding
		modalEl.closeBtn = closeBtn;

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

	function buildSection(title, contentEl) {
		var section = createEl('section', 'artist-section');
		section.appendChild(createEl('h3', '', title));
		if (contentEl) section.appendChild(contentEl);
		return section;
	}

	function buildLocationsSection(artist) {
		var locations = getLocationsForArtist(artist.id);
		if (!locations || !locations.length) {
			return buildSection('Lieux de concerts', createEl('p', 'muted', 'Aucun lieu disponible pour cet artiste.'));
		}
		var locList = createEl('ul', 'artist-locations');
		locations.forEach(function (loc) {
			locList.appendChild(createEl('li', '', formatLocationName(loc)));
		});
		return buildSection('Lieux de concerts', locList);
	}

	function buildDatesSection(artist) {
		var artistDates = getDatesForArtist(artist.id);
		if (!artistDates || !artistDates.length) {
			return buildSection('Dates', createEl('p', 'muted', 'Aucune date connue pour cet artiste.'));
		}
		var dateList = createEl('ul', 'artist-dates');
		artistDates.forEach(function (d) {
			dateList.appendChild(createEl('li', '', formatDateLabel(d)));
		});
		return buildSection('Dates', dateList);
	}

	function buildRelationsSection(artist) {
		var rel = getRelationsForArtist(artist.id);
		if (!rel || Object.keys(rel).length === 0) {
			return buildSection('Dates par lieu', createEl('p', 'muted', 'Aucune relation disponible.'));
		}
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
		return buildSection('Dates par lieu', relList);
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
		var mainView = createEl('div', 'artist-main');
		mainView.appendChild(createEl('h3', '', 'Membres'));
		mainView.appendChild(buildMembersList(membersArr));
		mainView.appendChild(createEl('p', '', 'Premier album: ' + (artist.firstAlbum || '—')));

		var actions = createEl('div', 'artist-links');
		var detail = createEl('div', 'artist-detail is-hidden');
		var detailHeader = createEl('div', 'artist-detail__head');
		var backBtn = createEl('button', 'artist-link-btn artist-link-btn--ghost', 'Retour');
		var detailTitle = createEl('h3', '', '');
		var detailContent = createEl('div', 'artist-detail__content');

		function showMain() {
			mainView.classList.remove('is-hidden');
			actions.classList.remove('is-hidden');
			detail.classList.add('is-hidden');
			hero.classList.remove('is-hidden');
			if (modalEl.closeBtn) modalEl.closeBtn.classList.remove('is-hidden');
		}

		backBtn.type = 'button';
		backBtn.addEventListener('click', function () {
			showMain();
			backBtn.blur();
		});

		detailHeader.appendChild(backBtn);
		detailHeader.appendChild(detailTitle);
		detail.appendChild(detailHeader);
		detail.appendChild(detailContent);

		function addInfoButton(label, key, builder) {
			var btn = createEl('button', 'artist-link-btn', label);
			btn.type = 'button';
			btn.addEventListener('click', function () {
				var section = builder();
				if (!section) {
					section = buildSection(label, createEl('p', 'muted', 'Données indisponibles pour cet artiste.'));
				}
				detailTitle.textContent = label;
				while (detailContent.firstChild) detailContent.removeChild(detailContent.firstChild);
				detailContent.appendChild(section);
				mainView.classList.add('is-hidden');
				actions.classList.add('is-hidden');
				detail.classList.remove('is-hidden');
				hero.classList.add('is-hidden');
				if (modalEl.closeBtn) modalEl.closeBtn.classList.add('is-hidden');
				backBtn.focus();
			});
			actions.appendChild(btn);
		}

		addInfoButton('Locations', 'locations', function () { return buildLocationsSection(artist); });
		addInfoButton('Dates', 'dates', function () { return buildDatesSection(artist); });
		addInfoButton('Relations', 'relations', function () { return buildRelationsSection(artist); });

		body.appendChild(mainView);
		body.appendChild(actions);
		body.appendChild(detail);

		panel.appendChild(hero);
		panel.appendChild(body);
		modalEl.classList.add('open');
	}

	function hideModal() {
		if (modalEl) modalEl.classList.remove('open');
	}

	loadArtists();
});

