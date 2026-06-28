// ============================================================
// views/programs.js — page "Programmes" : génère 3/5/7/10 j
// thématiques, charge dans l'agenda, imprime.
// (Phase 4 — chantier 3)
// ============================================================
(function () {
const state = { destId: '', days: 5, theme: 'culture', program: null };
const dests = () => window.DESTINATIONS || [];
const pad = n => String(n).padStart(2, '0');
const fmt = (h, m) => `${pad(h)}:${pad(m)}`;
const addEnd = (h, m, dur) => { let t = h * 60 + m + dur; return fmt(Math.floor(t / 60) % 24, t % 60); };
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function toolbar() {
  const opts = dests().map(d => `<option value="${d.id}">${d.emoji} ${d.nom}</option>`).join('');
  const durs = DURATIONS.map(n => `<option value="${n}" ${n === state.days ? 'selected' : ''}>${n} jours</option>`).join('');
  const themes = THEMES.map(t => `<option value="${t.key}" ${t.key === state.theme ? 'selected' : ''}>${t.label}</option>`).join('');
  return `
    <div class="agenda-toolbar">
      <div class="adv-field"><label>Destination</label>
        <select class="valise-select" id="pg-dest"><option value="">— Choisir —</option>${opts}</select></div>
      <div class="adv-field"><label>Durée</label>
        <select class="valise-select" id="pg-days">${durs}</select></div>
      <div class="adv-field"><label>Thème</label>
        <select class="valise-select" id="pg-theme">${themes}</select></div>
      <div class="adv-filter-actions">
        <button class="btn btn-success btn-sm" id="pg-gen">✨ Générer le programme</button>
        <button class="btn btn-primary btn-sm" id="pg-load" style="display:none">📆 Charger dans l'agenda</button>
        <button class="btn btn-outline btn-sm" id="pg-print" style="display:none">🖨️ Imprimer</button>
      </div>
    </div>
    <div id="pg-preview"><div class="ag-empty-hint">Choisis une destination, une durée et un thème, puis « Générer ».</div></div>`;
}

function groupByDay(prog) {
  const days = [];
  for (let d = 0; d < prog.days; d++) days.push(prog.blocks.filter(b => b.d === d).sort((a, b) => (a.h * 60 + a.m) - (b.h * 60 + b.m)));
  return days;
}

function renderPreview() {
  const box = document.getElementById('pg-preview');
  const p = state.program;
  if (!p) { box.innerHTML = `<div class="ag-empty-hint">Choisis une destination, une durée et un thème, puis « Générer ».</div>`; return; }
  const d = dests().find(x => x.id === state.destId);
  const themeLabel = (THEMES.find(t => t.key === p.theme) || {}).label || p.theme;
  box.innerHTML = `
    <div class="info-box success" style="margin-bottom:14px">
      <strong>${d.emoji} ${d.nom}</strong> — programme <strong>${p.days} jours</strong> · thème ${themeLabel}.
      Aperçu modifiable ensuite dans l'agenda.
    </div>
    <div class="trip-grid">
      ${groupByDay(p).map((blocks, i) => `
        <div class="card card-sm">
          <h3 style="margin-bottom:8px">Jour ${i + 1}</h3>
          <div class="timeline-items">
            ${blocks.map(b => `<div class="detail-line" style="color:var(--text)">
              <span style="color:var(--muted);min-width:84px">${fmt(b.h, b.m)}–${addEnd(b.h, b.m, b.dur)}</span>
              <span>${b.emoji || ''} ${b.label}</span></div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

function generate() {
  if (!state.destId) { window.showToast && window.showToast('⚠️ Choisis une destination'); return; }
  const d = dests().find(x => x.id === state.destId);
  state.program = generateProgram(d, state.days, state.theme);
  document.getElementById('pg-load').style.display = '';
  document.getElementById('pg-print').style.display = '';
  renderPreview();
}

function loadIntoAgenda() {
  const p = state.program; if (!p) return;
  const d = dests().find(x => x.id === state.destId);
  // Bridge avec l'agenda legacy : on alimente AGENDA_PRESETS puis on régénère
  window.AGENDA_PRESETS[d.id] = { hstart: p.hstart, hend: p.hend, blocks: p.blocks };
  window.showPage('agenda');
  const sel = document.getElementById('ag-dest-select');
  sel.value = d.id;
  window.agOnDestChange();
  const start = d.date_depart || todayISO();
  document.getElementById('ag-start').value = start;
  document.getElementById('ag-end').value = addDaysISO(start, p.days - 1);
  window.agRebuild();
  window.agGenerateFromPreset();
}

function printProgram() {
  const p = state.program; if (!p) return;
  const d = dests().find(x => x.id === state.destId);
  const themeLabel = (THEMES.find(t => t.key === p.theme) || {}).label || p.theme;
  const daysHTML = groupByDay(p).map((blocks, i) => `
    <section class="day"><h2>Jour ${i + 1}</h2><table>
      ${blocks.map(b => `<tr><td class="t">${fmt(b.h, b.m)}–${addEnd(b.h, b.m, b.dur)}</td><td>${b.emoji || ''} ${b.label}</td></tr>`).join('')}
    </table></section>`).join('');
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Programme — ${d.nom}</title>
    <style>body{font-family:Arial,sans-serif;margin:24px;color:#111;font-size:12px}
    header{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
    h1{font-size:19px;margin:0}.sub{color:#555;font-size:11px;margin-top:3px}
    .grid{column-count:2;column-gap:24px}.day{break-inside:avoid;margin-bottom:12px}
    .day h2{font-size:13px;border-bottom:1px solid #999;padding-bottom:3px;margin:0 0 6px}
    table{width:100%;border-collapse:collapse}td{padding:2px 4px;font-size:11.5px;vertical-align:top}
    td.t{white-space:nowrap;color:#555;width:92px;font-weight:600}
    @media print{body{margin:12mm}.no-print{display:none}}
    button{font-size:13px;padding:8px 16px;border:1px solid #111;background:#111;color:#fff;border-radius:6px;cursor:pointer}</style></head>
    <body><div class="no-print" style="margin-bottom:14px"><button onclick="window.print()">🖨️ Imprimer</button></div>
    <header><h1>📋 Programme — ${d.emoji} ${d.nom}</h1><div class="sub">${p.days} jours · thème ${themeLabel}</div></header>
    <div class="grid">${daysHTML}</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { window.showToast && window.showToast('⚠️ Autorise les pop-ups'); return; }
  w.document.write(html); w.document.close();
}

function init() {
  const mount = document.getElementById('programmes-mount');
  if (!mount) return;
  mount.innerHTML = toolbar();
  document.getElementById('pg-dest').addEventListener('change', e => { state.destId = e.target.value; });
  document.getElementById('pg-days').addEventListener('change', e => { state.days = +e.target.value; if (state.destId) generate(); });
  document.getElementById('pg-theme').addEventListener('change', e => { state.theme = e.target.value; if (state.destId) generate(); });
  document.getElementById('pg-gen').addEventListener('click', generate);
  document.getElementById('pg-load').addEventListener('click', loadIntoAgenda);
  document.getElementById('pg-print').addEventListener('click', printProgram);
  // Pré-sélection + aperçu par défaut → la page n'est jamais vide
  const first = (dests()[0] || {}).id;
  if (first) { state.destId = first; document.getElementById('pg-dest').value = first; generate(); }
}

// Sélection externe (depuis un voyage / autre page)
window.programsSelect = (destId) => {
  const s = document.getElementById('pg-dest');
  if (s && destId) { s.value = destId; state.destId = destId; generate(); }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
