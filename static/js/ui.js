// Minimal UI helpers: mobile nav toggle and smooth-scroll
document.addEventListener('DOMContentLoaded', function () {
    var nav = document.getElementById('mainNav');
    if (!nav) return;

    // Create toggle button for small screens
    var toggle = document.createElement('button');
    toggle.id = 'menuToggle';
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Ouvrir le menu');
    toggle.style.marginLeft = '8px';
    toggle.style.padding = '6px 10px';
    toggle.style.borderRadius = '6px';
    toggle.style.border = 'none';
    toggle.style.background = 'rgba(0,0,0,0.06)';
    toggle.style.cursor = 'pointer';
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
        artists.forEach((a) => {
            const item = document.createElement('div');
            item.className = 'vinyl-item';

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
    function createModal() {
        modalEl = document.createElement('div');
        modalEl.id = 'artistModal';
        modalEl.className = 'artist-modal';
        modalEl.innerHTML = `
            <div class="artist-modal__panel" role="dialog" aria-modal="true">
                <button class="artist-modal__close" aria-label="Fermer">×</button>
                <div class="artist-modal__content"></div>
            </div>
        `;
        document.body.appendChild(modalEl);
        modalEl.querySelector('.artist-modal__close').addEventListener('click', hideModal);
        modalEl.addEventListener('click', (e) => { if (e.target === modalEl) hideModal(); });
    }

    function openArtistModal(artist) {
        if (!modalEl) createModal();
        const panel = modalEl.querySelector('.artist-modal__content');
        // build richer content: cover, name, members list, dates, links
        const membersArr = Array.isArray(artist.members) ? artist.members : (artist.members ? [artist.members] : []);
        const membersHtml = membersArr.length ? `<ul class="artist-members">${membersArr.map(m => `<li>${m}</li>`).join('')}</ul>` : '<em>Aucun membre listé</em>';
        const coverHtml = artist.image ? `<img class="artist-cover" src="${artist.image}" alt="${artist.name||''}" />` : '';

        const apiUrl = `https://groupietrackers.herokuapp.com/api/artists/${encodeURIComponent(artist.id||artist.name||'')}`;
        panel.innerHTML = `
            <div class="artist-modal__hero">
                ${coverHtml}
                <div class="artist-modal__head">
                    <h2>${artist.name || 'Artiste'}</h2>
                    <p class="muted">Année de création: ${artist.creationDate || '—'}</p>
                </div>
            </div>
            <div class="artist-modal__body">
                <h3>Membres</h3>
                ${membersHtml}
                <p><strong>Premier album:</strong> ${artist.firstAlbum || '—'}</p>
                <p class="artist-links">
                    ${artist.locations ? `<a href="${artist.locations}" target="_blank" rel="noopener">Locations</a>` : ''}
                    ${artist.concertDates ? `<a href="${artist.concertDates}" target="_blank" rel="noopener">Concert dates</a>` : ''}
                    ${artist.relations ? `<a href="${artist.relations}" target="_blank" rel="noopener">Relations</a>` : ''}
                    <a href="${apiUrl}" target="_blank" rel="noopener">Voir JSON API</a>
                </p>
            </div>
        `;
        modalEl.classList.add('open');
    }

    function hideModal() {
        if (modalEl) modalEl.classList.remove('open');
    }

    loadArtists();
});
