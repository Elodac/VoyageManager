// ============================================================
// views/palette.js — recherche globale (Ctrl/Cmd+K ou « / »)
// Cherche dans les voyages, les destinations, les lieux, les road
// trips et les pages. Auparavant, « / » ne cherchait que dans le
// catalogue des destinations.
// ============================================================
(function () {

const PAGES = [
  { id: 'dashboard', label: '🏠 Tableau de bord' },
  { id: 'destinations', label: '🗺️ Destinations' },
  { id: 'carte', label: '📍 Carte' },
  { id: 'roadtrips', label: '🚗 Road trips' },
  { id: 'agenda', label: '📆 Agenda' },
  { id: 'programmes', label: '🧠 Programmes' },
  { id: 'transport', label: '🚆 Transport' },
  { id: 'recherche', label: '🔍 Recherche rapide' },
  { id: 'valises', label: '🧳 Valises' },
  { id: 'budget', label: '💶 Budget' },
  { id: 'archives', label: '🗄️ Archives' },
  { id: 'ajouter', label: '➕ Ajouter au catalogue' },
  { id: 'reglages', label: '⚙️ Réglages' },
];

const ACTIONS = [
  { label: '➕ Créer un voyage', run: () => window.openCreateVoyage && openCreateVoyage() },
  { label: '🚗 Créer un road trip', run: () => window.openRoadtripEditor && openRoadtripEditor() },
  { label: '📤 Exporter la sauvegarde', run: () => exportBackup() },
  { label: '🌓 Basculer le thème', run: () => toggleTheme() },
];

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

let results = [];
let cursor = 0;

function search(q) {
  const n = norm(q);
  const out = [];
  if (!n) {
    ACTIONS.forEach((a, i) => out.push({ kind: 'Action', label: a.label, sub: '', run: a.run }));
    PAGES.slice(0, 5).forEach(p => out.push({ kind: 'Page', label: p.label, sub: '', run: () => showPage(p.id) }));
    return out;
  }

  getTrips().filter(t => norm(t.nom).includes(n) || norm(t.pays).includes(n)).slice(0, 6)
    .forEach(t => out.push({
      kind: 'Voyage', label: `${t.emoji || '✈️'} ${t.nom}`,
      sub: tripStatusMeta(t.status).short + (t.date_depart ? ' · ' + t.date_depart : ''),
      run: () => window.openTripModal && openTripModal(t.id),
    }));

  activeDests().filter(d => norm(d.nom).includes(n) || norm(d.pays).includes(n)).slice(0, 8)
    .forEach(d => out.push({
      kind: 'Destination', label: `${d.emoji} ${d.nom}`, sub: d.pays,
      run: () => openDest(d.id),
    }));

  const pois = [];
  activeDests().forEach(d => (d.pois || []).forEach(p => {
    if (pois.length < 6 && norm(p.nom).includes(n)) {
      pois.push({ kind: 'Lieu', label: `📍 ${p.nom}`, sub: shortName(d), run: () => openDest(d.id) });
    }
  }));
  out.push(...pois);

  getRoadtrips().filter(r => norm(r.nom).includes(n)).slice(0, 4)
    .forEach(r => out.push({
      kind: 'Road trip', label: `🚗 ${r.nom}`, sub: `${(r.stops || []).length} étapes`,
      run: () => window.openRoadtripEditor && openRoadtripEditor(r.id),
    }));

  PAGES.filter(p => norm(p.label).includes(n)).slice(0, 4)
    .forEach(p => out.push({ kind: 'Page', label: p.label, sub: '', run: () => showPage(p.id) }));

  ACTIONS.filter(a => norm(a.label).includes(n))
    .forEach(a => out.push({ kind: 'Action', label: a.label, sub: '', run: a.run }));

  return out.slice(0, 24);
}

function render() {
  const box = $('#palette-results');
  if (!box) return;
  if (!results.length) {
    box.innerHTML = '<p class="hint">Aucun résultat.</p>';
    return;
  }
  box.innerHTML = results.map((r, i) => `
    <button type="button" class="palette-item${i === cursor ? ' is-active' : ''}" data-pal="${i}"
            role="option" aria-selected="${i === cursor ? 'true' : 'false'}" id="pal-opt-${i}">
      <span class="palette-kind">${escHtml(r.kind)}</span>
      <span class="palette-label">${escHtml(r.label)}</span>
      ${r.sub ? `<span class="palette-sub">${escHtml(r.sub)}</span>` : ''}
    </button>`).join('');
  const active = box.querySelector('.is-active');
  if (active) active.scrollIntoView({ block: 'nearest' });
  $('#palette-input')?.setAttribute('aria-activedescendant', results.length ? 'pal-opt-' + cursor : '');
}

function runAt(i) {
  const r = results[i];
  if (!r) return;
  closeOverlay('#palette-overlay');
  setTimeout(() => r.run(), 60);
}

function openPalette(prefill) {
  const ov = ensureOverlay('palette-overlay', 'palette-title');
  ov.classList.add('palette-overlay');
  ov.innerHTML = `
    <div class="palette-panel" role="document">
      <h2 id="palette-title" class="visually-hidden">Recherche globale</h2>
      <label class="visually-hidden" for="palette-input">Rechercher</label>
      <input id="palette-input" class="palette-input" type="text" autocomplete="off"
             role="combobox" aria-expanded="true" aria-controls="palette-results"
             placeholder="Rechercher un voyage, une destination, un lieu, une action…"
             value="${escAttr(prefill || '')}">
      <div id="palette-results" class="palette-results" role="listbox" aria-label="Résultats"></div>
      <p class="palette-foot">↑ ↓ pour naviguer · <kbd>Entrée</kbd> pour ouvrir · <kbd>Échap</kbd> pour fermer</p>
    </div>`;
  const input = ov.querySelector('#palette-input');
  const refresh = () => { results = search(input.value); cursor = 0; render(); };
  input.addEventListener('input', refresh);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(cursor + 1, results.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(cursor - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); runAt(cursor); }
  });
  delegate(ov, 'click', '[data-pal]', (e, el) => runAt(+el.dataset.pal));
  refresh();
  openOverlay(ov);
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

function init() {
  document.addEventListener('keydown', e => {
    const ae = document.activeElement;
    const inField = ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(''); return; }
    if (e.key === '/' && !inField) { e.preventDefault(); openPalette(''); return; }
    if (e.key === '?' && !inField) { e.preventDefault(); showShortcutsHelp(); return; }
    if (inField || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'c' || e.key === 'C') { e.preventDefault(); window.openCreateVoyage && openCreateVoyage(); }
    else if (e.key === 'g' || e.key === 'G') { e.preventDefault(); showPage('dashboard'); }
  });
  $('#palette-trigger')?.addEventListener('click', () => openPalette(''));
}

