// ============================================================
// views/trips.js — "Mes voyages" : cartes + suivi d'avancement
// (Phase 1C — refonte modulaire)
// ============================================================
import { load, subscribe, getTrips, getTrip, updateTrip, progress } from '../store.js';
import {
  TRIP_STATUS, ELEMENT_STATUS, tripStatusMeta, elStatusMeta,
  nextElStatus, nextTripStatus,
} from '../model.js';

// ── Utilitaires de rendu ────────────────────────────────
function chip(color, label, extra = '') {
  return `<span class="status-chip" style="--c:${color}" ${extra}>${label}</span>`;
}

function progressBar(pct) {
  const color = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--muted)';
  return `<div class="trip-prog"><div class="trip-prog-bar" style="width:${pct}%;background:${color}"></div></div>
          <span class="trip-prog-pct">${pct}%</span>`;
}

function tripCardHTML(t) {
  const meta = tripStatusMeta(t.status);
  const pct = progress(t);
  const dates = t.date_depart ? `${t.date_depart} → ${t.date_retour || '?'}` : 'Dates à définir';
  return `
    <div class="trip-card" data-trip="${t.id}">
      <div class="trip-card-top">
        <span class="trip-emoji">${t.emoji || '✈️'}</span>
        <div class="trip-card-head">
          <div class="trip-name">${t.nom}</div>
          <div class="trip-dates">${dates}</div>
        </div>
      </div>
      <div class="trip-badge" style="--c:${meta.color}">${meta.label}</div>
      <div class="trip-prog-row">${progressBar(pct)}</div>
    </div>`;
}

// ── Grille dashboard ────────────────────────────────────
function renderMount() {
  const mount = document.getElementById('trips-mount');
  if (!mount) return;
  const trips = getTrips();
  if (!trips.length) {
    mount.innerHTML = `<p style="color:var(--muted);font-size:.85rem">Aucun voyage. Crée-en un depuis une destination.</p>`;
    return;
  }
  mount.innerHTML = `<div class="trip-grid">${trips.map(tripCardHTML).join('')}</div>`;
}

// ── Modale détail / suivi ───────────────────────────────
function ensureModal() {
  let ov = document.getElementById('trip-modal-overlay');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'trip-modal-overlay';
  ov.className = 'modal-overlay hidden';
  ov.innerHTML = `<div class="modal" id="trip-modal" style="max-width:680px"></div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.add('hidden'); });
  return ov;
}

function elementRow(label, emoji, type, statusKey, dataAttr) {
  const opts = ELEMENT_STATUS[type];
  const meta = elStatusMeta(type, statusKey);
  return `
    <div class="el-row">
      <div class="el-label">${emoji} ${label}</div>
      <div class="el-chips">
        ${opts.map(o => `<button class="status-chip ${o.key === statusKey ? 'on' : ''}" style="--c:${o.color}"
            ${dataAttr}="${o.key}">${o.label}</button>`).join('')}
      </div>
    </div>`;
}

function openTripModal(id) {
  const t = getTrip(id);
  if (!t) return;
  const ov = ensureModal();
  const meta = tripStatusMeta(t.status);
  const pct = progress(t);
  const m = document.getElementById('trip-modal');
  m.innerHTML = `
    <div class="modal-header">
      <div class="modal-emoji">${t.emoji || '✈️'}</div>
      <div class="modal-title">
        <h2>${t.nom}</h2>
        <div style="color:var(--muted);font-size:.85rem">${t.pays || ''} · ${t.date_depart ? t.date_depart + ' → ' + (t.date_retour || '?') : 'Dates à définir'}</div>
      </div>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="trip-status-block">
        <div class="el-label" style="margin-bottom:8px">📊 Statut global du voyage</div>
        <div class="el-chips" id="trip-global-status">
          ${TRIP_STATUS.map(s => `<button class="status-chip ${s.key === t.status ? 'on' : ''}" style="--c:${s.color}" data-trip-status="${s.key}">${s.label}</button>`).join('')}
        </div>
        <div class="trip-prog-row" style="margin-top:14px">${progressBar(pct)}</div>
      </div>

      <h3 style="font-size:.85rem;font-weight:600;margin:18px 0 10px">🧩 Avancement par élément</h3>
      ${elementRow('Transport', '✈️', 'transport', t.transport.status, 'data-transport')}
      ${elementRow('Hébergement', '🏨', 'hebergement', t.hebergement.status, 'data-hebergement')}

      ${t.activites && t.activites.length ? `
        <div class="el-label" style="margin:14px 0 8px">🎯 Activités</div>
        <div class="act-list">
          ${t.activites.map((a, i) => {
            const am = elStatusMeta('activite', a.status);
            return `<div class="act-item">
              <span class="act-name">${a.nom}</span>
              <button class="status-chip on" style="--c:${am.color}" data-act="${i}">${am.label}</button>
            </div>`;
          }).join('')}
        </div>` : ''}

      <div class="info-box" style="margin-top:16px;font-size:.8rem">
        💡 Clique sur un statut pour le changer (transport/hébergement) ou faire défiler (activités/statut global). La progression se met à jour automatiquement.
      </div>
    </div>`;

  // Handlers (délégation)
  m.querySelector('[data-close]').addEventListener('click', () => ov.classList.add('hidden'));

  m.querySelector('#trip-global-status').addEventListener('click', e => {
    const b = e.target.closest('[data-trip-status]'); if (!b) return;
    updateTrip(id, { status: b.dataset.tripStatus });
    openTripModal(id);
  });
  m.querySelectorAll('[data-transport]').forEach(b => b.addEventListener('click', () => {
    updateTrip(id, t2 => ({ transport: { ...t2.transport, status: b.dataset.transport } }));
    openTripModal(id);
  }));
  m.querySelectorAll('[data-hebergement]').forEach(b => b.addEventListener('click', () => {
    updateTrip(id, t2 => ({ hebergement: { ...t2.hebergement, status: b.dataset.hebergement } }));
    openTripModal(id);
  }));
  m.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.act;
    updateTrip(id, t2 => {
      const acts = t2.activites.slice();
      acts[i] = { ...acts[i], status: nextElStatus('activite', acts[i].status) };
      return { activites: acts };
    });
    openTripModal(id);
  }));

  ov.classList.remove('hidden');
}

// Exposé pour usage éventuel depuis le code legacy (onclick inline)
window.openTripModal = openTripModal;

// ── Bootstrap ───────────────────────────────────────────
function init() {
  load();
  renderMount();
  subscribe(renderMount);
  const mount = document.getElementById('trips-mount');
  if (mount) {
    mount.addEventListener('click', e => {
      const card = e.target.closest('[data-trip]');
      if (card) openTripModal(card.dataset.trip);
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
