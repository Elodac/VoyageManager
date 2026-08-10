// ============================================================
// services/routard.js — lien vers le Guide du Routard
// ============================================================

/** URL Routard la plus pertinente pour une destination. */
function routardUrl(dest) {
  if (dest && dest.routard && dest.routard.url) return dest.routard.url;
  const q = encodeURIComponent('guide du routard ' + ((dest && dest.nom) || '').split('—')[0].trim());
  return `https://www.google.com/search?q=${q}`;
}

/** Vrai si la destination a une fiche Routard enrichie dans le catalogue. */
function hasRoutard(dest) { return !!(dest && dest.routard && dest.routard.url); }

Object.assign(window, { routardUrl, hasRoutard });
