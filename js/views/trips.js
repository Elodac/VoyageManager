// ============================================================
// views/trips.js — "Mes voyages" : cartes + suivi d'avancement
// (Phase 1C — refonte modulaire)
// ============================================================
(function () {

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
      <button class="trip-del" data-del-trip-card="${t.id}" title="Supprimer ce voyage" aria-label="Supprimer ce voyage">✕</button>
      <div class="trip-card-top">
        <span class="trip-emoji">${_esc(t.emoji || '✈️')}</span>
        <div class="trip-card-head">
          <div class="trip-name">${_esc(t.nom)}</div>
          <div class="trip-dates">${_esc(dates)}</div>
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

const _esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function elementRow(label, emoji, type, statusKey, dataAttr, value, editKey) {
  const opts = ELEMENT_STATUS[type];
  const editable = editKey != null
    ? `<div class="el-value" data-edit="${editKey}" data-val="${_esc(value)}" title="Double-clique pour modifier">${value ? _esc(value) : '<em>à préciser…</em>'}</div>`
    : '';
  return `
    <div class="el-row">
      <div class="el-label">
        <div>${emoji} ${label}</div>
        ${editable}
      </div>
      <div class="el-chips">
        ${opts.map(o => `<button class="status-chip ${o.key === statusKey ? 'on' : ''}" style="--c:${o.color}"
            ${dataAttr}="${o.key}">${o.label}</button>`).join('')}
      </div>
    </div>`;
}

// Édition inline d'un intitulé (transport/hébergement/activité) au double-clic
function startInlineEdit(el, id) {
  const kind = el.dataset.edit;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'add-item-input';
  input.value = el.dataset.val || '';
  input.style.width = '100%';
  el.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const finish = (commit) => {
    if (done) return; done = true;
    if (commit) {
      const v = input.value.trim();
      updateTrip(id, t2 => {
        if (kind === 'transport') return { transport: { ...t2.transport, label: v } };
        if (kind === 'hebergement') return { hebergement: { ...t2.hebergement, nom: v } };
        if (kind.startsWith('act:')) {
          const i = +kind.slice(4);
          const acts = (t2.activites || []).slice();
          if (acts[i]) acts[i] = { ...acts[i], nom: v };
          return { activites: acts };
        }
        return {};
      });
    }
    openTripModal(id);
  };
  input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
    else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
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
      <div class="modal-emoji">${_esc(t.emoji || '✈️')}</div>
      <div class="modal-title">
        <h2>${_esc(t.nom)}</h2>
        <div style="color:var(--muted);font-size:.85rem">${_esc(t.pays || '')} · ${t.date_depart ? _esc(t.date_depart + ' → ' + (t.date_retour || '?')) : 'Dates à définir'}</div>
      </div>
      <button class="modal-close" data-close>✕</button>
    </div>
    <div class="modal-body">
      <div class="trip-status-block">
        <div class="el-label" style="margin-bottom:8px">🗂️ État du voyage</div>
        <select class="cat-select" id="trip-cat-select" style="width:100%;max-width:340px">
          <option value="confirme">✅ Confirmé</option>
          <option value="planification">🔍 En planification</option>
          <option value="projet">📋 Projet Europe</option>
          <option value="projet_longterme">🌍 Long courrier</option>
          <option value="aucun">➖ Retirer du suivi (archiver)</option>
        </select>
        <div class="trip-prog-row" style="margin-top:14px">${progressBar(pct)}</div>
      </div>

      <h3 style="font-size:.85rem;font-weight:600;margin:18px 0 10px">🧩 Avancement par élément</h3>
      ${elementRow('Transport', '✈️', 'transport', t.transport.status, 'data-transport', t.transport.label, 'transport')}
      ${elementRow('Hébergement', '🏨', 'hebergement', t.hebergement.status, 'data-hebergement', t.hebergement.nom, 'hebergement')}

      <div class="el-label" style="margin:14px 0 8px;display:flex;align-items:center;gap:8px">
        🎯 Activités
        <button class="btn btn-outline btn-sm" data-add-act style="margin-left:auto;padding:3px 10px">➕ Ajouter</button>
      </div>
      <div class="act-list">
        ${(t.activites || []).map((a, i) => {
          const am = elStatusMeta('activite', a.status);
          return `<div class="act-item">
            <span class="act-name el-value" data-edit="act:${i}" data-val="${_esc(a.nom)}" title="Double-clique pour modifier">${_esc(a.nom)}</span>
            <button class="status-chip on" style="--c:${am.color}" data-act="${i}">${am.label}</button>
            <button class="act-del" data-del-act="${i}" title="Supprimer l'activité">✕</button>
          </div>`;
        }).join('') || '<div style="font-size:.8rem;color:var(--muted)">Aucune activité. Clique sur « Ajouter ».</div>'}
      </div>

      <div class="info-box" style="margin-top:16px;font-size:.8rem">
        💡 Clique sur un statut pour le changer · <strong>double-clique</strong> sur un intitulé (transport, hébergement, activité) pour le modifier · la progression se met à jour toute seule.
      </div>

      <h3 style="font-size:.85rem;font-weight:600;margin:18px 0 10px">📅 Dates du voyage</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <div class="adv-field" style="min-width:140px">
          <label style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">Départ</label>
          <input type="date" class="add-item-input" id="trip-date-dep" value="${t.date_depart||''}" style="font-size:.82rem">
        </div>
        <div class="adv-field" style="min-width:140px">
          <label style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">Retour</label>
          <input type="date" class="add-item-input" id="trip-date-ret" value="${t.date_retour||''}" style="font-size:.82rem">
        </div>
        <button class="btn btn-outline btn-sm" id="trip-dates-save">💾 Enregistrer les dates</button>
      </div>

      <h3 style="font-size:.85rem;font-weight:600;margin:18px 0 10px">📝 Notes &amp; bons plans</h3>
      <textarea id="trip-notes" class="add-item-input" style="width:100%;min-height:82px;resize:vertical;font-size:.84rem;line-height:1.5"
        placeholder="Réservations, bons plans, idées, contacts… (enregistré avec le bouton ci-dessous)">${_esc(t.notes || '')}</textarea>

      <h3 style="font-size:.85rem;font-weight:600;margin:18px 0 10px">🧰 Outils du voyage</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" data-go="agenda">📆 Agenda</button>
        <button class="btn btn-outline btn-sm" data-go="programmes">🧠 Programme</button>
        <button class="btn btn-outline btn-sm" data-go="transport">🚆 Transport</button>
        <button class="btn btn-outline btn-sm" data-go="valises">🧳 Valise</button>
        <button class="btn btn-outline btn-sm" data-go="recherche">🔍 Réserver</button>
        <button class="btn btn-outline btn-sm" data-go="carte">📍 Carte</button>
      </div>

      <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" data-dossier>📄 Imprimer / Générer le dossier de voyage</button>
        <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${routardUrl((window.DESTINATIONS||[]).find(d=>d.id===t.destinationId)||{nom:t.nom})}">🧭 Guide du Routard</a>
        <button class="btn btn-sm" style="background:#3b1111;color:#f87171;border:1px solid #7f1d1d;margin-left:auto" data-delete-trip>🗑️ Supprimer ce voyage</button>
      </div>

      <div class="trip-modal-footer">
        <button class="btn btn-success" id="trip-save-quit">💾 Enregistrer et quitter</button>
        <button class="btn btn-outline" data-close>Fermer</button>
      </div>
    </div>`;

  // Handlers (délégation)
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => ov.classList.add('hidden')));
  m.querySelector('[data-dossier]').addEventListener('click', () => openDossier(getTrip(id)));

  // Enregistrer et quitter (dates + notes)
  m.querySelector('#trip-save-quit').addEventListener('click', () => {
    const dep = document.getElementById('trip-date-dep').value;
    const ret = document.getElementById('trip-date-ret').value;
    const notes = document.getElementById('trip-notes').value;
    updateTrip(id, { date_depart: dep || null, date_retour: ret || null, notes });
    ov.classList.add('hidden');
    window.showToast && window.showToast('💾 Voyage enregistré !');
  });

  // Ajouter une activité
  m.querySelector('[data-add-act]').addEventListener('click', () => {
    const nom = prompt('Nom de l\'activité à ajouter :');
    if (!nom || !nom.trim()) return;
    updateTrip(id, t2 => ({ activites: [...(t2.activites || []), { nom: nom.trim(), type: 'culture', status: 'prevue' }] }));
    openTripModal(id);
  });
  // Supprimer une activité
  m.querySelectorAll('[data-del-act]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.delAct;
    updateTrip(id, t2 => ({ activites: (t2.activites || []).filter((_, idx) => idx !== i) }));
    openTripModal(id);
  }));
  // Édition inline au double-clic (transport / hébergement / activité)
  m.addEventListener('dblclick', e => {
    const el = e.target.closest('[data-edit]');
    if (el) startInlineEdit(el, id);
  });
  m.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    ov.classList.add('hidden');
    vmGoTo(b.dataset.go, t.destinationId);
  }));

  // Sélecteur d'état unifié (catégorie destination + statut voyage synchronisés)
  const catSel = m.querySelector('#trip-cat-select');
  if (catSel) {
    const dstatut = ((window.DESTINATIONS || []).find(d => d.id === t.destinationId) || {}).statut || 'projet';
    catSel.value = dstatut;
    catSel.addEventListener('change', () => {
      const v = catSel.value;
      if (window.setDestStatut) window.setDestStatut(t.destinationId, v);
      if (v === 'aucun') { ov.classList.add('hidden'); return; } // archivé → on ferme
      openTripModal(id);
    });
  }
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

  // Sauvegarde des dates
  m.querySelector('#trip-dates-save').addEventListener('click', () => {
    const dep = document.getElementById('trip-date-dep').value;
    const ret = document.getElementById('trip-date-ret').value;
    updateTrip(id, { date_depart: dep || null, date_retour: ret || null });
    window.showToast && window.showToast('📅 Dates enregistrées !');
    openTripModal(id);
  });

  // Suppression du voyage
  m.querySelector('[data-delete-trip]').addEventListener('click', () => {
    if (!confirm(`Supprimer le voyage "${t.nom}" ? Cette action est irréversible.`)) return;
    removeTrip(id);
    ov.classList.add('hidden');
    window.showToast && window.showToast('🗑️ Voyage supprimé.');
  });

  ov.classList.remove('hidden');
  setTimeout(() => { const f = m.querySelector('#trip-cat-select, .modal-close'); if (f) f.focus(); }, 60);
}

// ── Navigation inter-pages (pré-sélectionne la destination) ──
function vmGoTo(page, destId) {
  window.showPage(page);
  setTimeout(() => {
    if (page === 'transport' && window.transportSelect) window.transportSelect(destId);
    else if (page === 'programmes' && window.programsSelect) window.programsSelect(destId);
    else if (page === 'agenda') { const s = document.getElementById('ag-dest-select'); if (s) { s.value = destId; window.agOnDestChange && window.agOnDestChange(); } }
    else if (page === 'valises') { const s = document.getElementById('valise-dest-select'); if (s) { s.value = destId; window.loadValise && window.loadValise(); } }
    else if (page === 'recherche') { const s = document.getElementById('search-dest-select'); if (s) { s.value = destId; window.updateSearchLinks && window.updateSearchLinks(); } }
    else if (page === 'carte') { window.focusMap && window.focusMap(destId); }
  }, 80);
}

/** Crée (ou retrouve) un voyage à partir d'une destination du catalogue. */
function vmCreateTrip(destId) {
  const dest = (window.DESTINATIONS || []).find(d => d.id === destId);
  if (!dest) return;
  let trip = getTripByDestination(destId);
  if (!trip) { trip = addTrip(tripFromDestination(dest)); window.showToast && window.showToast('🧳 Voyage créé !'); }
  if (window.closeModal) window.closeModal();
  openTripModal(trip.id);
}

// Exposé pour usage depuis le code legacy (onclick inline) et les autres vues
window.openTripModal = openTripModal;
window.vmGoTo = vmGoTo;
window.vmCreateTrip = vmCreateTrip;

// ── Bootstrap ───────────────────────────────────────────
function init() {
  loadStore();
  renderMount();
  subscribe(renderMount);
  const mount = document.getElementById('trips-mount');
  if (mount) {
    mount.addEventListener('click', e => {
      const del = e.target.closest('[data-del-trip-card]');
      if (del) {
        e.stopPropagation();
        const id = del.dataset.delTripCard;
        const t = getTrip(id);
        if (t && confirm(`Supprimer le voyage « ${t.nom} » ?`)) {
          removeTrip(id);
          window.showToast && window.showToast('🗑️ Voyage supprimé.');
        }
        return;
      }
      const card = e.target.closest('[data-trip]');
      if (card) openTripModal(card.dataset.trip);
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
