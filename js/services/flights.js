// ============================================================
// services/flights.js — interface "fournisseur de vols" (pluggable)
// Aujourd'hui : stub. Demain : brancher une vraie API (Amadeus,
// Kiwi, Duffel…) en réimplémentant searchFlights() — les vues ne
// changent pas, elles consomment déjà le contrat ci-dessous.
// ============================================================

/**
 * Recherche de vols.
 * @returns {Promise<{available:boolean, reason?:string, results:Array}>}
 */
async function searchFlights() {
  return {
    available: false,
    reason: 'Comparateur de prix non connecté (API à brancher).',
    results: [],
  };
}

/**
 * Liens de comparateurs externes, en attendant l'intégration API.
 * Chaque URL est validée : un code IATA manquant ne doit pas produire
 * de lien cassé, on retombe sur la recherche générique du site.
 */
function comparatorLinks(fromIata, toIata, date) {
  const f = (fromIata || '').toLowerCase();
  const t = (toIata || '').toLowerCase();
  const d = (date || '').replace(/-/g, '');
  const skyscanner = (f && t)
    ? `https://www.skyscanner.fr/transport/vols/${f}/${t}/${d}/`
    : 'https://www.skyscanner.fr/transport/vols/';
  const kayak = (fromIata && toIata)
    ? `https://www.kayak.fr/flights/${fromIata}-${toIata}${date ? '/' + date : ''}`
    : 'https://www.kayak.fr/flights';
  return [
    { label: 'Google Flights', url: 'https://www.google.com/travel/flights' },
    { label: 'Skyscanner', url: skyscanner },
    { label: 'Kayak', url: kayak },
  ];
}

Object.assign(window, { searchFlights, comparatorLinks });
