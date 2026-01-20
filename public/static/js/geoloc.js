// Géolocalisation des groupes/artistes via Groupie Trackers API
(function () {
	const statusEl = document.getElementById('geo-status');
	const mapEl = document.getElementById('map');
	if (!mapEl) return;

	const setStatus = (msg) => {
		if (statusEl) statusEl.textContent = msg;
	};

	// Init Leaflet map
	const map = L.map('map');
	map.setView([20, 0], 2);
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; OpenStreetMap contributors',
		maxZoom: 18,
	}).addTo(map);

	const ARTISTS_URL = '/api/artists-proxy';
	const RELATION_URL = '/api/relation-proxy';

	const cacheKey = (loc) => `geocode:${loc.toLowerCase()}`;
	const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

	async function fetchJson(url) {
		const res = await fetch(url);
		if (!res.ok) throw new Error('HTTP ' + res.status);
		return res.json();
	}

	async function buildData() {
		setStatus('Chargement des artistes…');
		const artists = await fetchJson(ARTISTS_URL);

		setStatus('Chargement des relations (lieux + dates)…');
		const relation = await fetchJson(RELATION_URL);

		const byLocation = new Map();

		const artistsById = new Map(artists.map((a) => [a.id, a]));

		for (const entry of relation.index || []) {
			const artist = artistsById.get(entry.id);
			const name = artist ? artist.name : `Artiste #${entry.id}`;
			const image = artist ? artist.image : null;
			const dl = entry.datesLocations || {};
			for (const loc of Object.keys(dl)) {
				const dates = dl[loc] || [];
				if (!byLocation.has(loc)) {
					byLocation.set(loc, { loc, artists: [], dates: [] });
				}
				const bucket = byLocation.get(loc);
				bucket.artists.push({ id: entry.id, name, image });
				bucket.dates.push(...dates);
			}
		}

		return { artists, relationByLocation: byLocation };
	}

	async function geocodeLocation(loc) {
		const key = cacheKey(loc);
		const cached = localStorage.getItem(key);
		if (cached) {
			try {
				return JSON.parse(cached);
			} catch {}
		}
		// Use Nominatim to geocode the textual location
		const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}`;
		const res = await fetch(url, {
			headers: { 'Accept-Language': 'fr' },
		});
		if (!res.ok) throw new Error('Geocode failed: ' + res.status);
		const arr = await res.json();
		if (!Array.isArray(arr) || arr.length === 0) return null;
		const best = arr[0];
		const point = { lat: parseFloat(best.lat), lon: parseFloat(best.lon) };
		localStorage.setItem(key, JSON.stringify(point));
		// be polite with Nominatim; small delay between requests
		await sleep(250);
		return point;
	}

	function popupHtml(bucket) {
		const uniqueDates = Array.from(new Set(bucket.dates)).sort();
		const artistsHtml = bucket.artists
			.map((a) => {
				const img = a.image ? `<img src="${a.image}" alt="${a.name}" />` : '';
				return `<li>${img}<span>${a.name}</span></li>`;
			})
			.join('');
		const datesHtml = uniqueDates.map((d) => `<li>${d}</li>`).join('');
		return `
			<div class="popup">
				<h3>${bucket.loc}</h3>
				<h4>Artistes</h4>
				<ul class="artists">${artistsHtml}</ul>
				<h4>Dates</h4>
				<ul class="dates">${datesHtml}</ul>
			</div>
		`;
	}

	async function main() {
		try {
			const { relationByLocation } = await buildData();
			setStatus(`Géocodage de ${relationByLocation.size} lieux…`);

			const bounds = [];
			let success = 0;
			let failures = 0;

			for (const [loc, bucket] of relationByLocation.entries()) {
				try {
					const pt = await geocodeLocation(loc);
					if (!pt) {
						failures++;
						continue;
					}
					const marker = L.marker([pt.lat, pt.lon]).addTo(map);
					marker.bindPopup(popupHtml(bucket));
					bounds.push([pt.lat, pt.lon]);
					success++;
				} catch (e) {
					failures++;
				}
			}

			if (bounds.length) {
				const b = L.latLngBounds(bounds);
				map.fitBounds(b.pad(0.2));
			}
			setStatus(`Marqueurs prêts: ${success}. Échecs: ${failures}.`);
		} catch (e) {
			console.error(e);
			setStatus('Erreur de chargement des données.');
		}
	}

	main();
})();
