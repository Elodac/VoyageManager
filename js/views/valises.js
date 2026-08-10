// ============================================================
// views/valises.js — check-list de valise par VOYAGE
//
// Corrigé : les intitulés d'items ne sont plus injectés bruts dans
// du HTML ni dans des attributs onclick (l'ancien `esc()` n'échappait
// que l'apostrophe). Tout passe par la délégation + des index.
// ============================================================
(function () {

let current = null;      // tripId
let state = {};          // { cat: { item: bool } } du voyage courant

function tmplFor(trip) {
  const d = destById(trip.destinationId) || {};
  const T = window.VALISE_TEMPLATES || {};
  return T[d.valise_type] || T.plage || Object.values(T)[0] || { label: 'Générique', categories: {} };
}

function buildValiseSelect() {
  const sel = $('#valise-dest-select');
  if (!sel) return;
  const trips = getTrips().filter(t => t.status !== 'archive');
  sel.innerHTML = '<option value="">— Choisir un voyage —</option>'
    + trips.map(t => {
      const tm = tmplFor(t);
      return `<option value="${escAttr(t.id)}">${escHtml(tripLabel(t))} — ${escHtml(tm.label)}</option>`;
    }).join('');
  if (current && trips.some(t => t.id === current)) sel.value = current;
  const empty = $('#valise-no-trip');
  if (empty) empty.hidden = trips.length > 0;
}

function valiseSelectTrip(tripId) {
  const sel = $('#valise-dest-select');
  if (sel && tripId) { sel.value = tripId; loadValise(); }
}

function loadValise() {
  const sel = $('#valise-dest-select');
  if (!sel) return;
  const id = sel.value;
  const actions = $('#valise-actions');
  const info = $('#valise-info');
  if (!id) {
    current = null;
    if (actions) actions.hidden = true;
    if (info) info.hidden = true;
    $('#valise-body').innerHTML = '<div class="pin-empty">🧳 Choisis un voyage pour afficher sa check-list personnalisée.</div>';
    return;
  }
  current = id;
  const trip = getTrip(id);
  if (!trip) return;
  const tmpl = tmplFor(trip);

  if (actions) actions.hidden = false;
  if (info) {
    info.hidden = false;
    info.innerHTML = `🧳 <strong>${escHtml(trip.nom)}</strong> — modèle : <strong>${escHtml(tmpl.label)}</strong>`
      + ` · ${escHtml(trip.travelers || 2)} voyageur(s)`;
  }

  state = getValise(id);
  if (!state) {
    state = {};
    Object.entries(tmpl.categories).forEach(([cat, items]) => {
      state[cat] = {};
      items.forEach(item => { state[cat][item] = false; });
    });
    setValise(id, state);
  }
  renderValise();
}

function renderValise() {
  if (!current) return;
  const trip = getTrip(current);
  const tmpl = tmplFor(trip);
  const tmplCats = Object.keys(tmpl.categories);
  const allCats = [...tmplCats, ...Object.keys(state).filter(c => !tmplCats.includes(c))];

  let total = 0, checked = 0;
  const html = allCats.map((cat, ci) => {
    const catState = state[cat] || {};
    const items = Object.keys(catState);
    const done = items.filter(i => catState[i]);
    total += items.length;
    checked += done.length;
    const isCustom = !tmplCats.includes(cat);
    return `
      <section class="checklist-cat" data-cat-index="${ci}">
        <h3>
          ${escHtml(cat)} <span class="cat-count">${done.length}/${items.length}</span>
          ${isCustom ? `<button type="button" class="del-cat" data-del-cat="${ci}"
             aria-label="Supprimer la catégorie ${escAttr(cat)}">✕</button>` : ''}
        </h3>
        <div class="checklist-items">
          ${items.map((item, ii) => {
            const id = `vl-${ci}-${ii}`;
            return `<div class="check-item ${catState[item] ? 'checked' : ''}" data-item-index="${ii}">
              <span class="drag-handle" draggable="true" data-drag-item="${ci}:${ii}" aria-hidden="true"
                    title="Glisser vers une autre catégorie">⠿</span>
              <input type="checkbox" id="${escAttr(id)}" ${catState[item] ? 'checked' : ''} data-toggle-item="${ci}:${ii}">
              <label class="item-text" for="${escAttr(id)}">${escHtml(item)}</label>
              <span class="item-actions">
                <button type="button" class="edit-item" data-edit-item="${ci}:${ii}"
                        aria-label="Renommer ${escAttr(item)}">✏</button>
                <button type="button" class="del-item" data-del-item="${ci}:${ii}"
                        aria-label="Supprimer ${escAttr(item)}">✕</button>
              </span>
            </div>`;
          }).join('')}
        </div>
        <div class="add-item-row">
          <label class="visually-hidden" for="add-item-${ci}">Ajouter un élément à ${escAttr(cat)}</label>
          <input class="add-item-input" id="add-item-${ci}" placeholder="+ Ajouter un élément…" data-add-item="${ci}">
          <button type="button" class="btn btn-outline btn-sm" data-add-item-btn="${ci}" aria-label="Ajouter">+</button>
        </div>
      </section>`;
  }).join('');

  $('#valise-body').innerHTML = html + `
    <div class="add-cat-row">
      <label class="visually-hidden" for="add-cat-input">Nouvelle catégorie</label>
      <input class="add-cat-input" id="add-cat-input" placeholder="✚ Nouvelle catégorie…">
      <button type="button" class="btn btn-outline btn-sm" data-add-cat aria-label="Ajouter la catégorie">+</button>
    </div>`;

  const pct = total ? Math.round(checked / total * 100) : 0;
  const bar = $('#valise-progress');
  if (bar) {
    bar.style.width = pct + '%';
    bar.parentElement.setAttribute('aria-valuenow', String(pct));
  }
  const lbl = $('#valise-progress-label');
  if (lbl) lbl.textContent = `${checked} / ${total} (${pct}%)`;
  setValise(current, state);
}

// ── Résolution d'un index "ci:ii" vers (catégorie, item) ──
function resolve(ref) {
  const [ci, ii] = ref.split(':').map(Number);
  const trip = getTrip(current);
  const tmplCats = Object.keys(tmplFor(trip).categories);
  const allCats = [...tmplCats, ...Object.keys(state).filter(c => !tmplCats.includes(c))];
  const cat = allCats[ci];
  if (cat == null) return null;
  const items = Object.keys(state[cat] || {});
  return { cat, item: ii == null || isNaN(ii) ? null : items[ii], allCats };
}

// ── Actions ──────────────────────────────────────────────
function toggleItem(ref, val) {
  const r = resolve(ref);
  if (!r || !r.item) return;
  state[r.cat][r.item] = val;
  renderValise();
}

function addItem(ci) {
  const input = document.getElementById('add-item-' + ci);
  const val = (input?.value || '').trim();
  if (!val) return;
  const r = resolve(String(ci));
  if (!r) return;
  if (!state[r.cat]) state[r.cat] = {};
  state[r.cat][val] = false;
  input.value = '';
  renderValise();
  requestAnimationFrame(() => document.getElementById('add-item-' + ci)?.focus());
}

function delItem(ref) {
  const r = resolve(ref);
  if (!r || !r.item) return;
  const was = state[r.cat][r.item];
  const item = r.item, cat = r.cat;
  delete state[cat][item];
  renderValise();
  pushUndo(`« ${item} » supprimé`, () => { state[cat][item] = was; renderValise(); });
}

async function editItem(ref) {
  const r = resolve(ref);
  if (!r || !r.item) return;
  const val = await vmPrompt({ title: 'Renommer', label: 'Nom de l\'élément', value: r.item });
  if (!val || val === r.item) return;
  const checked = state[r.cat][r.item];
  const ordered = {};
  Object.keys(state[r.cat]).forEach(k => { ordered[k === r.item ? val : k] = k === r.item ? checked : state[r.cat][k]; });
  state[r.cat] = ordered;
  renderValise();
}

function addCategory() {
  const input = $('#add-cat-input');
  const val = (input?.value || '').trim();
  if (!val) return;
  if (state[val]) { showToast('Cette catégorie existe déjà'); return; }
  state[val] = {};
  input.value = '';
  renderValise();
}

function delCategory(ci) {
  const r = resolve(String(ci));
  if (!r) return;
  const snap = state[r.cat];
  const cat = r.cat;
  delete state[cat];
  renderValise();
  pushUndo(`Catégorie « ${cat} » supprimée`, () => { state[cat] = snap; renderValise(); });
}

function uncheckAll() {
  if (!current) return;
  const snap = JSON.parse(JSON.stringify(state));
  Object.keys(state).forEach(cat => Object.keys(state[cat]).forEach(i => { state[cat][i] = false; }));
  renderValise();
  pushUndo('Tout décoché', () => { state = snap; renderValise(); });
}

// ── Glisser-déposer entre catégories ─────────────────────
let _dragRef = null;

function bindDnd(root) {
  root.addEventListener('dragstart', e => {
    const h = e.target.closest('[data-drag-item]');
    if (!h) return;
    _dragRef = h.dataset.dragItem;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', _dragRef); } catch { /* Safari */ }
    h.closest('.check-item')?.classList.add('dragging');
  });
  root.addEventListener('dragend', () => {
    $$('.check-item.dragging').forEach(el => el.classList.remove('dragging'));
    $$('.checklist-cat.drag-over').forEach(el => el.classList.remove('drag-over'));
    _dragRef = null;
  });
  root.addEventListener('dragover', e => {
    const cat = e.target.closest('.checklist-cat');
    if (!cat || !_dragRef) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    cat.classList.add('drag-over');
  });
  root.addEventListener('dragleave', e => {
    const cat = e.target.closest('.checklist-cat');
    if (cat && !cat.contains(e.relatedTarget)) cat.classList.remove('drag-over');
  });
  root.addEventListener('drop', e => {
    const catEl = e.target.closest('.checklist-cat');
    if (!catEl || !_dragRef) return;
    e.preventDefault();
    const from = resolve(_dragRef);
    const to = resolve(catEl.dataset.catIndex);
    _dragRef = null;
    if (!from || !to || !from.item || from.cat === to.cat) { renderValise(); return; }
    state[to.cat] = state[to.cat] || {};
    state[to.cat][from.item] = state[from.cat][from.item];
    delete state[from.cat][from.item];
    renderValise();
  });
}

// ── Export & impression ──────────────────────────────────
function exportValise() {
  if (!current) return;
  const trip = getTrip(current);
  let txt = `🧳 Liste valise — ${trip.nom}\n\n`;
  Object.entries(state).forEach(([cat, items]) => {
    txt += `## ${cat}\n`;
    Object.entries(items).forEach(([item, done]) => { txt += `${done ? '[x]' : '[ ]'} ${item}\n`; });
    txt += '\n';
  });
  navigator.clipboard.writeText(txt)
    .then(() => showToast('📋 Liste copiée !'))
    .catch(() => showToast('⚠️ Copie impossible', { tone: 'error' }));
}

function printValise() {
  if (!current) { showToast('⚠️ Choisis d\'abord un voyage'); return; }
  const trip = getTrip(current);
  const d = destById(trip.destinationId) || {};
  const tmpl = tmplFor(trip);
  let total = 0;
  const cats = Object.entries(state).map(([cat, items]) => {
    const list = Object.keys(items);
    total += list.length;
    return { cat, items: list };
  });
  vmOpenPrintable(`Check-list valise — ${trip.nom}`, `
    <style>
      .cols{column-count:2;column-gap:26px}
      .cat{break-inside:avoid;margin-bottom:14px}
      .cat h2{font-size:13px}
      li{display:flex;align-items:flex-start;gap:8px;padding:3px 0;font-size:12px;break-inside:avoid}
      .box{flex:0 0 auto;width:13px;height:13px;border:1.6px solid #111;border-radius:3px;margin-top:1px}
    </style>
    <header>
      <div>
        <h1>🧳 Check-list valise — ${escHtml((d.emoji || '') + ' ' + trip.nom)}</h1>
        <div class="sub">${escHtml(d.pays || '')}${trip.date_depart ? ' · ' + escHtml(trip.date_depart + ' → ' + (trip.date_retour || '?')) : ''} · Modèle : ${escHtml(tmpl.label)}</div>
      </div>
      <div class="right">${total} éléments<br>Édité le ${escHtml(new Date().toLocaleDateString('fr-FR'))}</div>
    </header>
    <div class="cols">${cats.map(c => `
      <section class="cat"><h2>${escHtml(c.cat)} <small>(${c.items.length})</small></h2>
        <ul>${c.items.map(it => `<li><span class="box"></span>${escHtml(it)}</li>`).join('')}</ul>
      </section>`).join('')}</div>`,
  { footer: 'Check-list valise · ' + vmCurrentName() });
}

// ── Câblage ──────────────────────────────────────────────
function init() {
  const page = document.getElementById('page-valises');
  if (!page) return;

  delegate(page, 'change', '#valise-dest-select', loadValise);
  delegate(page, 'change', '[data-toggle-item]', (e, el) => toggleItem(el.dataset.toggleItem, el.checked));
  delegate(page, 'click', '[data-del-item]', (e, el) => delItem(el.dataset.delItem));
  delegate(page, 'click', '[data-edit-item]', (e, el) => editItem(el.dataset.editItem));
  delegate(page, 'click', '[data-add-item-btn]', (e, el) => addItem(el.dataset.addItemBtn));
  delegate(page, 'keydown', '[data-add-item]', (e, el) => { if (e.key === 'Enter') { e.preventDefault(); addItem(el.dataset.addItem); } });
  delegate(page, 'click', '[data-add-cat]', addCategory);
  delegate(page, 'keydown', '#add-cat-input', e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } });
  delegate(page, 'click', '[data-del-cat]', (e, el) => delCategory(el.dataset.delCat));
  delegate(page, 'click', '[data-uncheck-all]', uncheckAll);
  delegate(page, 'click', '[data-export-valise]', exportValise);
  delegate(page, 'click', '[data-print-valise]', printValise);
  bindDnd(page);

  buildValiseSelect();
  subscribe(buildValiseSelect);
}

Object.assign(window, {
  buildValiseSelect, loadValise, valiseSelectTrip, renderValise,
  exportValise, printValise, uncheckAll, initValises: init,
});
})();
