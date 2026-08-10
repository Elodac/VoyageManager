// ============================================================
// app.js — amorçage de l'application
// Chargé en dernier : orchestre l'ordre d'initialisation.
// ============================================================
(function () {

const ONBOARD_KEY = 'vm_onboarded';

function maybeShowOnboarding() {
  if (sessionStorage.getItem(PROFILE_SESSION_KEY) !== window.__profile) return;
  if (lsGet(ONBOARD_KEY, false)) return;
  setTimeout(() => {
    const ov = $('#onboarding-overlay');
    if (ov) openOverlay(ov);
  }, 400);
}

function closeOnboarding() {
  lsSet(ONBOARD_KEY, true);
  closeOverlay('#onboarding-overlay');
}

/** Badge « prochain départ » de la barre latérale. */
function updateNavBadge() {
  const el = $('#nav-badge');
  if (!el) return;
  const today = todayISO();
  const next = getTrips()
    .filter(t => t.status !== 'archive' && t.date_depart && t.date_depart >= today)
    .sort((a, b) => a.date_depart.localeCompare(b.date_depart))[0];
  if (!next) { el.textContent = ''; return; }
  const dt = new Date(next.date_depart + 'T12:00:00');
  el.textContent = shortName(next) + ' · ' + dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Enregistre le service worker (mode hors ligne).
 *
 * Volontairement DÉSACTIVÉ en local : un cache « cache-first » renvoie
 * l'ancien code au rechargement, ce qui fait perdre un temps fou en
 * développement (on croit déboguer une logique alors qu'on teste une
 * version périmée). En local, on désenregistre même un SW déjà installé.
 */
const IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  if (IS_LOCAL) {
    navigator.serviceWorker.getRegistrations()
      .then(rs => rs.forEach(r => r.unregister()))
      .then(() => caches && caches.keys().then(ks => ks.forEach(k => caches.delete(k))))
      .catch(() => { /* rien à nettoyer */ });
    return;
  }
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('[sw] non enregistré', e));
}

function boot() {
  // 1. Données et état
  loadStore();
  applyGlobalDests();      // destinations communes (admin)
  applyCountryDefaults();  // langue, fuseau, devise déduits du pays
  applyUserActivities();   // lieux ajoutés par l'utilisateur
  applyStatutOverrides();  // catégories personnalisées + projection des voyages
  loadTripData();          // agendas / valises / dépenses (+ migration destId → tripId)

  // 2. Vues
  initRouter();
  initDashboard();
  initDestinations();
  initDestModal();
  initMapView();
  initAgenda();
  initValises();
  initBudget();
  initRoadtrips();
  initArchives();
  initSearch();
  initTransport();
  initPrograms();
  initForms();
  initPrefs();
  initPalette();
  initBackup();

  // 3. Chrome applicatif
  updateNavBadge();
  subscribe(updateNavBadge);
  $('#onboarding-close')?.addEventListener('click', closeOnboarding);
  $('#shortcuts-btn')?.addEventListener('click', showShortcutsHelp);
  $('#clear-history-btn')?.addEventListener('click', clearHistory);

  // 4. Profils (en dernier : masque ou affiche le portail)
  vmProfilesBoot();

  registerServiceWorker();
}

// Les scripts sont chargés en `defer` : le DOM est prêt à l'exécution.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

Object.assign(window, { maybeShowOnboarding, closeOnboarding, updateNavBadge });
})();
