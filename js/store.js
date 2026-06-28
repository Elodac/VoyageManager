// ============================================================
// store.js — voyages + catalogue utilisateur + persistance + pub/sub
// Script CLASSIQUE (globals) → fonctionne en file:// comme en http.
// Dépend de model.js (chargé avant) : tripFromDestination, computeTripProgress
// ============================================================
const STORAGE_KEY = 'vm_store_v1';
const STORE_SCHEMA_VERSION = 2;

const storeState = { version: STORE_SCHEMA_VERSION, trips: [], userDestinations: [], userActivities: [] };
let _storeLoaded = false;
const _storeListeners = new Set();

function subscribe(fn) { _storeListeners.add(fn); return () => _storeListeners.delete(fn); }
function _storeEmit() { _storeListeners.forEach(fn => { try { fn(storeState); } catch (e) { console.error(e); } }); }

function _storePersist() {
  storeState.version = STORE_SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: storeState.version, trips: storeState.trips,
    userDestinations: storeState.userDestinations, userActivities: storeState.userActivities,
  }));
}

function getTrips() { return storeState.trips; }
function getTrip(id) { return storeState.trips.find(t => t.id === id) || null; }
function getTripByDestination(destId) { return storeState.trips.find(t => t.destinationId === destId) || null; }
function progress(trip) { return computeTripProgress(trip); }

function updateTrip(id, patch) {
  const t = getTrip(id);
  if (!t) return null;
  const changes = typeof patch === 'function' ? patch(t) : patch;
  Object.assign(t, changes, { updatedAt: Date.now() });
  _storePersist(); _storeEmit();
  return t;
}
function addTrip(trip) { storeState.trips.push(trip); _storePersist(); _storeEmit(); return trip; }
function removeTrip(id) { storeState.trips = storeState.trips.filter(t => t.id !== id); _storePersist(); _storeEmit(); }

function getUserDestinations() { return storeState.userDestinations; }
function getUserActivities() { return storeState.userActivities; }

function addUserDestination(dest) {
  storeState.userDestinations.push(dest);
  if (window.DESTINATIONS && !window.DESTINATIONS.some(d => d.id === dest.id)) window.DESTINATIONS.push(dest);
  _storePersist(); _storeEmit();
  _storeRefreshLegacy();
  return dest;
}
function addUserActivity(act) { storeState.userActivities.push(act); _storePersist(); _storeEmit(); return act; }

function _storeRefreshLegacy() {
  ['buildDestGrid', 'buildBudget', 'buildValiseSelect', 'buildSearchSelect', 'buildAgendaSelect']
    .forEach(fn => { try { window[fn] && window[fn](); } catch (e) { /* ignore */ } });
}

function _storeMergeUserDest() {
  if (!window.DESTINATIONS) return;
  storeState.userDestinations.forEach(d => {
    if (!window.DESTINATIONS.some(x => x.id === d.id)) window.DESTINATIONS.push(d);
  });
}

function loadStore() {
  if (_storeLoaded) return storeState;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const p = JSON.parse(raw);
      storeState.trips = p.trips || [];
      storeState.userDestinations = p.userDestinations || [];
      storeState.userActivities = p.userActivities || [];
      storeState.version = p.version || STORE_SCHEMA_VERSION;
      _storeMergeUserDest();
      _storeLoaded = true;
      return storeState;
    } catch (e) { console.warn('Store illisible, reseed', e); }
  }
  _storeSeed();
  _storePersist();
  _storeLoaded = true;
  return storeState;
}

function _storeSeed() {
  const cat = window.DESTINATIONS || [];
  const seedStatuts = ['confirme', 'planification'];
  storeState.trips = cat.filter(d => seedStatuts.includes(d.statut)).map(d => tripFromDestination(d));
  try {
    const oldValises = JSON.parse(localStorage.getItem('voyagemanager_valises') || '{}');
    const oldAgenda = JSON.parse(localStorage.getItem('voyagemanager_agenda') || '{}');
    storeState.trips.forEach(t => {
      t.hasValise = !!oldValises[t.destinationId];
      t.hasAgenda = !!(oldAgenda[t.destinationId] && (oldAgenda[t.destinationId].blocks || []).length);
    });
  } catch (e) { /* ignore */ }
}
