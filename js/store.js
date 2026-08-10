// ============================================================
// store.js — source de vérité unique de l'état applicatif
//
// v4 : absorbe les clés localStorage qui traînaient en vrac
// (vm_pinned, vm_archived, vm_statut_override, vm_roadtrips,
//  vm_hidden_planif) et ajoute une chaîne de migrations.
//
// Les gros volumes (agenda, valises, dépenses) restent dans des clés
// dédiées — les réécrire en bloc à chaque case cochée serait coûteux —
// mais passent tous par lsSet() et sont inclus dans la sauvegarde.
// ============================================================

const STORAGE_KEY = 'vm_store_v2';       // conservé : la migration se fait en interne
const STORE_SCHEMA_VERSION = 4;

const storeState = {
  version: STORE_SCHEMA_VERSION,
  trips: [],
  userDestinations: [],
  userActivities: [],
  pinned: [],           // ids de destinations épinglées au tableau de bord (ordonnés)
  archived: [],         // ids de destinations archivées
  statut: {},           // { destId: statut } — surcharges de catégorie
  roadtrips: [],
  hiddenPlanif: [],     // destinations masquées du tableau de bord
};

let _storeLoaded = false;
const _storeListeners = new Set();

function subscribe(fn) { _storeListeners.add(fn); return () => _storeListeners.delete(fn); }
function _storeEmit() {
  _storeListeners.forEach(fn => { try { fn(storeState); } catch (e) { console.error('[store] listener', e); } });
}

function _storePersist() {
  storeState.version = STORE_SCHEMA_VERSION;
  lsSet(STORAGE_KEY, storeState);
}

/** Persiste + notifie. À appeler après toute mutation. */
function _commit() { _storePersist(); _storeEmit(); }

// ── VOYAGES ──────────────────────────────────────────────
function getTrips() { return storeState.trips; }
function getTrip(id) { return storeState.trips.find(t => t.id === id) || null; }
function getTripByDestination(destId) { return storeState.trips.find(t => t.destinationId === destId) || null; }
function progress(trip) { return computeTripProgress(trip); }

function addTrip(trip) { storeState.trips.push(trip); _commit(); return trip; }

function updateTrip(id, patch) {
  const t = getTrip(id);
  if (!t) return null;
  const changes = typeof patch === 'function' ? patch(t) : patch;
  Object.assign(t, changes, { updatedAt: Date.now() });
  // Synchro descendante : le statut du voyage pilote la catégorie de la destination
  if (changes && changes.status) _syncDestFromTrip(t);
  _commit();
  return t;
}

/**
 * Supprime un voyage ET les projections qu'il pilotait : épinglage et
 * surcharge de catégorie. Sans ce nettoyage, la destination restait
 * « confirmée » et épinglée au tableau de bord alors que plus aucun
 * voyage n'existait — un état affiché sans donnée derrière.
 * Le snapshot renvoyé permet une annulation complète.
 */
function removeTrip(id) {
  const t = getTrip(id);
  if (!t) return null;
  const destId = t.destinationId;
  const snapshot = {
    trip: JSON.parse(JSON.stringify(t)),
    pinnedIndex: storeState.pinned.indexOf(destId),
    statut: storeState.statut[destId],
    destStatut: (destById(destId) || {}).statut,
  };
  storeState.trips = storeState.trips.filter(x => x.id !== id);
  storeState.pinned = storeState.pinned.filter(x => x !== destId);
  delete storeState.statut[destId];
  // La destination redevient un simple projet du catalogue
  const d = destById(destId);
  if (d) d.statut = (d.pays && continentOf(d.pays) === 'Europe') ? 'projet' : 'projet_longterme';
  _commit();
  return snapshot;
}

/** Réinsère un voyage supprimé, avec son épinglage et sa catégorie. */
function restoreTrip(snapshot) {
  if (!snapshot) return;
  // Rétrocompatibilité : anciens snapshots = l'objet voyage brut
  const trip = snapshot.trip || snapshot;
  if (!getTrip(trip.id)) storeState.trips.push(trip);
  if (snapshot.pinnedIndex >= 0 && !storeState.pinned.includes(trip.destinationId)) {
    storeState.pinned.splice(snapshot.pinnedIndex, 0, trip.destinationId);
  }
  if (snapshot.statut) storeState.statut[trip.destinationId] = snapshot.statut;
  const d = destById(trip.destinationId);
  if (d && snapshot.destStatut) d.statut = snapshot.destStatut;
  _commit();
}

// ── Synchro bidirectionnelle Destination ⇄ Voyage ────────
// La destination est un référentiel (catalogue) ; le voyage porte l'état.
// `statut` reste exposé pour les filtres du catalogue, mais il est
// désormais dérivé du voyage dès qu'un voyage existe.
function _syncDestFromTrip(trip) {
  const target = TRIP_TO_CATALOG_STATUS[trip.status];
  if (!target) return;
  const d = (window.DESTINATIONS || []).find(x => x.id === trip.destinationId);
  if (!d || d.statut === target) return;
  d.statut = target;
  storeState.statut[d.id] = target;
}

