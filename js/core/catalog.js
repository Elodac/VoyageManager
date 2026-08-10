// ============================================================
// core/catalog.js — lecture du référentiel Destinations
// Continents, couleurs de statut, helpers partagés par les vues.
// ============================================================

/**
 * Le continent est une propriété du PAYS : il est lu depuis
 * data/countries.js, source unique. Cette table n'est plus qu'une
 * projection, reconstruite au démarrage — elle ne peut donc plus
 * diverger du référentiel (19 pays y manquaient auparavant).
 */
const CONTINENT_MAP = {};
Object.keys(window.COUNTRIES || {}).forEach(p => {
  if (COUNTRIES[p].continent) CONTINENT_MAP[p] = COUNTRIES[p].continent;
});
const CONTINENT_ORDER = ['Europe', 'Europe (DOM-TOM)', 'Amériques', 'Océanie', 'Asie', 'Afrique'];
const CONTINENT_EMOJI = {
  Europe: '🌍', 'Europe (DOM-TOM)': '🌴', Amériques: '🌎', Océanie: '🌏', Asie: '🌏', Afrique: '🌍',
};
const continentOf = pays => CONTINENT_MAP[pays] || (countryInfo(pays).continent) || 'Autre';

/**
 * Couleur d'un statut — SOURCE UNIQUE.
 * Auparavant définie 3 fois (STATUT_CONFIG, COLOR_MAP de la carte, tokens),
 * avec 3 valeurs différentes pour un même statut.
 */
const STATUT_COLOR = {
  confirme:         { token: 'var(--green-text)',  hex: '#16a34a' },
  planification:    { token: 'var(--yellow-text)', hex: '#d97706' },
  projet:           { token: 'var(--accent-text)', hex: '#2563eb' },
  projet_longterme: { token: 'var(--purple-text)', hex: '#7c3aed' },
};
const statutColor = s => (STATUT_COLOR[s] || { token: 'var(--muted)', hex: '#8892a4' });
const statutMeta = s => (window.STATUT_CONFIG && STATUT_CONFIG[s]) || { label: '—', cls: '' };

const allDests = () => window.DESTINATIONS || [];
const destById = id => allDests().find(d => d.id === id) || null;
/** Destinations hors archives — base de presque toutes les vues. */
function activeDests() {
  const archived = new Set(getArchivedIds());
  return allDests().filter(d => !archived.has(d.id));
}

/** Nom court, sans le complément après le tiret cadratin. */
const shortName = d => String((d && d.nom) || '').split('—')[0].trim();

/** Nombre de nuits d'une destination datée. */
function nightsOf(d) {
  if (d && d.date_depart && d.date_retour) {
    const n = Math.round((new Date(d.date_retour) - new Date(d.date_depart)) / 86400000);
    if (n > 0) return n;
  }
  return null;
}

/** Lien Google Maps pour un lieu (coordonnées si dispo, sinon recherche). */
function mapsLink(item, dest) {
  if (item && item.coords && item.coords.length === 2) {
    return `https://www.google.com/maps/search/?api=1&query=${item.coords[0]},${item.coords[1]}`;
  }
  const q = encodeURIComponent(`${(item && item.nom) || ''} ${dest ? shortName(dest) : ''}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/**
 * Réinjecte les activités ajoutées par l'utilisateur dans les fiches.
 * Déduplication par nom ET par position : deux lieux homonymes dans
 * deux quartiers différents ne doivent plus s'écraser.
 */
function applyUserActivities() {
  if (typeof getUserActivities !== 'function') return;
  getUserActivities().forEach(a => {
    if (!a.destinationId) return;
    const d = destById(a.destinationId);
    if (!d) return;
    d.pois = d.pois || [];
    const dup = d.pois.some(p => {
      if (p.nom !== a.nom) return false;
      if (!p.coords || !a.coords) return true;                 // même nom, pas de position → doublon
      return haversine(p.coords, a.coords) < 0.3;              // même nom à moins de 300 m
    });
    if (dup) return;
    d.pois.push({
      nom: a.nom, type: a.type, coords: a.coords || d.coords, prix: a.prix,
      horaires: a.horaires, site: a.site, lien: a.site, tel: a.tel, custom: true,
    });
  });
}

// ── Destinations communes (admin, partagées entre profils) ──
const GLOBAL_DESTS_KEY = 'vm_global_dests';
function getGlobalDests() {
  try { return JSON.parse(window.__rawLS.get(GLOBAL_DESTS_KEY) || '[]'); } catch { return []; }
}
function setGlobalDests(a) { window.__rawLS.set(GLOBAL_DESTS_KEY, JSON.stringify(a)); }
function applyGlobalDests() {
  getGlobalDests().forEach(d => {
    if (!allDests().some(x => x.id === d.id)) {
      d.scope = 'global'; d.custom = true;
      window.DESTINATIONS.push(d);
    }
  });
}

Object.assign(window, {
  CONTINENT_MAP, CONTINENT_ORDER, CONTINENT_EMOJI, continentOf,
  STATUT_COLOR, statutColor, statutMeta,
  allDests, destById, activeDests, shortName, nightsOf, mapsLink, applyUserActivities,
  GLOBAL_DESTS_KEY, getGlobalDests, setGlobalDests, applyGlobalDests,
});

