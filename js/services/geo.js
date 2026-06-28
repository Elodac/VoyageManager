// ============================================================
// services/geo.js — distances & durées (sans dépendance externe)
// ============================================================
const rad = d => d * Math.PI / 180;

/** Distance à vol d'oiseau entre deux [lat, lon] en km (Haversine). */
function haversine(a, b) {
  const R = 6371;
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const la1 = rad(a[0]), la2 = rad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance routière estimée (vol d'oiseau × facteur de détour). */
function roadDistance(a, b, factor = 1.25) {
  return haversine(a, b) * factor;
}

/** Formate une durée en heures décimales → "2h05" ou "45 min". */
function fmtDuration(h) {
  if (h < 0) h = 0;
  const H = Math.floor(h), M = Math.round((h - H) * 60);
  if (H <= 0) return `${M} min`;
  return `${H}h${String(M).padStart(2, '0')}`;
}
