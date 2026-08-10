// ============================================================
// views/destinations.js — catalogue : grille, filtres, tri, continents
// ============================================================
(function () {

let currentFiltre = 'all';
let currentSearchQuery = '';
let currentSort = 'default';
let currentCountry = 'all';
let viewMode = 'grid';   // 'grid' | 'continent'

const TYPE_FILTERS = ['plage', 'ville', 'nature', 'culture', 'randonnee'];

// ── Filtres avancés (dates + budget ± tolérance) ─────────
const advFilter = { depart: '', retour: '', budget: null, tol: 10 };

function readAdvFilter() {
  advFilter.depart = $('#flt-depart')?.value || '';
  advFilter.retour = $('#flt-retour')?.value || '';
  const b = parseFloat($('#flt-budget')?.value);
  advFilter.budget = isNaN(b) ? null : b;
  const t = parseFloat($('#flt-tol')?.value);
  advFilter.tol = isNaN(t) ? 10 : t;
}

function applyAdvFilter() {
  readAdvFilter();
  const note = $('#tol-note');
  if (note) {
    if (advFilter.budget != null) {
      const ceil = Math.round(advFilter.budget * (1 + advFilter.tol / 100));
      note.innerHTML = `Budget cible <strong>${advFilter.budget}€</strong> · plafond avec +${advFilter.tol}% = <strong>${ceil}€</strong>. `
        + `Les destinations dont le budget mini dépasse ce plafond sont grisées. `
        + `Les destinations <strong>flexibles</strong> (sans dates fixes) restent proposées.`;
    } else {
      note.innerHTML = 'Renseigne des dates et/ou un budget pour affiner. '
        + 'Les destinations <strong>flexibles</strong> (sans dates fixes) restent toujours proposées.';
    }
  }
  renderDestGrid();
}

function resetAdvFilter() {
  ['flt-depart', 'flt-retour', 'flt-budget'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const tol = $('#flt-tol'); if (tol) tol.value = '10';
  applyAdvFilter();
}

/** 'ok' | 'flex' | 'no' selon l'adéquation aux filtres avancés. */
function matchAdvFilter(d) {
  let budgetOk = true, dateState = 'flex';
  if (advFilter.budget != null) {
    budgetOk = (d.budget_min || 0) <= advFilter.budget * (1 + advFilter.tol / 100);
  }
  if (advFilter.depart || advFilter.retour) {
    if (d.date_depart && d.date_retour) {
      const fD = advFilter.depart ? new Date(advFilter.depart) : null;
      const fR = advFilter.retour ? new Date(advFilter.retour) : null;
      const dD = new Date(d.date_depart), dR = new Date(d.date_retour);
      let overlap = true;
      if (fD && dR < fD) overlap = false;
      if (fR && dD > fR) overlap = false;
      dateState = overlap ? 'ok' : 'no-date';
    }
  }
  if (!budgetOk || dateState === 'no-date') return 'no';
  if ((advFilter.depart || advFilter.retour) && dateState === 'ok') return 'ok';
  if (advFilter.budget != null && budgetOk) return 'ok';
  return 'flex';
}

// ── Rendu d'une carte ────────────────────────────────────
function destCardHTML(d, match) {
  const s = statutMeta(d.statut);
  const pill = match === 'ok' ? '<span class="match-pill match-ok">✓ correspond</span>'
    : match === 'flex' ? '<span class="match-pill match-flex">flexible</span>' : '';
  const dim = match === 'no' ? ' dim' : '';
  const hasTrip = !!getTripByDestination(d.id);
  return `
    <article class="dest-card${dim}" data-dest="${escAttr(d.id)}" tabindex="0" role="button"
             aria-label="Ouvrir la fiche ${escAttr(d.nom)}">
      ${pill}
      ${hasTrip ? '<span class="dest-trip-flag" title="Un voyage existe déjà">🧳</span>' : ''}
      <div class="dest-emoji" aria-hidden="true">${escHtml(d.emoji)}</div>
      <h3 class="dest-name">${escHtml(d.nom)}</h3>
      <p class="dest-pays">${escHtml(d.pays)}</p>
      <span class="badge badge-${escAttr(s.cls)}">${escHtml(s.label)}</span>
      <p class="dest-budget">💶 ${escHtml(d.budget_min)}–${escHtml(d.budget_max)}€</p>
      <div class="dest-types">${(d.type || []).slice(0, 3)
        .map(t => `<span class="type-tag">${escHtml((window.TYPE_ICONS && TYPE_ICONS[t]) || '')}${escHtml(t)}</span>`).join('')}</div>
    </article>`;
}

function sortDests(arr) {
  const a = arr.slice();
  const order = { confirme: 0, planification: 1, projet: 2, projet_longterme: 3 };
  switch (currentSort) {
    case 'nom': return a.sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
    case 'nom_desc': return a.sort((x, y) => y.nom.localeCompare(x.nom, 'fr'));
    case 'budget_asc': return a.sort((x, y) => (x.budget_min || 0) - (y.budget_min || 0));
    case 'budget_desc': return a.sort((x, y) => (y.budget_max || 0) - (x.budget_max || 0));
    case 'statut': return a.sort((x, y) =>
      (order[x.statut] ?? 9) - (order[y.statut] ?? 9) || x.nom.localeCompare(y.nom, 'fr'));
    default: return a;
  }
}

function renderDestGrid() {
  const grid = $('#dest-grid');
  if (!grid) return;
  const q = currentSearchQuery.toLowerCase();
  const list = activeDests()
    .filter(d => currentCountry === 'all' || d.pays === currentCountry)
    .filter(d => {
      if (currentFiltre === 'all') return true;
      if (TYPE_FILTERS.includes(currentFiltre)) return (d.type || []).includes(currentFiltre);
      return d.statut === currentFiltre;
    })
    .filter(d => !q || d.nom.toLowerCase().includes(q) || (d.pays || '').toLowerCase().includes(q)
      || (d.type || []).some(t => t.includes(q)));

  updateCountryCta();

  const total = activeDests().length;
  const cnt = $('#dest-count');
  if (cnt) {cnt.textContent = list.length === total
    ? `${total} destinations`
    : `${list.length} sur ${total} destinations`;}

  const advActive = advFilter.budget != null || advFilter.depart || advFilter.retour;

  if (!list.length) {
    grid.className = '';
    grid.innerHTML = `<div class="pin-empty"><p><strong>Aucune destination ne correspond.</strong></p>
      <button type="button" class="btn btn-outline btn-sm" data-reset-all>↩ Réinitialiser les filtres</button></div>`;
    return;
  }

  if (viewMode === 'continent') {
    const groups = {};
    list.forEach(d => {
      const c = continentOf(d.pays);
      (groups[c] = groups[c] || {});
      (groups[c][d.pays] = groups[c][d.pays] || []).push(d);
    });
    const continents = CONTINENT_ORDER.filter(c => groups[c])
      .concat(Object.keys(groups).filter(c => !CONTINENT_ORDER.includes(c)).sort());
    grid.className = '';
    grid.innerHTML = continents.map(cont => {
      const countries = Object.keys(groups[cont]).sort((a, b) => a.localeCompare(b, 'fr'));
      return `<section class="continent-section">
        <h2 class="continent-header">${escHtml(CONTINENT_EMOJI[cont] || '🌐')} ${escHtml(cont)}</h2>
        ${countries.map(pays => {
          const dests = currentSort === 'default'
            ? groups[cont][pays].slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
            : sortDests(groups[cont][pays]);
          return `<div class="country-group">
            <h3 class="country-label">🏳 ${escHtml(pays)} <span class="count-badge">${dests.length}</span></h3>
            <div class="grid grid-4">${dests.map(d => destCardHTML(d, advActive ? matchAdvFilter(d) : undefined)).join('')}</div>
          </div>`;
        }).join('')}
      </section>`;
    }).join('');
    return;
  }

  grid.className = 'grid grid-4';
  if (advActive) {
    const rank = { ok: 0, flex: 1, no: 2 };
    grid.innerHTML = list.map(d => ({ d, m: matchAdvFilter(d) }))
      .sort((a, b) => rank[a.m] - rank[b.m])
      .map(x => destCardHTML(x.d, x.m)).join('');
  } else {
    grid.innerHTML = sortDests(list).map(d => destCardHTML(d)).join('');
  }
}

function buildDestGrid() { buildCountryFilter(); renderDestGrid(); }

// ── Filtres ──────────────────────────────────────────────
function setFiltre(f) {
  currentFiltre = f;
  sessionStorage.setItem('vm_filtre', f);
  $$('.filtre-btn[data-filtre]').forEach(b => {
    const on = b.dataset.filtre === f;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  renderDestGrid();
}

function setSort(v) { currentSort = v; sessionStorage.setItem('vm_sort', v); renderDestGrid(); }

function setViewMode(mode) {
  viewMode = mode;
  sessionStorage.setItem('vm_view', mode);
  $('#view-grid-btn')?.setAttribute('aria-pressed', mode === 'grid' ? 'true' : 'false');
  $('#view-continent-btn')?.setAttribute('aria-pressed', mode === 'continent' ? 'true' : 'false');
  $('#view-grid-btn')?.classList.toggle('active', mode === 'grid');
  $('#view-continent-btn')?.classList.toggle('active', mode === 'continent');
  renderDestGrid();
}

function buildCountryFilter() {
  const sel = $('#country-filter');
  if (!sel) return;
  const counts = {};
  activeDests().forEach(d => { counts[d.pays] = (counts[d.pays] || 0) + 1; });
  const countries = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'fr'));
  sel.innerHTML = `<option value="all">Tous les pays (${activeDests().length})</option>`
    + countries.map(c => `<option value="${escAttr(c)}">${escHtml(c)} (${counts[c]})</option>`).join('');
  sel.value = currentCountry;
}

function setCountryFilter(v) {
  currentCountry = v;
  sessionStorage.setItem('vm_country', v);
  if (v !== 'all' && viewMode === 'continent') setViewMode('grid');
  else renderDestGrid();
}

function updateCountryCta() {
  const cta = $('#country-roadtrip-cta');
  if (!cta) return;
  if (currentCountry === 'all') { cta.innerHTML = ''; return; }
  const n = activeDests().filter(d => d.pays === currentCountry).length;
  cta.innerHTML = n >= 2
    ? `<button type="button" class="btn btn-success btn-sm" data-rt-country="${escAttr(currentCountry)}">🚗 Road trip ${escHtml(currentCountry)} (${n} étapes)</button>`
    : '';
}

function restoreFilters() {
  const f = sessionStorage.getItem('vm_filtre');
  if (f) setFiltre(f);
  const q = sessionStorage.getItem('vm_search');
  if (q) { currentSearchQuery = q; const inp = $('#dest-search'); if (inp) inp.value = q; }
  const co = sessionStorage.getItem('vm_country');
  if (co) currentCountry = co;
  const s = sessionStorage.getItem('vm_sort');
  if (s) { currentSort = s; const sel = $('#sort-select'); if (sel) sel.value = s; }
  const v = sessionStorage.getItem('vm_view');
  if (v) viewMode = v;
}

// ── Câblage ──────────────────────────────────────────────
function init() {
  const page = document.getElementById('page-destinations');
  if (!page) return;

  delegate(page, 'click', '[data-filtre]', (e, el) => setFiltre(el.dataset.filtre));
  delegate(page, 'change', '#sort-select', (e, el) => setSort(el.value));
  delegate(page, 'change', '#country-filter', (e, el) => setCountryFilter(el.value));
  delegate(page, 'click', '#view-grid-btn', () => setViewMode('grid'));
  delegate(page, 'click', '#view-continent-btn', () => setViewMode('continent'));
  delegate(page, 'click', '[data-reset-adv]', resetAdvFilter);
  delegate(page, 'click', '[data-reset-all]', () => {
    currentSearchQuery = ''; const s = $('#dest-search'); if (s) s.value = '';
    setCountryFilter('all'); setFiltre('all'); resetAdvFilter();
  });
  delegate(page, 'change', '#flt-depart,#flt-retour', applyAdvFilter);
  delegate(page, 'input', '#flt-budget,#flt-tol', debounce(applyAdvFilter, 200));
  delegate(page, 'click', '[data-rt-country]', (e, el) => window.rtFromCountry && rtFromCountry(el.dataset.rtCountry));

  delegate(page, 'input', '#dest-search', debounce((e, el) => {
    currentSearchQuery = el.value || '';
    sessionStorage.setItem('vm_search', currentSearchQuery);
    renderDestGrid();
  }, 280));

  delegate(page, 'click', '.dest-card', (e, el) => { if (!e.target.closest('button')) openDest(el.dataset.dest); });
  delegate(page, 'keydown', '.dest-card', (e, el) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openDest(el.dataset.dest);
  });

  restoreFilters();
  buildDestGrid();
  subscribe(() => { buildCountryFilter(); renderDestGrid(); });
}

Object.assign(window, {
  buildDestGrid, renderDestGrid, destCardHTML, sortDests, matchAdvFilter,
  setFiltre, setSort, setViewMode, setCountryFilter, resetAdvFilter, applyAdvFilter,
  buildCountryFilter, restoreFilters, initDestinations: init,
  get currentCountry() { return currentCountry; },
});
})();