function showShortcutsHelp() {
  const ov = ensureOverlay('shortcuts-overlay', 'sc-title');
  const rows = [
    ['Ctrl / ⌘ + K', 'Recherche globale'],
    ['/', 'Recherche globale'],
    ['c', 'Créer un voyage'],
    ['g', 'Aller au tableau de bord'],
    ['Ctrl / ⌘ + Z', 'Annuler la dernière action'],
    ['Échap', 'Fermer la fenêtre active'],
    ['?', 'Afficher cette aide'],
  ];
  ov.innerHTML = `<div class="modal modal-narrow" role="document">
    <div class="modal-header">
      <span class="modal-emoji" aria-hidden="true">⌨️</span>
      <div class="modal-title"><h2 id="sc-title">Raccourcis clavier</h2></div>
      <button type="button" class="modal-close" data-sc-close aria-label="Fermer">✕</button>
    </div>
    <div class="modal-body">
      <table class="tbl"><tbody>
        ${rows.map(([k, l]) => `<tr><td><kbd>${escHtml(k)}</kbd></td><td>${escHtml(l)}</td></tr>`).join('')}
      </tbody></table>
    </div></div>`;
  ov.querySelector('[data-sc-close]').addEventListener('click', () => closeOverlay(ov));
  openOverlay(ov);
}

Object.assign(window, { openPalette, showShortcutsHelp, initPalette: init });
})();
