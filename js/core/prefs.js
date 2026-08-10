// ============================================================
// core/prefs.js — préférences utilisateur
// Remplace toutes les valeurs codées en dur (Nantes / NTE / 2 pers. /
// 6.5 L/100 / dates de repli juillet 2026) par des réglages persistés.
// ============================================================

const PREFS_KEY = 'vm_prefs';

const DEFAULT_PREFS = {
  departCity: 'Nantes',    // ville de départ (référence FR_CITIES)
  departIata: 'NTE',       // aéroport de départ (référence AIRPORTS)
  travelers: 2,            // nombre de voyageurs (liens Booking/Airbnb, budgets)
  carConso: 6.5,           // L/100 km
  carFuelPrice: 1.85,      // €/L
  tollRate: 0.075,         // €/km d'autoroute
  defaultTripDays: 5,      // durée par défaut d'un nouveau voyage
  homeCurrency: 'EUR',
};

let _prefs = null;

function getPrefs() {
  if (!_prefs) _prefs = Object.assign({}, DEFAULT_PREFS, lsGet(PREFS_KEY, {}));
  return _prefs;
}

function pref(key) { return getPrefs()[key]; }

function setPrefs(patch) {
  _prefs = Object.assign({}, getPrefs(), patch);
  lsSet(PREFS_KEY, _prefs);
  document.dispatchEvent(new CustomEvent('vm:prefs-changed', { detail: _prefs }));
  return _prefs;
}

function resetPrefs() {
  _prefs = Object.assign({}, DEFAULT_PREFS);
  lsSet(PREFS_KEY, _prefs);
  document.dispatchEvent(new CustomEvent('vm:prefs-changed', { detail: _prefs }));
  return _prefs;
}

// ── Dates par défaut : plus aucune date en dur ──
const todayISO = () => new Date().toISOString().slice(0, 10);
function addDaysISO(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Fenêtre de dates par défaut : à partir d'aujourd'hui, sur `defaultTripDays`. */
function defaultDateRange() {
  const start = todayISO();
  return { start, end: addDaysISO(start, Math.max(1, +pref('defaultTripDays') || 5) - 1) };
}

Object.assign(window, {
  PREFS_KEY, DEFAULT_PREFS, getPrefs, pref, setPrefs, resetPrefs,
  todayISO, addDaysISO, defaultDateRange,
});
