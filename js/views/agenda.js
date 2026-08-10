// ============================================================
// views/agenda.js — planning jours × heures, drag & drop
//
// Le moteur de glisser-déposer (pointer events, seuil de démarrage,
// throttle, snap 15 min, redimensionnement) est conservé tel quel :
// c'est la partie la plus aboutie de l'application.
//
// Changements : l'agenda est rattaché à un VOYAGE (et non plus à une
// destination), les dates par défaut viennent des préférences, et
// tout le HTML injecté est échappé.
// ============================================================
(function () {

const HOUR_PX = 84;
const SLOT_MIN = 15;
const MIN_DUR = 15;
const PX_PER_MIN = HOUR_PX / 60;
const MAX_DAYS = 60;
const AG_HIST_MAX = 30;

let agCurrent = null;          // tripId courant
let _agHistory = [];
let _agPaletteCollapsed = false;
let _agOverlapIds = new Set();
let _agLastDragEnd = 0;

const AG_COLORS = {
  activite: '#3b82f6', culture: '#6366f1', plage: '#06b6d4', nature: '#22c55e',
  repas: '#f59e0b', detente: '#8b5cf6', repos: '#8b5cf6', transport: '#64748b',
  excursion: '#0ea5e9', perso: '#ec4899',
};

const AG_PALETTE = {
  'Repas': [
    { type: 'repas', emoji: '🥐', label: 'Petit-déjeuner', dur: 60 },
    { type: 'repas', emoji: '🍽️', label: 'Déjeuner', dur: 75 },
    { type: 'repas', emoji: '🍷', label: 'Dîner', dur: 90 },
    { type: 'repas', emoji: '☕', label: 'Café / pause', dur: 30 },
  ],
  'Détente & repos': [
    { type: 'plage', emoji: '🏖️', label: 'Plage / piscine', dur: 120, chill: true },
    { type: 'repos', emoji: '😴', label: 'Sieste / repos', dur: 90, chill: true },
    { type: 'detente', emoji: '🚶', label: 'Balade tranquille', dur: 60, chill: true },
    { type: 'detente', emoji: '💆', label: 'Spa / détente', dur: 90, chill: true },
    { type: 'detente', emoji: '🍹', label: 'Apéro / coucher de soleil', dur: 60, chill: true },
  ],
  'Activités': [
    { type: 'activite', emoji: '🎯', label: 'Activité / visite', dur: 120 },
    { type: 'culture', emoji: '🏛️', label: 'Musée / monument', dur: 120 },
    { type: 'excursion', emoji: '⛵', label: 'Excursion', dur: 240 },
    { type: 'nature', emoji: '🥾', label: 'Randonnée', dur: 240 },
    { type: 'perso', emoji: '🛍️', label: 'Shopping', dur: 90 },
  ],
  'Transport': [
    { type: 'transport', emoji: '✈️', label: 'Vol', dur: 120 },
    { type: 'transport', emoji: '🚗', label: 'Route / transfert', dur: 60 },
    { type: 'transport', emoji: '🔑', label: 'Location voiture', dur: 45 },
  ],
};

const CHILL_TEMPLATE = [
  { h: 10, m: 0, type: 'repas', emoji: '🥐', label: 'Petit-déj tardif', dur: 60 },
  { h: 11, m: 30, type: 'plage', emoji: '🏖️', label: 'Plage / piscine', dur: 90, chill: true },
  { h: 13, m: 0, type: 'repas', emoji: '🍽️', label: 'Déjeuner tranquille', dur: 75 },
  { h: 14, m: 30, type: 'repos', emoji: '😴', label: 'Sieste / repos', dur: 90, chill: true },
  { h: 16, m: 30, type: 'detente', emoji: '🚶', label: 'Balade digestive', dur: 60, chill: true },
  { h: 19, m: 30, type: 'detente', emoji: '🍹', label: 'Apéro coucher de soleil', dur: 60, chill: true },
  { h: 20, m: 45, type: 'repas', emoji: '🍷', label: 'Dîner', dur: 90 },
];

const FR_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const FR_MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

const agId = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clampInt = (v, min, max, def) => { v = parseInt(v, 10); return isNaN(v) ? def : Math.max(min, Math.min(max, v)); };
const fmtTime = min => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const fmtDayHead = iso => { const d = new Date(iso + 'T12:00:00'); return { day: FR_DAYS[d.getDay()], date: `${d.getDate()} ${FR_MONTHS[d.getMonth()]}` }; };
const agDurLabel = dur => { const h = Math.floor(dur / 60), m = dur % 60; return h === 0 ? `${m} min` : m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`; };

function dayList(start, end) {
  const out = [];
  const d = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  let guard = 0;
  while (d <= e && guard < MAX_DAYS) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); guard++; }
  return out;
}

const st = () => getAgenda(agCurrent);

// ── Historique local (Ctrl+Z sur la page Agenda) ─────────
function agPushHistory() {
  if (!agCurrent) return;
  _agHistory.push(JSON.stringify(st().blocks));
  if (_agHistory.length > AG_HIST_MAX) _agHistory.shift();
}
function agUndo() {
  if (!agCurrent || !_agHistory.length) { showToast('⚠️ Rien à annuler'); return; }
  const s = st();
  s.blocks = JSON.parse(_agHistory.pop());
  setAgenda(agCurrent, s);
  agRender();
  showToast('↩️ Annulation');
}
function agSave() { if (agCurrent) setAgenda(agCurrent, st()); }

// ── Sélecteur de voyage ──────────────────────────────────
function buildAgendaSelect() {
  const sel = $('#ag-dest-select');
  if (!sel) return;
  const trips = getTrips().filter(t => t.status !== 'archive');
  sel.innerHTML = '<option value="">— Choisir un voyage —</option>'
    + trips.sort((a, b) => (a.date_depart || '9999').localeCompare(b.date_depart || '9999'))
        .map(t => `<option value="${escAttr(t.id)}">${escHtml(tripLabel(t))}</option>`).join('');
  if (agCurrent && trips.some(t => t.id === agCurrent)) sel.value = agCurrent;
  const empty = $('#ag-no-trip');
  if (empty) empty.hidden = trips.length > 0;
}

function agSelectTrip(tripId) {
  const sel = $('#ag-dest-select');
  if (sel && tripId) { sel.value = tripId; agOnDestChange(); }
}

function agOnDestChange() {
  const id = $('#ag-dest-select')?.value || '';
  agCurrent = id || null;
  _agHistory = [];
  if (!id) {
    $('#agenda-content').innerHTML = '<div class="ag-empty-hint">👆 Choisis un voyage pour générer sa grille de planning.</div>';
    return;
  }
  const trip = getTrip(id);
  if (!getAgenda(id)) {
    const range = defaultDateRange();
    setAgenda(id, {
      start: (trip && trip.date_depart) || range.start,
      end: (trip && trip.date_retour) || range.end,
      hstart: 8, hend: 23, blocks: [], chillDays: {},
    });
  }
  const s = st();
  $('#ag-start').value = s.start;
  $('#ag-end').value = s.end;
  $('#ag-hstart').value = s.hstart;
  $('#ag-hend').value = s.hend;
  agRender();
}

function agRebuild() {
  if (!agCurrent) return;
  const s = st();
  s.start = $('#ag-start').value || s.start;
  s.end = $('#ag-end').value || s.end;
  s.hstart = clampInt($('#ag-hstart').value, 0, 23, 8);
  s.hend = clampInt($('#ag-hend').value, s.hstart + 1, 24, 23);
  $('#ag-hend').value = s.hend;
  agSave();
  agRender();
}

// ── Rendu ────────────────────────────────────────────────
function agBlockHTML(b) {
  const s = st();
  const top = (b.start - s.hstart * 60) * PX_PER_MIN;
  const height = b.dur * PX_PER_MIN;
  const color = AG_COLORS[b.type] || '#3b82f6';
  const sz = b.dur <= 20 ? 'sz-xs' : b.dur <= 40 ? 'sz-sm' : '';
  const ol = _agOverlapIds.has(b.id) ? 'overlap' : '';
  return `<div class="ag-block ${b.chill ? 'chill' : ''} ${sz} ${ol}" data-id="${escAttr(b.id)}"
      style="top:${top}px;height:${height}px;background:${color}"
      title="${escAttr(b.label + ' · ' + fmtTime(b.start) + '–' + fmtTime(b.start + b.dur))}">
      <button type="button" class="blk-del" data-del-block="${escAttr(b.id)}" aria-label="Supprimer ${escAttr(b.label)}">✕</button>
      <div class="blk-time">${escHtml(fmtTime(b.start))}–${escHtml(fmtTime(b.start + b.dur))}</div>
      <div class="blk-label">${escHtml((b.emoji || '') + ' ' + b.label)}</div>
      ${b.notes ? `<div class="blk-notes">${escHtml(b.notes.length > 48 ? b.notes.slice(0, 48) + '…' : b.notes)}</div>` : ''}
      <div class="blk-resize" aria-hidden="true"></div>
    </div>`;
}

function agRender() {
  if (!agCurrent) return;
  const s = st();
  if (!s) return;

  s.blocks.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.start - b.start));

  // Chevauchements
  _agOverlapIds = new Set();
  const days = dayList(s.start, s.end);
  days.forEach(iso => {
    const db = s.blocks.filter(b => b.day === iso);
    db.forEach((b, i) => {
      for (let j = i + 1; j < db.length; j++) {
        if (db[j].start < b.start + b.dur) { _agOverlapIds.add(b.id); _agOverlapIds.add(db[j].id); }
        else break;
      }
    });
  });

  const bodyH = (s.hend - s.hstart) * 60 * PX_PER_MIN;

  let gutter = '';
  for (let h = s.hstart; h <= s.hend; h++) {
    gutter += `<div class="ag-hourlabel" style="top:${(h - s.hstart) * HOUR_PX}px">${String(h).padStart(2, '0')}:00</div>`;
  }

  let heads = '<div class="ag-corner"></div>';
  days.forEach(iso => {
    const dh = fmtDayHead(iso);
    const dayMin = s.blocks.filter(b => b.day === iso).reduce((acc, b) => acc + b.dur, 0);
    heads += `<div class="ag-dayhead">
      <div class="dh-day">${escHtml(dh.day)}</div>
      <div class="dh-date">${escHtml(dh.date)}</div>
      ${dayMin > 0 ? `<div class="dh-stat">${escHtml(agDurLabel(dayMin))}</div>` : ''}
      <div class="dh-chill"><button type="button" class="chill-toggle ${s.chillDays[iso] ? 'on' : ''}"
        data-chill="${escAttr(iso)}" aria-pressed="${s.chillDays[iso] ? 'true' : 'false'}"
        title="Journée détente">😎</button></div>
    </div>`;
  });

  let slotLines = '';
  for (let h = s.hstart; h < s.hend; h++) {
    for (let m = 0; m < 60; m += SLOT_MIN) {
      const top = ((h - s.hstart) * 60 + m) * PX_PER_MIN;
      slotLines += `<div class="ag-slotline ${m === 0 ? 'hour' : m === 30 ? 'half' : ''}" style="top:${top}px"></div>`;
    }
  }

  let cols = `<div class="ag-timegutter" style="height:${bodyH}px">${gutter}</div>`;
  days.forEach(iso => {
    const blocks = s.blocks.filter(b => b.day === iso).map(agBlockHTML).join('');
    cols += `<div class="ag-daycol ${s.chillDays[iso] ? 'chill' : ''}" data-day="${escAttr(iso)}" style="height:${bodyH}px">${slotLines}${blocks}</div>`;
  });

  $('#agenda-content').innerHTML = `
    <div class="agenda-layout${_agPaletteCollapsed ? ' pal-collapsed' : ''}">
      <div class="palette">
        <div class="pal-header">
          <strong>Blocs</strong>
          <button type="button" id="pal-toggle-btn" class="pal-toggle" data-toggle-palette
            aria-label="${_agPaletteCollapsed ? 'Afficher la palette' : 'Masquer la palette'}">${_agPaletteCollapsed ? '▶' : '◀'}</button>
        </div>
        <div class="pal-body">
          <p class="pal-hint">↘ Glisse un bloc · clique la grille pour créer · double-clic pour modifier</p>
          ${Object.entries(AG_PALETTE).map(([cat, items]) => `
            <h3>${escHtml(cat)}</h3>
            ${items.map((it, idx) => `
              <div class="pal-block" data-cat="${escAttr(cat)}" data-idx="${idx}" style="border-left:4px solid ${AG_COLORS[it.type]}">
                <span class="pal-emoji" aria-hidden="true">${escHtml(it.emoji)}</span>
                <span>${escHtml(it.label)}</span>
                <span class="pal-dur">${Math.round(it.dur / 60 * 10) / 10}h</span>
              </div>`).join('')}`).join('')}
        </div>
      </div>
      <div class="grid-wrap">
        <div class="agenda-grid" style="grid-template-columns:70px repeat(${days.length}, minmax(185px,1fr))">
          ${heads}${cols}
        </div>
      </div>
    </div>`;

  agBindPalette();
  agBindBlocks();
  agBindQuickAdd();
  agDrawNow();
}

function agDrawNow() {
  if (!agCurrent) return;
  const s = st();
  const now = new Date();
  const col = $(`.ag-daycol[data-day="${now.toISOString().slice(0, 10)}"]`);
  if (!col) return;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < s.hstart * 60 || nowMin > s.hend * 60) return;
  const top = (nowMin - s.hstart * 60) * PX_PER_MIN;
  const line = document.createElement('div');
  line.className = 'ag-now-line';
  line.style.top = top + 'px';
  col.appendChild(line);
  const wrap = col.closest('.grid-wrap');
  if (wrap && wrap.scrollTop === 0) wrap.scrollTop = Math.max(0, top - 120);
}

// ── Édition d'un bloc ────────────────────────────────────
function popupHTML(mode, b, startMin, endMin) {
  const m2t = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const start = mode === 'new' ? startMin : b.start;
  const end = mode === 'new' ? endMin : b.start + b.dur;
  const dur = end - start;
  return `
    <div class="ag-ep-header">
      <strong>${mode === 'new' ? 'Nouveau bloc' : 'Modifier le bloc'}</strong>
      <button type="button" class="ag-ep-close" data-ep-close aria-label="Fermer">✕</button>
    </div>
    <div class="ag-ep-row">
      <label class="visually-hidden" for="ep-emoji">Emoji</label>
      <input class="ag-ep-emoji" id="ep-emoji" value="${escAttr(b ? (b.emoji || '') : '')}" placeholder="🎯" maxlength="4">
      <label class="visually-hidden" for="ep-label">Libellé</label>
      <input class="ag-ep-label" id="ep-label" value="${escAttr(b ? b.label : '')}" placeholder="Libellé…">
    </div>
    <div class="ag-ep-row">
      <label for="ep-start">Début</label>
      <input type="time" id="ep-start" value="${m2t(start)}" step="900" data-ep-sync="start">
      <label for="ep-end">Fin</label>
      <input type="time" id="ep-end" value="${m2t(Math.min(end, 1439))}" step="900" data-ep-sync="end">
    </div>
    <div class="ag-ep-row">
      <label for="ep-dur">Durée</label>
      <input type="number" id="ep-dur" value="${dur}" min="15" max="720" step="15" data-ep-sync="dur"> min
      <span id="ep-dur-h" class="hint">${escHtml(agDurLabel(dur))}</span>
    </div>
    ${mode === 'new' ? `<div class="ag-ep-row">
      <label for="ep-type">Type</label>
      <select id="ep-type">${Object.keys(AG_COLORS).map(k => `<option value="${escAttr(k)}">${escHtml(k)}</option>`).join('')}</select>
    </div>` : ''}
    <div class="ag-ep-row align-start">
      <label for="ep-notes">Notes</label>
      <textarea id="ep-notes" rows="2" placeholder="Adresse, lien, infos…">${escHtml(b ? (b.notes || '') : '')}</textarea>
    </div>
    <div class="ag-ep-actions">
      ${mode === 'new'
        ? `<button type="button" class="btn btn-success btn-sm" data-ep-add>✓ Ajouter</button>`
        : `<button type="button" class="btn btn-success btn-sm" data-ep-save="${escAttr(b.id)}">✓ Enregistrer</button>
           <button type="button" class="btn btn-outline btn-sm" data-ep-dup="${escAttr(b.id)}" title="Dupliquer">📋</button>
           <button type="button" class="btn btn-danger btn-sm" data-ep-del="${escAttr(b.id)}" aria-label="Supprimer ce bloc">🗑</button>`}
    </div>`;
}

function placePopup(popup, e) {
  document.body.appendChild(popup);
  const px = Math.min(e.clientX + 12, window.innerWidth - 315);
  const py = Math.min(e.clientY - 20, window.innerHeight - 390);
  popup.style.left = Math.max(8, px) + 'px';
  popup.style.top = Math.max(8, py) + 'px';
  popup.querySelector('#ep-label')?.focus();
  setTimeout(() => {
    function outside(ev) {
      const p = document.getElementById('ag-edit-popup');
      if (p && !p.contains(ev.target)) { p.remove(); document.removeEventListener('pointerdown', outside); }
    }
    document.addEventListener('pointerdown', outside);
  }, 150);
}

function agOpenQuickAdd(e, day, startMin) {
  document.getElementById('ag-edit-popup')?.remove();
  if (!agCurrent) return;
  const s = st();
  const endMin = Math.min(startMin + 60, s.hend * 60);
  const popup = document.createElement('div');
  popup.id = 'ag-edit-popup';
  popup.className = 'ag-edit-popup';
  popup.dataset.mode = 'new';
  popup.dataset.day = day;
  popup.innerHTML = popupHTML('new', null, startMin, endMin);
  placePopup(popup, e);
}

function agOpenEdit(e, id) {
  document.getElementById('ag-edit-popup')?.remove();
  const b = st().blocks.find(x => x.id === id);
  if (!b) return;
  const popup = document.createElement('div');
  popup.id = 'ag-edit-popup';
  popup.className = 'ag-edit-popup';
  popup.dataset.mode = 'edit';
  popup.innerHTML = popupHTML('edit', b);
  placePopup(popup, e);
}

function agEpSync(changed) {
  const t2m = v => { const [h, m] = (v || '0:0').split(':').map(Number); return h * 60 + m; };
  const m2t = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const sEl = document.getElementById('ep-start');
  const eEl = document.getElementById('ep-end');
  const dEl = document.getElementById('ep-dur');
  const hEl = document.getElementById('ep-dur-h');
  if (!sEl || !eEl || !dEl) return;
  const start = t2m(sEl.value), end = t2m(eEl.value);
  let dur = parseInt(dEl.value, 10) || 15;
  if (changed === 'start') { eEl.value = m2t(Math.min(start + dur, 1439)); }
  else if (changed === 'end') { dur = Math.max(MIN_DUR, end - start); dEl.value = dur; }
  else if (changed === 'dur') { eEl.value = m2t(Math.min(start + dur, 1439)); }
  if (hEl) hEl.textContent = agDurLabel(parseInt(dEl.value, 10) || 15);
}

function agQuickAddSave() {
  const popup = document.getElementById('ag-edit-popup');
  if (!popup || popup.dataset.mode !== 'new') return;
  const t2m = v => { const [h, m] = (v || '0:0').split(':').map(Number); return h * 60 + m; };
  const start = t2m(document.getElementById('ep-start').value);
  const end = t2m(document.getElementById('ep-end').value);
  agPushHistory();
  st().blocks.push({
    id: agId(),
    day: popup.dataset.day,
    start,
    dur: Math.max(MIN_DUR, end - start),
    type: document.getElementById('ep-type').value || 'activite',
    emoji: document.getElementById('ep-emoji').value.trim(),
    label: document.getElementById('ep-label').value.trim() || 'Nouveau bloc',
    notes: document.getElementById('ep-notes').value.trim(),
  });
  agSave();
  popup.remove();
  agRender();
  showToast('✓ Bloc ajouté');
}

function agSaveEdit(id) {
  agPushHistory();
  const b = st().blocks.find(x => x.id === id);
  if (!b) return;
  const t2m = v => { const [h, m] = (v || '0:0').split(':').map(Number); return h * 60 + m; };
  const label = document.getElementById('ep-label').value.trim();
  if (label) b.label = label;
  b.emoji = document.getElementById('ep-emoji').value.trim();
  b.notes = document.getElementById('ep-notes').value.trim();
  const startStr = document.getElementById('ep-start').value;
  const endStr = document.getElementById('ep-end').value;
  if (startStr) b.start = t2m(startStr);
  if (endStr) { const nd = t2m(endStr) - b.start; if (nd >= MIN_DUR) b.dur = nd; }
  agSave();
  document.getElementById('ag-edit-popup')?.remove();
  agRender();
}

function agDelBlock(id) {
  agPushHistory();
  const s = st();
  s.blocks = s.blocks.filter(b => b.id !== id);
  agSave();
  document.getElementById('ag-edit-popup')?.remove();
  agRender();
}

function agDuplicateBlock(id) {
  const s = st();
  const b = s.blocks.find(x => x.id === id);
  if (!b) return;
  agPushHistory();
  s.blocks.push({ ...b, id: agId(), start: Math.min(b.start + b.dur, s.hend * 60 - b.dur) });
  agSave();
  document.getElementById('ag-edit-popup')?.remove();
  agRender();
  showToast('📋 Bloc dupliqué');
}

function agToggleChill(iso) {
  const s = st();
  const on = !s.chillDays[iso];
  if (on) {
    s.chillDays[iso] = true;
    if (!s.blocks.some(b => b.day === iso)) {
      agPushHistory();
      CHILL_TEMPLATE.forEach(t => {
        const start = t.h * 60 + t.m;
        if (start >= s.hstart * 60 && start + t.dur <= s.hend * 60) {
          s.blocks.push({ id: agId(), day: iso, start, dur: t.dur, type: t.type, emoji: t.emoji, label: t.label, chill: !!t.chill });
        }
      });
      showToast('😎 Journée détente remplie !');
    }
  } else {
    delete s.chillDays[iso];
  }
  agSave();
  agRender();
}

async function agClear() {
  if (!agCurrent) return;
  const ok = await vmConfirm({
    title: 'Vider ce planning ?', message: 'Tous les blocs de ce voyage seront supprimés.',
    confirmLabel: 'Vider', danger: true,
  });
  if (!ok) return;
  const s = st();
  const snap = JSON.parse(JSON.stringify({ blocks: s.blocks, chillDays: s.chillDays }));
  s.blocks = []; s.chillDays = {};
  agSave(); agRender();
  pushUndo('Planning vidé', () => {
    const cur = st();
    cur.blocks = snap.blocks; cur.chillDays = snap.chillDays;
    agSave(); agRender();
  });
}

function agExport() {
  if (!agCurrent) return;
  const s = st();
  const t = getTrip(agCurrent);
  let txt = `📆 Planning — ${t ? t.nom : ''}\n\n`;
  dayList(s.start, s.end).forEach(iso => {
    const dh = fmtDayHead(iso);
    const blocks = s.blocks.filter(b => b.day === iso).sort((a, b) => a.start - b.start);
    txt += `── ${dh.day} ${dh.date}${s.chillDays[iso] ? ' 😎 (détente)' : ''} ──\n`;
    if (!blocks.length) txt += '  (libre)\n';
    blocks.forEach(b => { txt += `  ${fmtTime(b.start)}–${fmtTime(b.start + b.dur)}  ${b.emoji || ''} ${b.label}\n`; });
    txt += '\n';
  });
  navigator.clipboard.writeText(txt)
    .then(() => showToast('📋 Planning copié !'))
    .catch(() => showToast('⚠️ Copie impossible (autorise le presse-papier)', { tone: 'error' }));
}

function agPrint() {
  if (!agCurrent) { showToast('⚠️ Choisis d\'abord un voyage'); return; }
  const s = st();
  const t = getTrip(agCurrent);
  const d = destById(t.destinationId) || {};
  const days = dayList(s.start, s.end);
  const totalMin = s.blocks.reduce((acc, b) => acc + b.dur, 0);
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const daysHTML = days.map(iso => {
    const dh = fmtDayHead(iso);
    const blocks = s.blocks.filter(b => b.day === iso).sort((a, b) => a.start - b.start);
    const dayMin = blocks.reduce((acc, b) => acc + b.dur, 0);
    const rows = blocks.length ? blocks.map(b => `
      <div class="blk-row" style="border-left:4px solid ${AG_COLORS[b.type] || '#3b82f6'}">
        <div class="blk-head">
          <span class="blk-time">${fmtTime(b.start)} – ${fmtTime(b.start + b.dur)}</span>
          <span class="blk-dur">${agDurLabel(b.dur)}</span>
        </div>
        <div class="blk-title">${escHtml((b.emoji || '') + ' ' + b.label)}</div>
        ${b.notes ? `<div class="blk-note">${escHtml(b.notes)}</div>` : ''}
      </div>`).join('') : '<div class="free-day">Journée libre</div>';
    return `<div class="day">
      <div class="day-head"><span class="dh-name">${dh.day}</span><span class="dh-date">${dh.date}</span>
        <span class="dh-meta">${s.chillDays[iso] ? '<span class="chill-badge">😎 détente</span>' : ''}${dayMin ? `<span class="day-stat">${agDurLabel(dayMin)}</span>` : ''}</span></div>
      <div class="day-body">${rows}</div>
    </div>`;
  }).join('');

  vmOpenPrintable(`Planning — ${t.nom}`, `
    <style>
      .days-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
      .day{break-inside:avoid;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;overflow:hidden}
      .day-head{background:#1e293b;color:#fff;padding:5px 9px;display:flex;align-items:center;gap:7px}
      .dh-name{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
      .dh-date{font-size:10px;opacity:.75;flex:1}
      .dh-meta{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
      .chill-badge,.day-stat{font-size:8.5px;border-radius:99px;padding:1px 5px}
      .chill-badge{background:rgba(167,139,250,.3);color:#e9e3ff}
      .day-stat{background:rgba(99,102,241,.3);color:#dfe3ff}
      .day-body{padding:6px}
      .blk-row{background:#fff;border-radius:4px;padding:4px 7px;margin-bottom:4px;box-shadow:0 1px 2px #0000000d}
      .blk-head{display:flex;align-items:center;gap:5px}
      .blk-time{font-size:9.5px;color:#475569;font-weight:600;font-variant-numeric:tabular-nums}
      .blk-dur{font-size:8.5px;color:#94a3b8;margin-left:auto}
      .blk-title{font-size:10.5px;font-weight:600;color:#1e293b;line-height:1.3}
      .blk-note{font-size:9px;color:#64748b;margin-top:3px;font-style:italic;border-top:1px dotted #e2e8f0;padding-top:3px}
      .free-day{padding:10px;text-align:center;color:#94a3b8;font-style:italic;font-size:10px}
    </style>
    <header>
      <div>
        <h1>${escHtml((d.emoji || '✈️') + ' ' + t.nom)} — Planning de voyage</h1>
        <div class="sub">${escHtml(d.pays || '')} · ${days.length} jour${days.length > 1 ? 's' : ''} · ${s.blocks.length} activité${s.blocks.length > 1 ? 's' : ''}</div>
      </div>
      <div class="right">Édité le ${escHtml(today)}${totalMin ? `<br><strong>⏱ ${escHtml(agDurLabel(totalMin))} planifiées</strong>` : ''}</div>
    </header>
    <div class="days-grid">${daysHTML}</div>`);
}

// ── Moteur drag & drop (pointer events) ──────────────────
let agDrag = null;
let agResize = null;
let _agMoveTs = 0;

function agBindPalette() {
  $$('.pal-block').forEach(el => {
    el.addEventListener('pointerdown', e => {
      const def = AG_PALETTE[el.dataset.cat][+el.dataset.idx];
      agStartDrag(e, 'new', { ...def });
    });
  });
}

function agBindBlocks() {
  $$('.ag-block').forEach(el => {
    const id = el.dataset.id;
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('.blk-del')) return;
      if (e.target.classList.contains('blk-resize')) { agStartResize(e, id, el); return; }
      agStartDrag(e, 'move', null, id, el);
    });
    el.addEventListener('dblclick', e => { e.preventDefault(); agOpenEdit(e, id); });
  });
}

function agBindQuickAdd() {
  $$('.ag-daycol').forEach(col => {
    col.addEventListener('click', e => {
      if (Date.now() - _agLastDragEnd < 350) return;
      if (e.target.closest('.ag-block')) return;
      const rect = col.getBoundingClientRect();
      const rawMin = st().hstart * 60 + (e.clientY - rect.top) / PX_PER_MIN;
      agOpenQuickAdd(e, col.dataset.day, Math.round(rawMin / SLOT_MIN) * SLOT_MIN);
    });
  });
}

function agStartDrag(e, mode, payload, blockId, el) {
  e.preventDefault();
  agDrag = { mode, payload, blockId, el, started: false, sx: e.clientX, sy: e.clientY, ghost: null, off: { x: 0, y: 0 } };
  if (mode === 'move' && el) {
    const r = el.getBoundingClientRect();
    agDrag.off = { x: e.clientX - r.left, y: e.clientY - r.top };
    agDrag.size = { w: r.width, h: r.height };
  }
  window.addEventListener('pointermove', agOnMove);
  window.addEventListener('pointerup', agOnUp, { once: true });
}

function agMakeGhost() {
  const g = document.createElement('div');
  g.className = 'ag-ghost';
  let label, color, w, h;
  if (agDrag.mode === 'new') {
    const p = agDrag.payload;
    label = `${p.emoji} ${p.label}`; color = AG_COLORS[p.type]; w = 150; h = Math.max(p.dur * PX_PER_MIN, 30);
    agDrag.off = { x: w / 2, y: 14 };
  } else {
    const b = st().blocks.find(x => x.id === agDrag.blockId);
    label = `${b.emoji || ''} ${b.label}`; color = AG_COLORS[b.type]; w = agDrag.size.w; h = agDrag.size.h;
    if (agDrag.el) agDrag.el.style.opacity = '.35';
  }
  g.style.width = w + 'px'; g.style.height = h + 'px'; g.style.background = color;
  g.textContent = label;
  document.body.appendChild(g);
  agDrag.ghost = g;
}

function agColUnder(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    const c = el.closest && el.closest('.ag-daycol');
    if (c) return c;
  }
  return null;
}

function agOnMove(e) {
  if (!agDrag) return;
  if (!agDrag.started) {
    if (Math.abs(e.clientX - agDrag.sx) < 4 && Math.abs(e.clientY - agDrag.sy) < 4) return;
    agDrag.started = true;
    agMakeGhost();
  }
  const now = Date.now();
  if (now - _agMoveTs < 32) return;      // ~30 fps
  _agMoveTs = now;
  agDrag.ghost.style.left = (e.clientX - agDrag.off.x) + 'px';
  agDrag.ghost.style.top = (e.clientY - agDrag.off.y) + 'px';
  $$('.ag-daycol.drop-hover').forEach(c => c.classList.remove('drop-hover'));
  const col = agColUnder(e.clientX, e.clientY - agDrag.off.y + 6);
  if (col) col.classList.add('drop-hover');
}

function agOnUp(e) {
  window.removeEventListener('pointermove', agOnMove);
  $$('.ag-daycol.drop-hover').forEach(c => c.classList.remove('drop-hover'));
  if (!agDrag) return;
  if (!agDrag.started) { agDrag = null; return; }
  _agLastDragEnd = Date.now();
  if (agDrag.ghost) agDrag.ghost.remove();
  const s = st();
  const topY = e.clientY - agDrag.off.y;
  const col = agColUnder(e.clientX, topY + 6);
  if (col) {
    agPushHistory();
    const rect = col.getBoundingClientRect();
    let start = Math.round((s.hstart * 60 + (topY - rect.top) / PX_PER_MIN) / SLOT_MIN) * SLOT_MIN;
    if (agDrag.mode === 'new') {
      const p = agDrag.payload;
      start = Math.max(s.hstart * 60, Math.min(start, s.hend * 60 - p.dur));
      s.blocks.push({ id: agId(), day: col.dataset.day, start, dur: p.dur, type: p.type, emoji: p.emoji, label: p.label, chill: !!p.chill });
    } else {
      const b = s.blocks.find(x => x.id === agDrag.blockId);
      start = Math.max(s.hstart * 60, Math.min(start, s.hend * 60 - b.dur));
      b.day = col.dataset.day; b.start = start;
    }
    agSave();
  }
  agDrag = null;
  agRender();
}

function agStartResize(e, id, el) {
  e.preventDefault(); e.stopPropagation();
  agResize = { id, el, startY: e.clientY };
  window.addEventListener('pointermove', agOnResize);
  window.addEventListener('pointerup', agOnResizeUp, { once: true });
}

function agOnResize(e) {
  if (!agResize) return;
  const s = st();
  const b = s.blocks.find(x => x.id === agResize.id);
  const rect = agResize.el.getBoundingClientRect();
  let dur = Math.max(MIN_DUR, Math.round(((e.clientY - rect.top) / PX_PER_MIN) / SLOT_MIN) * SLOT_MIN);
  dur = Math.min(dur, s.hend * 60 - b.start);
  agResize.el.style.height = (dur * PX_PER_MIN) + 'px';
  agResize.el.querySelector('.blk-time').textContent = `${fmtTime(b.start)}–${fmtTime(b.start + dur)}`;
  agResize._dur = dur;
}

function agOnResizeUp() {
  window.removeEventListener('pointermove', agOnResize);
  if (agResize && agResize._dur) {
    agPushHistory();
    const b = st().blocks.find(x => x.id === agResize.id);
    b.dur = agResize._dur;
    agSave();
  }
  agResize = null;
  agRender();
}

// ── Chargement d'un programme généré ─────────────────────
function agLoadProgram(tripId, program) {
  const trip = getTrip(tripId);
  if (!trip || !program) return;
  const range = defaultDateRange();
  const start = trip.date_depart || range.start;
  const end = addDaysISO(start, program.days - 1);
  const days = dayList(start, end);
  const blocks = [];
  program.blocks.forEach(b => {
    const day = days[b.d];
    if (!day) return;
    blocks.push({ id: agId(), day, start: b.h * 60 + b.m, dur: b.dur, type: b.type, emoji: b.emoji, label: b.label, chill: !!b.chill });
  });
  setAgenda(tripId, { start, end, hstart: program.hstart, hend: program.hend, blocks, chillDays: {} });
  agCurrent = tripId;
  buildAgendaSelect();
  $('#ag-dest-select').value = tripId;
  agOnDestChange();
  showToast('✨ Programme chargé dans l\'agenda');
}

// ── Câblage ──────────────────────────────────────────────
function init() {
  const page = document.getElementById('page-agenda');
  if (!page) return;

  delegate(page, 'change', '#ag-dest-select', agOnDestChange);
  delegate(page, 'change', '#ag-start,#ag-end,#ag-hstart,#ag-hend', agRebuild);
  delegate(page, 'click', '[data-ag-print]', agPrint);
  delegate(page, 'click', '[data-ag-export]', agExport);
  delegate(page, 'click', '[data-ag-clear]', agClear);
  delegate(page, 'click', '[data-ag-undo]', agUndo);
  delegate(page, 'click', '[data-toggle-palette]', () => {
    _agPaletteCollapsed = !_agPaletteCollapsed;
    agRender();
  });
  delegate(page, 'click', '[data-chill]', (e, el) => agToggleChill(el.dataset.chill));
  delegate(page, 'click', '[data-del-block]', (e, el) => { e.stopPropagation(); agDelBlock(el.dataset.delBlock); });

  // Popup d'édition (hors de la page, dans body)
  delegate(document, 'click', '[data-ep-close]', () => document.getElementById('ag-edit-popup')?.remove());
  delegate(document, 'click', '[data-ep-add]', agQuickAddSave);
  delegate(document, 'click', '[data-ep-save]', (e, el) => agSaveEdit(el.dataset.epSave));
  delegate(document, 'click', '[data-ep-dup]', (e, el) => agDuplicateBlock(el.dataset.epDup));
  delegate(document, 'click', '[data-ep-del]', (e, el) => agDelBlock(el.dataset.epDel));
  delegate(document, 'input', '[data-ep-sync]', (e, el) => agEpSync(el.dataset.epSync));

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey
        && page.classList.contains('active')) { e.preventDefault(); agUndo(); }
  });

  buildAgendaSelect();
  subscribe(buildAgendaSelect);
}

Object.assign(window, {
  buildAgendaSelect, agOnDestChange, agRebuild, agRender, agPrint, agExport, agClear,
  agUndo, agSelectTrip, agLoadProgram, AG_COLORS, AG_PALETTE, initAgenda: init,
});
})();