/** Applique les surcharges de catégorie au catalogue en mémoire. */
function applyStatutOverrides() {
  Object.keys(storeState.statut).forEach(id => {
    const d = (window.DESTINATIONS || []).find(x => x.id === id);
    if (d && window.STATUT_CONFIG && STATUT_CONFIG[storeState.statut[id]]) d.statut = storeState.statut[id];
  });
  // Un voyage existant fait autorité sur la catégorie affichée
  storeState.trips.forEach(t => _syncDestFromTrip(t));
}

function setDestStatutRaw(destId, statut) {
  storeState.statut[destId] = statut;
  const d = (window.DESTINATIONS || []).find(x => x.id === destId);
  if (d) d.statut = statut;
  _commit();
}

// ── ÉPINGLAGE ────────────────────────────────────────────
function getPinnedIds() {
  const archived = storeState.archived;
  return storeState.pinned.filter(id =>
    (window.DESTINATIONS || []).some(d => d.id === id) && !archived.includes(id));
}
function setPinnedIds(ids) { storeState.pinned = ids.slice(); _commit(); }
function isPinned(id) { return storeState.pinned.includes(id); }
function pinDest(id) {
  if (!storeState.pinned.includes(id)) storeState.pinned.push(id);
  storeState.archived = storeState.archived.filter(x => x !== id);
  _commit();
}
function unpinDest(id) { storeState.pinned = storeState.pinned.filter(x => x !== id); _commit(); }

// ── ARCHIVES ─────────────────────────────────────────────
function getArchivedIds() { return storeState.archived.slice(); }
function isArchived(id) { return storeState.archived.includes(id); }
function archiveDest(id) {
  if (!storeState.archived.includes(id)) storeState.archived.push(id);
  storeState.pinned = storeState.pinned.filter(x => x !== id);
  const t = getTripByDestination(id);
  if (t) { t.status = 'archive'; t.updatedAt = Date.now(); }
  _commit();
}
function unarchiveDest(id) {
  storeState.archived = storeState.archived.filter(x => x !== id);
  const t = getTripByDestination(id);
  if (t && t.status === 'archive') { t.status = 'preparation'; t.updatedAt = Date.now(); _syncDestFromTrip(t); }
  _commit();
}

// ── TABLEAU DE BORD : masquage ───────────────────────────
function getHiddenPlanif() { return storeState.hiddenPlanif.slice(); }
function hidePlanif(id) {
  if (!storeState.hiddenPlanif.includes(id)) storeState.hiddenPlanif.push(id);
  _commit();
}
function resetHiddenPlanif() { storeState.hiddenPlanif = []; _commit(); }

// ── ROAD TRIPS ───────────────────────────────────────────
function getRoadtrips() { return storeState.roadtrips; }
function getRoadtrip(id) { return storeState.roadtrips.find(r => r.id === id) || null; }
function saveRoadtrip(rt) {
  const i = storeState.roadtrips.findIndex(r => r.id === rt.id);
  if (i >= 0) storeState.roadtrips[i] = rt; else storeState.roadtrips.push(rt);
  _commit();
  return rt;
}
function removeRoadtrip(id) {
  const snap = getRoadtrip(id);
  storeState.roadtrips = storeState.roadtrips.filter(r => r.id !== id);
  _commit();
  return snap ? JSON.parse(JSON.stringify(snap)) : null;
}
function restoreRoadtrip(snap) { if (snap && !getRoadtrip(snap.id)) { storeState.roadtrips.push(snap); _commit(); } }

// ── CATALOGUE UTILISATEUR ────────────────────────────────
function getUserDestinations() { return storeState.userDestinations; }
function getUserActivities() { return storeState.userActivities; }

function addUserDestination(dest) {
  storeState.userDestinations.push(dest);
  if (window.DESTINATIONS && !window.DESTINATIONS.some(d => d.id === dest.id)) window.DESTINATIONS.push(dest);
  _commit();
  _storeRefreshViews();
  return dest;
}

function addUserActivity(act) { storeState.userActivities.push(act); _commit(); return act; }

function removeUserDestination(id) {
  storeState.userDestinations = storeState.userDestinations.filter(d => d.id !== id);
  if (window.DESTINATIONS) {
    const i = window.DESTINATIONS.findIndex(d => d.id === id);
    if (i >= 0) window.DESTINATIONS.splice(i, 1);
  }
  storeState.trips = storeState.trips.filter(t => t.destinationId !== id);
  storeState.pinned = storeState.pinned.filter(x => x !== id);
  storeState.archived = storeState.archived.filter(x => x !== id);
  delete storeState.statut[id];
  _commit();
  _storeRefreshViews();
}

