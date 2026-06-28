// ============================================================
// services/geocode.js — recherche d'adresse → coordonnées
// Utilise Nominatim (OpenStreetMap), gratuit & sans clé.
// Interface stable : remplaçable par un autre provider plus tard.
// ============================================================

/**
 * Géocode une requête libre (adresse, lieu, ville).
 * @returns {Promise<{results:Array<{label,lat,lon,type}>, error:?string}>}
 */
async function geocode(query) {
  if (!query || query.trim().length < 3) return { results: [], error: 'Saisis au moins 3 caractères.' };
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(query)}`;
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'VoyageManager/1.0 (contact: clement@voyagemanager.local)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    return {
      results: data.map(d => ({
        label: d.display_name,
        lat: +d.lat, lon: +d.lon,
        type: d.type || d.category || '',
        ville: d.address?.city || d.address?.town || d.address?.village || '',
        pays: d.address?.country || '',
      })),
      error: null,
    };
  } catch (e) {
    return { results: [], error: 'Recherche indisponible (' + (e.message || 'réseau') + ').' };
  }
}
