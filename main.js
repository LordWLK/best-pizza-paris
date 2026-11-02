/* ==========================================================================
   Best Pizza Paris — script principal (v2026-11-02)
   - Navigation : état "scrolled", bouton retour en haut
   - Apparition au défilement (.reveal)
   - Menu mobile accessible (aria-expanded, Escape, focus, inert)
   - Photos tierces : repli si l'image ne charge pas
   - Carte Leaflet chargée à la demande (avec repli si le CDN est indisponible)
   Les données des restaurants sont lues dans le HTML (data-* des cartes) :
   une seule source de vérité.
   La classe .js-ready (posée ici, au démarrage de l'apparition au défilement) signale
   à la CSS que le masquage des .reveal est pris en charge ; sans elle, styles.css
   réaffiche tout au bout de 1,5 s (repli si ce fichier ne s'exécute pas).
   ========================================================================== */
(function () {
  'use strict';

  var d = document;
  var nav = d.querySelector('.nav');
  var hero = d.querySelector('.hero');
  var backBtn = d.getElementById('back-to-top');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var supportsIO = 'IntersectionObserver' in window;

  /* ---------- Nav + retour en haut (un seul observer sur le hero) ---------- */
  if (hero && supportsIO) {
    var heroObs = new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      if (nav) nav.classList.toggle('nav--scrolled', e.intersectionRatio < 0.15);
      if (backBtn) backBtn.classList.toggle('is-visible', !e.isIntersecting);
    }, { threshold: [0, 0.15] });
    heroObs.observe(hero);
  } else if (nav) {
    nav.classList.add('nav--scrolled');
  }

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Apparition au défilement ---------- */
  var reveals = d.querySelectorAll('.reveal');
  if (supportsIO) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          revealObs.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    reveals.forEach(function (el) { revealObs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }
  d.documentElement.classList.add('js-ready');

  /* ---------- Menu mobile ---------- */
  var menuBtn = d.querySelector('.nav__menu-btn');
  var menu = d.getElementById('mobile-menu');
  if (menuBtn && menu) {
    var inertTargets = function () {
      return [d.querySelector('.skip-link'), d.querySelector('main'), d.querySelector('footer'), backBtn].filter(Boolean);
    };
    var openMenu = function () {
      menu.hidden = false;
      menuBtn.classList.add('is-open');
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Fermer le menu');
      d.body.style.overflow = 'hidden';
      inertTargets().forEach(function (el) { el.inert = true; });
      var first = menu.querySelector('a');
      if (first) first.focus();
    };
    var closeMenu = function (restoreFocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      menuBtn.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Ouvrir le menu');
      d.body.style.overflow = '';
      inertTargets().forEach(function (el) { el.inert = false; });
      if (restoreFocus) menuBtn.focus();
    };
    menuBtn.addEventListener('click', function () {
      if (menu.hidden) openMenu(); else closeMenu(true);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu(false);
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu(true);
    });
    // Passage en desktop (rotation, redimensionnement) : on referme proprement
    var mqMobile = window.matchMedia('(max-width: 768px)');   // même requête que la CSS
    var onMqChange = function (e) { if (!e.matches) closeMenu(false); };
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', onMqChange);
    else if (mqMobile.addListener) mqMobile.addListener(onMqChange);
  }

  /* ---------- Photos tierces : repli visuel si l'image ne charge pas ---------- */
  d.querySelectorAll('.card__img').forEach(function (img) {
    var wrap = img.closest('.card__img-wrap');
    var fail = function () { if (wrap) wrap.classList.add('card__img-wrap--missing'); };
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
    img.addEventListener('error', fail);
  });

  /* ---------- Carte ---------- */
  var mapEl = d.getElementById('map');
  if (mapEl) {
    var LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    var LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    var SRI_JS = 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH';
    var SRI_CSS = 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';
    var mapReady = false;
    var loading = false;
    var failed = false;

    // Texte d'un element sans ses parties reservees aux lecteurs d'ecran (.sr-only),
    // pour que les marqueurs affichent "1. Peppe" et non "1. N° 1 : Peppe".
    var visibleText = function (node) {
      if (!node) return '';
      var clone = node.cloneNode(true);
      Array.prototype.forEach.call(clone.querySelectorAll('.sr-only'), function (n) { n.parentNode.removeChild(n); });
      return clone.textContent.trim();
    };

    var cards = d.querySelectorAll('.card[data-lat]');
    var restaurants = Array.prototype.map.call(cards, function (c) {
      var nameEl = c.querySelector('.card__name');
      var site = c.querySelector('.card__link--site');
      var maps = c.querySelector('.card__link--maps');
      return {
        id: c.id,
        name: visibleText(nameEl),
        addr: c.getAttribute('data-address') || '',
        rating: c.getAttribute('data-rating') || '',
        lat: parseFloat(c.getAttribute('data-lat')),
        lng: parseFloat(c.getAttribute('data-lng')),
        site: site ? site.href : '',
        maps: maps ? maps.href : ''
      };
    });

    var el = function (tag, cls, text) {
      var e = d.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    };
    var extLink = function (href, text) {
      var a = el('a', null, text);
      a.href = href; a.rel = 'noopener noreferrer'; a.target = '_blank';
      return a;
    };

    var showFallback = function () {
      if (mapReady) return;
      mapEl.textContent = '';
      var box = el('div', 'map-fallback');
      box.appendChild(el('p', null, 'La carte interactive n’a pas pu être chargée.'));
      box.appendChild(extLink('https://www.openstreetmap.org/#map=13/48.862/2.355', 'Ouvrir la carte sur OpenStreetMap'));
      box.appendChild(el('p', null, 'Les adresses complètes figurent dans le classement ci-dessus.'));
      mapEl.appendChild(box);
    };

    var initMap = function () {
      if (mapReady || failed || !window.L) return;
      mapReady = true;
      try {
        var L = window.L;
        mapEl.textContent = '';
        var map = L.map(mapEl, {
          scrollWheelZoom: false,
          zoomControl: false,
          dragging: !L.Browser.mobile   // sur mobile, le doigt fait défiler la page ; le pincement zoome
        });
        L.control.zoom({ zoomInTitle: 'Zoomer', zoomOutTitle: 'Dézoomer' }).addTo(map);
        L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19
        }).addTo(map);

        var bounds = [];
        restaurants.forEach(function (r, i) {
          if (isNaN(r.lat) || isNaN(r.lng)) return;
          var label = (i + 1) + '. ' + r.name;
          var icon = L.divIcon({
            html: '<span class="pizza-marker" aria-hidden="true">🍕</span>',
            iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14], className: ''
          });
          var marker = L.marker([r.lat, r.lng], { icon: icon, title: label, alt: label, keyboard: true }).addTo(map);

          var popup = el('div', 'map-popup');
          var name = el('div', 'map-popup__name');
          var link = el('a', 'map-popup__link', label);
          link.href = '#' + r.id;
          name.appendChild(link);
          popup.appendChild(name);
          popup.appendChild(el('div', 'map-popup__addr', r.addr));
          if (r.rating) {   // les adresses sans note (pages de liste) n'affichent pas la ligne
            var rating = el('div', 'map-popup__rating');
            var star = el('span', 'map-popup__star', '★ ');
            star.setAttribute('aria-hidden', 'true');
            rating.appendChild(star);
            rating.appendChild(d.createTextNode('Note : ' + r.rating + '/5'));
            popup.appendChild(rating);
          }
          var actions = el('div', 'map-popup__actions');
          if (r.maps) actions.appendChild(extLink(r.maps, 'Itinéraire'));
          if (r.site) actions.appendChild(extLink(r.site, 'Site web'));
          popup.appendChild(actions);
          marker.bindPopup(popup);
          bounds.push([r.lat, r.lng]);
        });

        if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        else map.setView([48.862, 2.355], 12);

        map.on('popupopen', function (e) {
          var pe = e.popup.getElement();
          var btn = pe && pe.querySelector('.leaflet-popup-close-button');
          if (btn) { btn.setAttribute('aria-label', 'Fermer'); btn.setAttribute('title', 'Fermer'); }
        });
      } catch (err) {
        mapReady = false;
        showFallback();
      }
    };

    var loadLeaflet = function () {
      if (loading) return;
      loading = true;
      if (window.L) { initMap(); return; }
      // La carte n'est initialisée qu'une fois le CSS ET le JS reçus ; tout échec
      // (ou dépassement du délai) affiche le repli et abandonne l'initialisation.
      var pending = 2;
      var timer = setTimeout(function () { failed = true; showFallback(); }, 12000);
      var fail = function () { clearTimeout(timer); failed = true; showFallback(); };
      var done = function () { if (!failed && --pending === 0) { clearTimeout(timer); initMap(); } };

      var css = d.createElement('link');
      css.rel = 'stylesheet'; css.href = LEAFLET_CSS; css.integrity = SRI_CSS; css.crossOrigin = 'anonymous';
      css.onload = done; css.onerror = fail;

      var js = d.createElement('script');
      js.src = LEAFLET_JS; js.integrity = SRI_JS; js.crossOrigin = 'anonymous'; js.async = true;
      js.onload = done; js.onerror = fail;

      d.head.appendChild(css);
      d.head.appendChild(js);
    };

    if (supportsIO) {
      var mapObs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { mapObs.disconnect(); loadLeaflet(); }
      }, { rootMargin: '600px 0px' });
      mapObs.observe(mapEl);
    } else {
      loadLeaflet();
    }
  }
})();
