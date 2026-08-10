// ============================================================
// model.js — modèle de données Voyage + statuts + progression
//
// Répartition des responsabilités :
//   • Destination = référentiel (catalogue, POIs, infos pays) — sans état
//   • Voyage      = tout l'état (dates, budget, statut, avancement)
// `statut` côté destination n'est plus qu'une projection du voyage,
// conservée pour les filtres du catalogue (cf. TRIP_TO_CATALOG_STATUS).
// ============================================================

/** Statut global d'un voyage, ordonné de l'idée à l'archivage. */
const TRIP_STATUS = [
  { key: 'idee',         label: '💡 Idée',                 short: 'Idée',         color: 'var(--muted)' },
  { key: 'preparation',  label: '🗂️ En préparation',       short: 'Préparation',  color: 'var(--yellow-text)' },
  { key: 'reservations', label: '🔄 Réservations en cours', short: 'Réservations', color: 'var(--yellow-text)' },
  { key: 'billets',      label: '🎫 Billets réservés',      short: 'Billets',      color: 'var(--accent-text)' },
  { key: 'hebergement',  label: '🏨 Hébergement réservé',   short: 'Hébergement',  color: 'var(--accent-text)' },
  { key: 'pret',         label: '✅ Voyage prêt',           short: 'Prêt',         color: 'var(--green-text)' },
  { key: 'termine',      label: '🏁 Voyage terminé',        short: 'Terminé',      color: 'var(--purple-text)' },
  { key: 'archive',      label: '📦 Archivé',               short: 'Archivé',      color: 'var(--muted)' },
];

/** Statuts par type d'élément (transport / hébergement / activité). */
const ELEMENT_STATUS = {
  transport: [
    { key: 'non_reserve', label: 'Non réservé', color: 'var(--muted)' },
    { key: 'reserve',     label: 'Réservé',     color: 'var(--yellow-text)' },
    { key: 'paye',        label: 'Payé',        color: 'var(--accent-text)' },
    { key: 'confirme',    label: 'Confirmé',    color: 'var(--green-text)' },
  ],
  hebergement: [
    { key: 'recherche',   label: 'Recherche',   color: 'var(--muted)' },
    { key: 'reserve',     label: 'Réservé',     color: 'var(--yellow-text)' },
    { key: 'paye',        label: 'Payé',        color: 'var(--accent-text)' },
    { key: 'confirme',    label: 'Confirmé',    color: 'var(--green-text)' },
  ],
  activite: [
    { key: 'prevue',      label: 'Prévue',      color: 'var(--muted)' },
    { key: 'reservee',    label: 'Réservée',    color: 'var(--yellow-text)' },
    { key: 'effectuee',   label: 'Effectuée',   color: 'var(--green-text)' },
  ],
};

const tripStatusMeta = key => TRIP_STATUS.find(s => s.key === key) || TRIP_STATUS[0];
const elStatusMeta = (type, key) =>
  (ELEMENT_STATUS[type] || []).find(s => s.key === key) || (ELEMENT_STATUS[type] || [{}])[0];

/** Statut suivant dans le cycle (chips cliquables). */
function nextElStatus(type, key) {
  const arr = ELEMENT_STATUS[type];
  const i = arr.findIndex(s => s.key === key);
  return arr[(i + 1) % arr.length].key;
}
function nextTripStatus(key) {
  const i = TRIP_STATUS.findIndex(s => s.key === key);
  return TRIP_STATUS[(i + 1) % TRIP_STATUS.length].key;
}

function elNorm(type, key) {
  const arr = ELEMENT_STATUS[type];
  const i = arr.findIndex(s => s.key === key);
  return i < 0 ? 0 : i / (arr.length - 1);
}

/**
 * Progression globale d'un voyage en % :
 * moitié = position du statut global, moitié = moyenne des statuts d'éléments.
 */
function computeTripProgress(trip) {
  if (!trip) return 0;
  if (trip.status === 'termine' || trip.status === 'archive') return 100;
  const els = [];
  if (trip.transport) els.push(elNorm('transport', trip.transport.status));
  if (trip.hebergement) els.push(elNorm('hebergement', trip.hebergement.status));
  (trip.activites || []).forEach(a => els.push(elNorm('activite', a.status)));
  const elAvg = els.length ? els.reduce((a, b) => a + b, 0) / els.length : 0;
  const gi = TRIP_STATUS.findIndex(s => s.key === trip.status);
  const gNorm = gi < 0 ? 0 : gi / (TRIP_STATUS.length - 1);
  return Math.round((0.5 * gNorm + 0.5 * elAvg) * 100);
}

/** Catégorie catalogue → statut de voyage (création). */
const CATALOG_TO_TRIP_STATUS = {
  confirme: 'pret',
  planification: 'preparation',
  projet: 'idee',
  projet_longterme: 'idee',
};

/** Statut de voyage → catégorie catalogue (projection inverse). */
const TRIP_TO_CATALOG_STATUS = {
  idee: 'projet',
  preparation: 'planification',
  reservations: 'planification',
  billets: 'planification',
  hebergement: 'planification',
  pret: 'confirme',
  termine: 'confirme',
  archive: 'projet',
};

let _seq = 0;
const newId = () => 't' + Date.now().toString(36) + (_seq++).toString(36);

/**
 * Crée un Voyage à partir d'une fiche destination du catalogue.
 * Aucune réservation n'est présupposée : tout part de zéro et
 * c'est l'utilisateur qui renseigne transport et hébergement.
 */
function tripFromDestination(dest, overrides = {}) {
  const activites = (dest.pois || []).slice(0, 6).map(p => ({
    nom: p.nom, type: p.type, status: 'prevue',
  }));
  const travelers = (window.pref && pref('travelers')) || 2;
  return {
    id: newId(),
    destinationId: dest.id,
    nom: dest.nom,
    emoji: dest.emoji,
    pays: dest.pays,
    date_depart: dest.date_depart || '',
    date_retour: dest.date_retour || '',
    travelers,
    participants: [],
    status: CATALOG_TO_TRIP_STATUS[dest.statut] || 'idee',
    transport: { mode: '', label: '', status: 'non_reserve' },
    hebergement: {
      nom: '', adresse: '', lien: '', prix: '',
      checkinDate: '', checkoutDate: '', checkinTime: '', checkoutTime: '',
      tel: '', email: '', notes: '', status: 'recherche',
    },
    activites,
    budget: { min: dest.budget_min || 0, max: dest.budget_max || 0 },
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

/** Libellé court d'un voyage pour les sélecteurs. */
function tripLabel(t) {
  const dates = t.date_depart ? ' · ' + t.date_depart.slice(0, 7) : '';
  return `${t.emoji || '✈️'} ${t.nom}${dates}`;
}

Object.assign(window, {
  TRIP_STATUS, ELEMENT_STATUS, tripStatusMeta, elStatusMeta, nextElStatus, nextTripStatus,
  computeTripProgress, CATALOG_TO_TRIP_STATUS, TRIP_TO_CATALOG_STATUS,
  newId, tripFromDestination, tripLabel,
});
