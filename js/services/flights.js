// ============================================================
// services/flights.js — interface "provider de vols" (pluggable)
// Aujourd'hui : stub. Demain : brancher une vraie API (Amadeus,
// Skyscanner, Kiwi…) en réimplémentant searchFlights().
// ============================================================

const FLIGHTS_PROVIDER = 'stub';

/**
 * Recherche de vols. Interface stable destinée à une future API.
 * @returns {Promise<{available:boolean, reason?:string, results:Array}>}
 */
async function searchFlights({ from, to, date } = {}) {
  return {
    available: false,
    reason: 'Comparateur de prix non connecté (API à brancher).',
    results: [],
  };
}

/** Liens de comparateurs externes en attendant l'intégration API. */
function comparatorLinks(fromIata, toIata, date) {
  const d = (date || '').replace(/-/g, '');
  return [
    { label: 'Google Flights', url: 'https://www.google.com/travel/flights' },
    { label: 'Skyscanner', url: `https://www.skyscanner.fr/transport/vols/${(fromIata||'').toLowerCase()}/${(toIata||'').toLowerCase()}/${d}/` },
    { label: 'Kayak', url: `https://www.kayak.fr/flights/${fromIata||''}-${toIata||''}` },
  ];
}