function updateUserDestination(id, patch) {
  const d = storeState.userDestinations.find(x => x.id === id);
  if (d) Object.assign(d, patch);
  const gd = window.DESTINATIONS && window.DESTINATIONS.find(x => x.id === id);
  if (gd) Object.assign(gd, patch);
  _commit();
  _storeRefreshViews();
}

/** Rafraîchit les vues qui dépendent du catalogue. */
function _storeRefreshViews() {
  ['buildDestGrid', 'buildBudget', 'buildValiseSelect', 'buildSearchSelect',
    'buildAgendaSelect', 'trackerBuildSelect', 'buildPinned', 'buildDashboard']
    .forEach(fn => { try { window[fn] && window[fn](); } catch (e) { console.warn('[store] refresh', fn, e); } });
}

function _storeMergeUserDest() {
  if (!window.DESTINATIONS) return;
  storeState.userDestinations.forEach(d => {
    if (!window.DESTINATIONS.some(x => x.id === d.id)) window.DESTINATIONS.push(d);
  });
}

// ── MIGRATIONS ───────────────────────────────────────────
const LEGACY_KEYS = {
  pinned: 'vm_pinned',
  archived: 'vm_archived',
  statut: 'vm_statut_override',
  roadtrips: 'vm_roadtrips',
  hiddenPlanif: 'vm_hidden_planif',
};

/** v1→v2→v3 : pas de changement de forme. v3→v4 : absorption des clés éparses. */
function _migrate(parsed) {
  const from = parsed.version || 1;
  const s = {
    version: STORE_SCHEMA_VERSION,
    trips: Array.isArray(parsed.trips) ? parsed.trips : [],
    userDestinations: Array.isArray(parsed.userDestinations) ? parsed.userDestinations : [],
    userActivities: Array.isArray(parsed.userActivities) ? parsed.userActivities : [],
    pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
    archived: Array.isArray(parsed.archived) ? parsed.archived : [],
    statut: (parsed.statut && typeof parsed.statut === 'object') ? parsed.statut : {},
    roadtrips: Array.isArray(parsed.roadtrips) ? parsed.roadtrips : [],
    hiddenPlanif: Array.isArray(parsed.hiddenPlanif) ? parsed.hiddenPlanif : [],
  };
  if (from < 4) {
    // Reprend les anciennes clés autonomes, puis les retire
    const legacyArr = (key, fallback) => {
      const v = lsGet(key, fallback);
      return Array.isArray(v) ? v : fallback;
    };
    if (!s.pinned.length) s.pinned = legacyArr(LEGACY_KEYS.pinned, []);
    if (!s.archived.length) s.archived = legacyArr(LEGACY_KEYS.archived, []);
    if (!s.roadtrips.length) s.roadtrips = legacyArr(LEGACY_KEYS.roadtrips, []);
    if (!s.hiddenPlanif.length) s.hiddenPlanif = legacyArr(LEGACY_KEYS.hiddenPlanif, []);
    if (!Object.keys(s.statut).length) {
      const o = lsGet(LEGACY_KEYS.statut, {});
      if (o && typeof o === 'object' && !Array.isArray(o)) s.statut = o;
    }
    Object.values(LEGACY_KEYS).forEach(lsRemove);
    console.info('[store] migration v' + from + ' → v4 effectuée');
  }
  return s;
}

function loadStore() {
  if (_storeLoaded) return storeState;
  const raw = lsGetRawString(STORAGE_KEY);
  if (raw) {
    try {
      Object.assign(storeState, _migrate(JSON.parse(raw)));
      _storeMergeUserDest();
      _storeLoaded = true;
      _storePersist();  // réécrit au format v4
      return storeState;
    } catch (e) {
      console.warn('[store] sauvegarde illisible — backup + réinitialisation', e);
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      lsSet(STORAGE_KEY + '_backup_' + ts, raw);
      setTimeout(() => showToast('⚠️ Sauvegarde corrompue — données réinitialisées (une copie a été conservée)', { tone: 'error', ms: 8000 }), 1200);
    }
  }
  // Espace vierge : aucun voyage pré-créé
  Object.assign(storeState, _migrate({ version: 1 }));
  _storePersist();
  _storeLoaded = true;
  return storeState;
}

Object.assign(window, {
  STORAGE_KEY, STORE_SCHEMA_VERSION, storeState, subscribe, loadStore,
  getTrips, getTrip, getTripByDestination, progress, addTrip, updateTrip, removeTrip, restoreTrip,
  applyStatutOverrides, setDestStatutRaw,
  getPinnedIds, setPinnedIds, isPinned, pinDest, unpinDest,
  getArchivedIds, isArchived, archiveDest, unarchiveDest,
  getHiddenPlanif, hidePlanif, resetHiddenPlanif,
  getRoadtrips, getRoadtrip, saveRoadtrip, removeRoadtrip, restoreRoadtrip,
  getUserDestinations, getUserActivities, addUserDestination, addUserActivity,
  removeUserDestination, updateUserDestination,
});
