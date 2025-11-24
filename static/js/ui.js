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
