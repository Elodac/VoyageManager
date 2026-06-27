// ============================================================
// store.js — source de vérité (voyages) + persistance + pub/sub
// (Phase 1B — refonte modulaire)
// ============================================================
import { tripFromDestination, computeTripProgress } from './model.js';

const STORAGE_KEY = 'vm_store_v1';
const SCHEMA_VERSION = 1;

const state = {
  version: SCHEMA_VERSION,
  trips: [],
};

const listeners = new Set();
/** S'abonner aux changements du store. Renvoie une fonction de désabonnement. */
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } }); }

function persist() {
  state.version = SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: state.version, trips: state.trips }));
}

// ── API publique ────────────────────────────────────────
export function getTrips() { return state.trips; }
export function getTrip(id) { return state.trips.find(t => t.id === id) || null; }
export function getTripByDestination(destId) { return state.trips.find(t => t.destinationId === destId) || null; }

export function progress(trip) { return computeTripProgress(trip); }

/** Met à jour un voyage via un patch (objet ou fonction), persiste et notifie. */
export function updateTrip(id, patch) {
  const t = getTrip(id);
  if (!t) return null;
  const changes = typeof patch === 'function' ? patch(t) : patch;
  Object.assign(t, changes, { updatedAt: Date.now() });
  persist(); emit();
  return t;
}

export function addTrip(trip) { state.trips.push(trip); persist(); emit(); return trip; }
export function removeTrip(id) { state.trips = state.trips.filter(t => t.id !== id); persist(); emit(); }

// ── Chargement / migration / seed ───────────────────────
export function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state.trips = parsed.trips || [];
      state.version = parsed.version || SCHEMA_VERSION;
      return state;
    } catch (e) { console.warn('Store illisible, reseed', e); }
  }
  seedFromCatalog();
  persist();
  return state;
}

/**
 * Première initialisation : crée des voyages à partir du catalogue
 * (confirmés + en planification), en reprenant les anciennes clés
 * localStorage (agenda/valise) là où elles existent.
 */
function seedFromCatalog() {
  const cat = window.DESTINATIONS || [];
  const seedStatuts = ['confirme', 'planification'];
  state.trips = cat
    .filter(d => seedStatuts.includes(d.statut))
    .map(d => tripFromDestination(d));
  // Lien avec les données héritées (pour information / continuité)
  try {
    const oldValises = JSON.parse(localStorage.getItem('voyagemanager_valises') || '{}');
    const oldAgenda = JSON.parse(localStorage.getItem('voyagemanager_agenda') || '{}');
    state.trips.forEach(t => {
      t.hasValise = !!oldValises[t.destinationId];
      t.hasAgenda = !!(oldAgenda[t.destinationId] && (oldAgenda[t.destinationId].blocks || []).length);
    });
  } catch (e) { /* ignore */ }
}

export { state };
