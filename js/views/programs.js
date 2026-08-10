// ============================================================
// views/programs.js — génération de programmes 3/5/7/10 jours
// Le chargement dans l'agenda passe désormais par agLoadProgram()
// (plus de détour par AGENDA_PRESETS, qui n'était qu'une passerelle
// vers l'ancien code).
// ============================================================
(function () {

const state = { destId: '', days: 5, theme: 'culture', program: null };

const pad = n => String(n).padStart(2, '0');
const fmt = (h, m) => `${pad(h)}:${pad(m)}`;
const addEnd = (h, m, dur) => { const t = h * 60 + m + dur; return fmt(Math.floor(t / 60) % 24, t % 60); };

function toolbar() {
  const opts = activeDests().map(d => `<option value="${escAttr(d.id)}">${escHtml(d.emoji + ' ' + d.nom)}</option>`).join('');
  const durs = DURATIONS.map(n => `<option value="${n}"${n === state.days ? ' selected' : ''}>${n} jours</option>`).join('');
  const themes = THEMES.map(t => `<option value="${escAttr(t.key)}"${t.key === state.theme ? ' selected' : ''}>${escHtml(t.label)}</option>`).join('');
  return `
    <div class="agenda-toolbar">
      <div class="adv-field"><label for="pg-dest">Destination</label>
        <select class="valise-select" id="pg-dest"><option value="">— Choisir —</option>${opts}</select></div>
      <div class="adv-field"><label for="pg-days">Durée</label>
        <select class="valise-select" id="pg-days">${durs}</select></div>
      <div class="adv-field"><label for="pg-theme">Thème</label>
        <select class="valise-select" id="pg-theme">${themes}</select></div>
      <div class="adv-filter-actions">
        <button type="button" class="btn btn-success btn-sm" id="pg-gen">✨ Générer le programme</button>
        <button type="button" class="btn btn-primary btn-sm" id="pg-load" hidden>📆 Charger dans l'agenda</button>
        <button type="button" class="btn btn-outline btn-sm" id="pg-print" hidden>🖨️ Imprimer</button>
      </div>
    </div>
    <div id="pg-preview"><div class="ag-empty-hint">Choisis une destination, une durée et un thème, puis « Générer ».</div></div>`;
}

function groupByDay(prog) {
  const days = [];
  for (let d = 0; d < prog.days; d++) {
    days.push(prog.blocks.filter(b => b.d === d).sort((a, b) => (a.h * 60 + a.m) - (b.h * 60 + b.m)));
  }
  return days;
}

function renderPreview() {
  const box = $('#pg-preview');
  const p = state.program;
  if (!p) {
    box.innerHTML = '<div class="ag-empty-hint">Choisis une destination, une durée et un thème, puis « Générer ».</div>';
    return;
  }
  const d = destById(state.destId);
  const themeLabel = (THEMES.find(t => t.key === p.theme) || {}).label || p.theme;
  const trip = getTripByDestination(state.destId);
  box.innerHTML = `
    <div class="info-box success">
      <strong>${escHtml(d.emoji + ' ' + d.nom)}</strong> — programme <strong>${p.days} jours</strong> · thème ${escHtml(themeLabel)}.
      ${trip ? 'Charge-le dans l\'agenda pour l\'ajuster.' : 'Crée d\'abord un voyage vers cette destination pour pouvoir le charger dans l\'agenda.'}
    </div>
    <div class="trip-grid">
      ${groupByDay(p).map((blocks, i) => `
        <div class="card card-sm">
          <h3>Jour ${i + 1}</h3>
          <div class="timeline-items">
            ${blocks.map(b => `<div class="prog-line">
              <span class="prog-time">${escHtml(fmt(b.h, b.m))}–${escHtml(addEnd(b.h, b.m, b.dur))}</span>
              <span>${escHtml((b.emoji || '') + ' ' + b.label)}</span></div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

function generate() {
  if (!state.destId) { showToast('⚠️ Choisis une destination'); return; }
  const d = destById(state.destId);
  state.program = generateProgram(d, state.days, state.theme);
  const load = $('#pg-load');
  const print = $('#pg-print');
  if (load) load.hidden = !getTripByDestination(state.destId);
  if (print) print.hidden = false;
  renderPreview();
}

function loadIntoAgenda() {
  const p = state.program;
  if (!p) return;
  const trip = getTripByDestination(state.destId);
  if (!trip) { showToast('⚠️ Crée d\'abord un voyage vers cette destination'); return; }
  showPage('agenda');
  setTimeout(() => agLoadProgram(trip.id, p), 100);
}

function printProgram() {
  const p = state.program;
  if (!p) return;
  const d = destById(state.destId);
  const themeLabel = (THEMES.find(t => t.key === p.theme) || {}).label || p.theme;
  vmOpenPrintable(`Programme — ${d.nom}`, `
    <style>.grid2{column-count:2;column-gap:24px}.day{break-inside:avoid;margin-bottom:12px}</style>
    <header>
      <div><h1>📋 Programme — ${escHtml(d.emoji + ' ' + d.nom)}</h1>
        <div class="sub">${p.days} jours · thème ${escHtml(themeLabel)}</div></div>
      <div class="right">Édité le ${escHtml(new Date().toLocaleDateString('fr-FR'))}</div>
    </header>
    <div class="grid2">${groupByDay(p).map((blocks, i) => `
      <section class="day"><h2>Jour ${i + 1}</h2><table><tbody>
        ${blocks.map(b => `<tr><td class="t">${escHtml(fmt(b.h, b.m))}–${escHtml(addEnd(b.h, b.m, b.dur))}</td>
          <td>${escHtml((b.emoji || '') + ' ' + b.label)}</td></tr>`).join('')}
      </tbody></table></section>`).join('')}</div>`,
  { footer: 'Programme · ' + vmCurrentName() });
}

function programsSelect(destId) {
  const s = $('#pg-dest');
  if (s && destId) { s.value = destId; state.destId = destId; generate(); }
}

function init() {
  const mount = $('#programmes-mount');
  if (!mount) return;
  mount.innerHTML = toolbar();
  delegate(mount, 'change', '#pg-dest', (e, el) => { state.destId = el.value; if (state.destId) generate(); });
  delegate(mount, 'change', '#pg-days', (e, el) => { state.days = +el.value; if (state.destId) generate(); });
  delegate(mount, 'change', '#pg-theme', (e, el) => { state.theme = el.value; if (state.destId) generate(); });
  delegate(mount, 'click', '#pg-gen', generate);
  delegate(mount, 'click', '#pg-load', loadIntoAgenda);
  delegate(mount, 'click', '#pg-print', printProgram);

  const first = (activeDests()[0] || {}).id;
  if (first) { state.destId = first; $('#pg-dest').value = first; generate(); }
  subscribe(() => { if (document.getElementById('page-programmes').classList.contains('active')) { /* liste inchangée */ } });
}

Object.assign(window, { programsSelect, initPrograms: init });
})();
