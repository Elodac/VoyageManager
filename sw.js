/* ============================================================
   sw.js — service worker : consultation hors ligne
   Stratégies :
     • coquille de l'app (HTML/CSS/JS/données) → cache-first, mise à
       jour en arrière-plan (l'app doit s'ouvrir instantanément et
       fonctionner en avion, c'est tout l'intérêt en voyage)
     • tuiles de carte → cache d'exécution plafonné
     • API (météo, taux, géocodage) → réseau d'abord, cache en repli
   ============================================================ */

const VERSION = 'vm-2.1.15';
const SHELL_CACHE = VERSION + '-shell';
const TILE_CACHE = VERSION + '-tiles';
const API_CACHE = VERSION + '-api';
const TILE_MAX = 400;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './styles/tokens.css',
  './styles/main.css',
  './data.js',
  './js/app.js',
  './js/model.js',
  './js/store.js',
  './js/data/airports.js',
  './js/core/dom.js',
  './js/core/storage.js',
  './js/core/prefs.js',
  './js/core/undo.js',
  './js/core/print.js',
  './js/core/profiles.js',
  './js/core/history.js',
  './js/core/catalog.js',
  './js/core/tripdata.js',
  './js/core/backup.js',
  './js/core/router.js',
  './js/services/geo.js',
  './js/services/geocode.js',
  './js/services/weather.js',
  './js/services/currency.js',
  './js/services/flights.js',
  './js/services/transport.js',
  './js/services/programs.js',
  './js/services/routard.js',
  './js/services/dossier.js',
  './js/data/countries.js',
  './js/data/seasons.js',
  './js/model.roadtrip.js',
  './js/services/booking.js',
  './js/services/rtdossier.js',
  './js/views/widgets.js',
  './js/views/dashboard.js',
  './js/views/destinations.js',
  './js/views/destModal.js',
  './js/views/map.js',
  './js/views/agenda.js',
  './js/views/valises.js',
  './js/views/budget.js',
  './js/views/roadtrips.js',
  './js/views/archives.js',
  './js/views/search.js',
  './js/views/prefs.js',
  './js/views/palette.js',
  './js/views/trips.js',
  './js/views/transport.js',
  './js/views/programs.js',
  './js/views/forms.js',
];

const API_HOSTS = ['api.open-meteo.com', 'archive-api.open-meteo.com', 'api.frankfurter.app', 'nominatim.openstreetmap.org'];
const isTile = url => /basemaps\.cartocdn\.com|tile\.openstreetmap\.org/.test(url.host);
const isApi = url => API_HOSTS.includes(url.host);

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      // addAll échoue en bloc : on tolère les absences pour ne jamais bloquer l'installation
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tuiles de carte : cache d'exécution plafonné
  if (isTile(url)) {
    e.respondWith(caches.open(TILE_CACHE).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) { cache.put(req, res.clone()); trimCache(TILE_CACHE, TILE_MAX); }
        return res;
      } catch (err) {
        return new Response('', { status: 504, statusText: 'Tuile indisponible hors ligne' });
      }
    }));
    return;
  }

  // API distantes : réseau d'abord, dernière réponse connue en repli
  if (isApi(url)) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(API_CACHE)).put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || new Response(JSON.stringify({ error: 'hors ligne' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // Coquille de l'app : cache d'abord, revalidation en arrière-plan
  if (url.origin === location.origin || /unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const hit = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return hit || (await network) || new Response('Hors ligne', { status: 503 });
    })());
  }
});
