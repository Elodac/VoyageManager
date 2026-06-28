// ============================================================
// model.js — modèle de données Voyage + statuts + progression
// (Phase 1B — refonte modulaire)
// ============================================================

/** Statut global d'un voyage, ordonné de l'idée à l'archivage. */
const TRIP_STATUS = [
  { key: 'idee',          label: '💡 Idée',                color: '#8892a4' },
  { key: 'preparation',   label: '🗂️ En préparation',      color: '#f59e0b' },
  { key: 'reservations',  label: '🔄 Réservations en cours',color: '#f59e0b' },
  { key: 'billets',       label: '🎫 Billets réservés',     color: '#3b82f6' },
  { key: 'hebergement',   label: '🏨 Hébergement réservé',  color: '#3b82f6' },
  { key: 'pret',          label: '✅ Voyage prêt',          color: '#22c55e' },
  { key: 'termine',       label: '🏁 Voyage terminé',       color: '#6366f1' },
  { key: 'archive',       label: '📦 Archivé',              color: '#64748b' },
];

/** Statuts par type d'élément (transport / hébergement / activité). */
const ELEMENT_STATUS = {
  transport: [
    { key: 'non_reserve', label: 'Non réservé', color: '#8892a4' },
    { key: 'reserve',     label: 'Réservé',     color: '#f59e0b' },
    { key: 'paye',        label: 'Payé',        color: '#3b82f6' },
    { key: 'confirme',    label: 'Confirmé',    color: '#22c55e' },
  ],
  hebergement: [
    { key: 'recherche',   label: 'Recherche',   color: '#8892a4' },
    { key: 'reserve',     label: 'Réservé',     color: '#f59e0b' },
    { key: 'paye',        label: 'Payé',        color: '#3b82f6' },
    { key: 'confirme',    label: 'Confirmé',    color: '#22c55e' },
  ],
  activite: [
    { key: 'prevue',      label: 'Prévue',      color: '#8892a4' },
    { key: 'reservee',    label: 'Réservée',    color: '#f59e0b' },
    { key: 'effectuee',   label: 'Effectuée',   color: '#22c55e' },
  ],
};

const tripStatusMeta = (key) => TRIP_STATUS.find(s => s.key === key) || TRIP_STATUS[0];
const elStatusMeta = (type, key) => (ELEMENT_STATUS[type] || []).find(s => s.key === key) || ELEMENT_STATUS[type][0];

/** Renvoie la clé du statut suivant dans le cycle (pour les chips cliquables). */
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
  const els = [];
  if (trip.transport)  els.push(elNorm('transport', trip.transport.status));
  if (trip.hebergement) els.push(elNorm('hebergement', trip.hebergement.status));
  (trip.activites || []).forEach(a => els.push(elNorm('activite', a.status)));
  const elAvg = els.length ? els.reduce((a, b) => a + b, 0) / els.length : 0;
  const gi = TRIP_STATUS.findIndex(s => s.key === trip.status);
  const gNorm = gi < 0 ? 0 : gi / (TRIP_STATUS.length - 1);
  return Math.round((0.5 * gNorm + 0.5 * elAvg) * 100);
}

/** Mappe le statut "catalogue" historique → statut de voyage. */
const CATALOG_TO_TRIP_STATUS = {
  confirme: 'pret',
  planification: 'preparation',
  projet: 'idee',
  projet_longterme: 'idee',
};

let _seq = 0;
const newId = () => 't' + Date.now().toString(36) + (_seq++).toString(36);

/**
 * Crée un Voyage à partir d'une fiche destination du catalogue.
 * Les statuts d'éléments sont pré-positionnés intelligemment :
 * un voyage confirmé démarre transport + hébergement "confirmés".
 */
function tripFromDestination(dest, overrides = {}) {
  const confirmed = dest.statut === 'confirme';
  const activites = (dest.pois || []).slice(0, 6).map(p => ({
    nom: p.nom,
    type: p.type,
    status: confirmed ? 'reservee' : 'prevue',
  }));
  return {
    id: newId(),
    destinationId: dest.id,
    nom: dest.nom,
    emoji: dest.emoji,
    pays: dest.pays,
    date_depart: dest.date_depart || '',
    date_retour: dest.date_retour || '',
    participants: [],
    status: CATALOG_TO_TRIP_STATUS[dest.statut] || 'idee',
    transport:   { mode: dest.compagnie || '', label: dest.vol || '', status: confirmed ? 'confirme' : 'non_reserve' },
    hebergement: { nom: dest.logement || '', status: confirmed ? 'confirme' : 'recherche' },
    activites,
    budget: { min: dest.budget_min || 0, max: dest.budget_max || 0 },
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}
