// ============================================================
// services/weather.js — météo & climatologie réelles (Open-Meteo)
// Gratuit, sans clé, sans quota déclaré. Deux usages :
//   • prévisions à 7 jours (voyage proche)
//   • normales saisonnières (voyage lointain → « à quoi s'attendre »)
// Les résultats sont mis en cache 3 h pour éviter de réinterroger
// l'API à chaque ouverture de fiche.
// ============================================================

const WEATHER_CACHE_KEY = 'vm_weather_cache';
const WEATHER_TTL = 3 * 3600 * 1000;

const WMO = {
  0: ['☀️', 'Ciel dégagé'], 1: ['🌤️', 'Plutôt dégagé'], 2: ['⛅', 'Partiellement nuageux'], 3: ['☁️', 'Couvert'],
  45: ['🌫️', 'Brouillard'], 48: ['🌫️', 'Brouillard givrant'],
  51: ['🌦️', 'Bruine légère'], 53: ['🌦️', 'Bruine'], 55: ['🌧️', 'Bruine dense'],
  61: ['🌦️', 'Pluie faible'], 63: ['🌧️', 'Pluie'], 65: ['🌧️', 'Pluie forte'],
  71: ['🌨️', 'Neige faible'], 73: ['🌨️', 'Neige'], 75: ['❄️', 'Neige forte'],
  80: ['🌦️', 'Averses'], 81: ['🌧️', 'Averses'], 82: ['⛈️', 'Fortes averses'],
  95: ['⛈️', 'Orage'], 96: ['⛈️', 'Orage grêleux'], 99: ['⛈️', 'Orage violent'],
};
const wmoMeta = c => WMO[c] || ['🌡️', '—'];

function _cache() { return lsGet(WEATHER_CACHE_KEY, {}); }
function _cacheGet(key) {
  const c = _cache()[key];
  return (c && Date.now() - c.ts < WEATHER_TTL) ? c.data : null;
}
function _cacheSet(key, data) {
  const c = _cache();
  c[key] = { ts: Date.now(), data };
  // Purge des entrées expirées pour ne pas laisser grossir le cache
  Object.keys(c).forEach(k => { if (Date.now() - c[k].ts > WEATHER_TTL) delete c[k]; });
  lsSet(WEATHER_CACHE_KEY, c);
}

/**
 * Prévisions 7 jours pour des coordonnées.
 * @returns {Promise<{available:boolean, days?:Array, error?:string}>}
 */
async function getForecast(coords) {
  if (!coords || coords.length < 2) return { available: false, error: 'Coordonnées manquantes' };
  const key = 'f:' + coords[0].toFixed(2) + ',' + coords[1].toFixed(2);
  const hit = _cacheGet(key);
  if (hit) return hit;

  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${coords[0]}&longitude=${coords[1]}`
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&timezone=auto&forecast_days=7';
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const out = {
      available: true,
      days: (d.daily.time || []).map((iso, i) => ({
        date: iso,
        code: d.daily.weather_code[i],
        tmax: Math.round(d.daily.temperature_2m_max[i]),
        tmin: Math.round(d.daily.temperature_2m_min[i]),
        rain: d.daily.precipitation_probability_max[i],
      })),
    };
    _cacheSet(key, out);
    return out;
  } catch (e) {
    return { available: false, error: 'Météo indisponible (' + (e.message || 'réseau') + ')' };
  }
}

/**
 * Normales saisonnières pour un mois donné (moyenne des 5 dernières années).
 * Utile quand le voyage est trop lointain pour une prévision.
 * @param {number[]} coords
 * @param {number} month 1-12
 */
async function getClimate(coords, month) {
  if (!coords || coords.length < 2) return { available: false };
  const key = 'c:' + coords[0].toFixed(1) + ',' + coords[1].toFixed(1) + ':' + month;
  const hit = _cacheGet(key);
  if (hit) return hit;

  const y = new Date().getFullYear() - 1;
  const mm = String(month).padStart(2, '0');
  const last = new Date(y, month, 0).getDate();
  const url = 'https://archive-api.open-meteo.com/v1/archive'
    + `?latitude=${coords[0]}&longitude=${coords[1]}`
    + `&start_date=${y - 4}-${mm}-01&end_date=${y}-${mm}-${last}`
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto';
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const avg = arr => {
      const v = (arr || []).filter(x => x != null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    const tmax = avg(d.daily.temperature_2m_max);
    const tmin = avg(d.daily.temperature_2m_min);
    const rainDays = (d.daily.precipitation_sum || []).filter(x => x >= 1).length;
    const totalDays = (d.daily.time || []).length || 1;
    const out = {
      available: tmax != null,
      month,
      tmax: tmax == null ? null : Math.round(tmax),
      tmin: tmin == null ? null : Math.round(tmin),
      rainRatio: Math.round(rainDays / totalDays * 100),
      years: `${y - 4}–${y}`,
    };
    _cacheSet(key, out);
    return out;
  } catch (e) {
    return { available: false, error: e.message };
  }
}

const FR_MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

Object.assign(window, { getForecast, getClimate, wmoMeta, FR_MONTH_NAMES });
