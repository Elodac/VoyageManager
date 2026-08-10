// ============================================================
// views/search.js — recherche rapide sur les grands sites
// Les liens sont construits à partir des préférences (aéroport de
// départ, nombre de voyageurs) : plus de « NTE » ni de dates figées.
// ============================================================
(function () {

function buildSearchSelect() {
  const sel = $('#search-dest-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Choisir une destination —</option>'
    + activeDests().slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
        .map(d => `<option value="${escAttr(d.id)}">${escHtml(d.emoji + ' ' + d.nom + ' — ' + d.pays)}</option>`).join('');
}

function searchSelectDest(destId) {
  const sel = $('#search-dest-select');
  if (sel && destId) { sel.value = destId; updateSearchLinks(); }
}

function updateSearchLinks() {
  const id = $('#search-dest-select')?.value;
  const info = $('#search-dest-info');
  const boxes = ['links-vols', 'links-logement', 'links-transport', 'links-activites'];
  if (!id) {
    boxes.forEach(b => { const el = document.getElementById(b); if (el) el.innerHTML = '<p class="hint">Choisis une destination.</p>'; });
    if (info) info.textContent = '';
    return;
  }
  const d = destById(id);
  if (!d) return;
  const trip = getTripByDestination(id);
  const ctx = bookingContext({ dest: d, trip });
  const p = getPrefs();

  if (info) {
    info.innerHTML = `<strong>${escHtml(d.emoji + ' ' + d.nom)}</strong> · `
      + (ctx.hasDates
        ? `<span class="txt-green">${escHtml(ctx.checkin)} → ${escHtml(ctx.checkout)}</span>`
        : '<span class="txt-yellow">dates non définies</span>')
      + ` · ${escHtml(ctx.travelers)} voyageur(s) · départ ${escHtml(p.departIata)}`
      + (trip ? '' : ' · <button type="button" class="link-btn" data-search-create="' + escAttr(d.id) + '">créer le voyage</button>');
  }

  $('#links-vols').innerHTML = bookingLinksHTML(flightLinks({ dest: d, trip }), ctx);
  $('#links-logement').innerHTML = bookingLinksHTML(lodgingLinks({ dest: d, trip }), ctx);
  const tr = $('#links-transport');
  if (tr) tr.innerHTML = bookingLinksHTML(groundLinks({ dest: d, trip }), ctx);
  $('#links-activites').innerHTML = bookingLinksHTML(activityLinks({ dest: d, trip }), ctx);
}

function init() {
  const page = document.getElementById('page-recherche');
  if (!page) return;
  delegate(page, 'change', '#search-dest-select', updateSearchLinks);
  delegate(page, 'click', '[data-go-prefs]', () => showPage('reglages'));
  delegate(page, 'click', '[data-search-create]', (e, el) =>
    window.createVoyageFromDest && createVoyageFromDest(el.dataset.searchCreate));
  buildSearchSelect();
  updateSearchLinks();
  subscribe(buildSearchSelect);
  document.addEventListener('vm:prefs-changed', updateSearchLinks);
}

Object.assign(window, { buildSearchSelect, updateSearchLinks, searchSelectDest, initSearch: init });
})();
