// ============================================================
// core/tripdata.js — données volumineuses rattachées à un VOYAGE
// (agenda, valise, dépenses)
//
// Avant : ces trois états étaient indexés par `destId`. Deux voyages
// vers la même ville partageaient donc le même planning, la même
// valise et les mêmes dépenses. Ils sont désormais indexés par
// `tripId`, avec migration automatique de l'ancien format.
//
// Ces clés restent séparées du store principal : les réécrire en bloc
// à chaque case cochée serait inutilement coûteux.
// ============================================================

const AGENDA_KEY = 'voyagemanager_agenda';
const VALISE_KEY = 'voyagemanager_valises';
const EXPENSE_KEY = 'vm_expenses_v1';
const TRIPDATA_MIGRATED = 'vm_tripdata_v2';

let _agenda = {};
let _valises = {};
let _expenses = {};

function loadTripData() {
  _agenda = lsGet(AGENDA_KEY, {}) || {};
  _valises = lsGet(VALISE_KEY, {}) || {};
  _expenses = lsGet(EXPENSE_KEY, {}) || {};
  _migrateDestToTrip();
}

/**
 * Migration destId → tripId. Les entrées sans voyage correspondant
 * sont conservées telles quelles : elles seront reprises si un voyage
 * est créé plus tard vers cette destination (cf. adoptLegacy*).
 */
function _migrateDestToTrip() {
  if (lsGet(TRIPDATA_MIGRATED, false)) return;
  const remap = (obj) => {
    const out = {};
    Object.keys(obj).forEach(key => {
      const trip = getTripByDestination(key);
      out[trip ? trip.id : key] = obj[key];
    });
    return out;
  };
  _agenda = remap(_agenda);
  _valises = remap(_valises);
  _expenses = remap(_expenses);
  saveAgendaAll(); saveValisesAll(); saveExpensesAll();
  lsSet(TRIPDATA_MIGRATED, true);
  console.info('[tripdata] migration destId → tripId effectuée');
}

/** Reprend d'éventuelles données historiques encore indexées par destination. */
function adoptLegacyForTrip(trip) {
  if (!trip || !trip.destinationId) return;
  const d = trip.destinationId;
  let changed = false;
  if (_agenda[d] && !_agenda[trip.id]) { _agenda[trip.id] = _agenda[d]; delete _agenda[d]; changed = true; }
  if (_valises[d] && !_valises[trip.id]) { _valises[trip.id] = _valises[d]; delete _valises[d]; changed = true; }
  if (_expenses[d] && !_expenses[trip.id]) { _expenses[trip.id] = _expenses[d]; delete _expenses[d]; changed = true; }
  if (changed) { saveAgendaAll(); saveValisesAll(); saveExpensesAll(); }
}

/** Supprime les données rattachées à un voyage (renvoie un snapshot annulable). */
function dropTripData(tripId) {
  const snap = { agenda: _agenda[tripId], valise: _valises[tripId], expenses: _expenses[tripId] };
  delete _agenda[tripId]; delete _valises[tripId]; delete _expenses[tripId];
  saveAgendaAll(); saveValisesAll(); saveExpensesAll();
  return snap;
}

function restoreTripData(tripId, snap) {
  if (!snap) return;
  if (snap.agenda) _agenda[tripId] = snap.agenda;
  if (snap.valise) _valises[tripId] = snap.valise;
  if (snap.expenses) _expenses[tripId] = snap.expenses;
  saveAgendaAll(); saveValisesAll(); saveExpensesAll();
}

// ── Accesseurs ───────────────────────────────────────────
const getAgendaAll = () => _agenda;
const getAgenda = tripId => _agenda[tripId] || null;
const setAgenda = (tripId, st) => { _agenda[tripId] = st; saveAgendaAll(); };
const saveAgendaAll = () => lsSet(AGENDA_KEY, _agenda);

const getValisesAll = () => _valises;
const getValise = tripId => _valises[tripId] || null;
const setValise = (tripId, st) => { _valises[tripId] = st; saveValisesAll(); };
const saveValisesAll = () => lsSet(VALISE_KEY, _valises);

const getExpensesAll = () => _expenses;
const getExpenses = tripId => _expenses[tripId] || [];
const setExpenses = (tripId, list) => { _expenses[tripId] = list; saveExpensesAll(); };
const saveExpensesAll = () => lsSet(EXPENSE_KEY, _expenses);

Object.assign(window, {
  AGENDA_KEY, VALISE_KEY, EXPENSE_KEY, TRIPDATA_MIGRATED,
  loadTripData, adoptLegacyForTrip, dropTripData, restoreTripData,
  getAgendaAll, getAgenda, setAgenda, saveAgendaAll,
  getValisesAll, getValise, setValise, saveValisesAll,
  getExpensesAll, getExpenses, setExpenses, saveExpensesAll,
});
