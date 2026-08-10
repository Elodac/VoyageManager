// ============================================================
// services/geocode.js — recherche d'adresse → coordonnées
// Nominatim (OpenStreetMap), gratuit & sans clé.
//
// Nominatim impose 1 requête/seconde : une file d'attente sérialise
// les appels et un cache mémoire évite de refaire deux fois la même
// recherche. Interface stable, remplaçable par un autre fournisseur.
// ============================================================

const NOMINATIM_MIN_INTERVAL = 1100; // ms — marge sur la limite de 1 req/s
const _geoCache = new Map();
let _geoChain = Promise.resolve();
let _geoLast = 0;

function _throttled(fn) {
  const run = _geoChain.then(async () => {
    const wait = Math.max(0, NOMINATIM_MIN_INTERVAL - (Date.now() - _geoLast));
    if (wait) await new Promise(r => setTimeout(r, wait));
    _geoLast = Date.now();
    return fn();
  });
  _geoChain = run.catch(() => {}); // la file ne doit jamais casser
  return run;
}

/**
 * Géocode une requête libre (adresse, lieu, ville).
 * @param {string} query
 * @param {{signal?:AbortSignal}} [opts]
 * @returns {Promise<{results:Array<{label,lat,lon,type,ville,pays}>, error:?string}>}
 */
async function geocode(query, opts) {
  const q = (query || '').trim();
  if (q.length < 3) return { results: [], error: 'Saisis au moins 3 caractères.' };
  if (_geoCache.has(q)) return _geoCache.get(q);

  const url = 'https://nominatim.openstreetmap.org/search'
    + '?format=jsonv2&limit=6&addressdetails=1&q=' + encodeURIComponent(q);

  const out = await _throttled(async () => {
    try {
      const r = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: opts && opts.signal,
      });
      if (r.status === 429) return { results: [], error: 'Trop de recherches — réessaie dans quelques secondes.' };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      return {
        results: data.map(d => ({
          label: d.display_name,
          lat: +d.lat, lon: +d.lon,
          type: d.type || d.category || '',
          ville: (d.address && (d.address.city || d.address.town || d.address.village)) || '',
          pays: (d.address && d.address.country) || '',
        })),
        error: null,
      };
    } catch (e) {
      if (e.name === 'AbortError') return { results: [], error: null };
      return { results: [], error: 'Recherche indisponible (' + (e.message || 'réseau') + ').' };
    }
  });

  if (!out.error) _geoCache.set(q, out);
  return out;
}

Object.assign(window, { geocode });
