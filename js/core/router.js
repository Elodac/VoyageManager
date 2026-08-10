// ============================================================
// core/router.js — navigation entre pages
// Plus de parsing de l'attribut onclick : chaque bouton porte data-page.
// ============================================================

let currentPage = 'dashboard';
const ADMIN_PAGES = ['historique'];

/** Rendus à (re)déclencher à l'entrée sur une page. */
const PAGE_HOOKS = {
  carte:      () => window.vmMapEnter && vmMapEnter(),
  archives:   () => window.buildArchives && buildArchives(),
  roadtrips:  () => window.buildRoadtrips && buildRoadtrips(),
  historique: () => window.buildHistorique && buildHistorique(),
  valises:    () => window.loadValise && loadValise(),
  budget:     () => window.buildBudget && buildBudget(),
  reglages:   () => window.buildPrefs && buildPrefs(),
};

function showPage(id) {
  if (ADMIN_PAGES.includes(id) && !isAdmin()) {
    showToast('🔒 Réservé à l\'administrateur');
    id = 'dashboard';
  }
  const target = document.getElementById('page-' + id);
  if (!target) return;

  document.body.classList.remove('nav-open');
  $('.sidebar-toggle')?.setAttribute('aria-expanded', 'false');

  $$('.page').forEach(p => { p.classList.remove('active'); p.hidden = true; });
  target.classList.add('active');
  target.hidden = false;

  $$('.nav-btn').forEach(b => {
    const on = b.dataset.page === id;
    b.classList.toggle('active', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });

  currentPage = id;
  window.currentPage = id;
  sessionStorage.setItem('vm_page', id);

  if (PAGE_HOOKS[id]) PAGE_HOOKS[id]();

  // Le focus va au titre de la page : le lecteur d'écran annonce le changement
  const h1 = target.querySelector('h1');
  if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  const main = $('main'); if (main) main.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function toggleNav() {
  const open = document.body.classList.toggle('nav-open');
  $('.sidebar-toggle')?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/** Navigation vers une page en pré-sélectionnant un voyage. */
function vmGoTo(page, tripId) {
  showPage(page);
  setTimeout(() => {
    const t = window.getTrip && getTrip(tripId);
    const destId = t ? t.destinationId : tripId;
    if (page === 'transport' && window.transportSelect) transportSelect(destId);
    else if (page === 'programmes' && window.programsSelect) programsSelect(destId);
    else if (page === 'agenda' && window.agSelectTrip) agSelectTrip(tripId);
    else if (page === 'valises' && window.valiseSelectTrip) valiseSelectTrip(tripId);
    else if (page === 'recherche' && window.searchSelectDest) searchSelectDest(destId);
    else if (page === 'carte' && window.focusMap) focusMap(destId);
  }, 80);
}

function initRouter() {
  delegate('#nav-links', 'click', '[data-page]', (e, el) => showPage(el.dataset.page));
  $('.sidebar-toggle')?.addEventListener('click', toggleNav);
  $('#sidebar-backdrop')?.addEventListener('click', toggleNav);
  $('#theme-toggle')?.addEventListener('click', toggleTheme);
  $('#logout-btn')?.addEventListener('click', vmLogout);

  const saved = sessionStorage.getItem('vm_page');
  const el = saved && document.getElementById('page-' + saved);
  if (el && !(ADMIN_PAGES.includes(saved) && !isAdmin())) showPage(saved);
  else showPage('dashboard');
}

Object.assign(window, { currentPage, ADMIN_PAGES, showPage, toggleNav, vmGoTo, initRouter });
