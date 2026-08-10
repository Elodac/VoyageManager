// ============================================================
// views/trips.js — modale « Préparation & suivi » d'un voyage
//
// Le statut réel du voyage (les 8 états de TRIP_STATUS) est
// désormais éditable : il était masqué derrière un sélecteur de
// catégorie de destination, ce qui rendait le modèle inatteignable.
// La catégorie du catalogue est maintenant dérivée automatiquement.
// ============================================================
(function () {

function progressBar(pct, label) {
  const color = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--border-strong)';
  return `<div class="trip-prog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
               ${label ? `aria-label="${escAttr(label)}"` : ''}>
            <div class="trip-prog-bar" style="width:${pct}%;background:${color}"></div>
          </div>
          <span class="trip-prog-pct">${pct}%</span>`;
}

function elementRow(label, emoji, type, statusKey, dataAttr, value, editKey) {
  const opts = ELEMENT_STATUS[type];
  return `
    <div class="el-row">
      <div class="el-label">
        <div>${emoji} ${escHtml(label)}</div>
        ${editKey != null ? `<button type="button" class="el-value" data-edit="${escAttr(editKey)}"
           data-val="${escAttr(value || '')}" title="Cliquer pour modifier">
           ${value ? escHtml(value) : '<em>à préciser…</em>'}</button>` : ''}
      </div>
      <div class="el-chips" role="group" aria-label="Statut ${escAttr(label)}">
        ${opts.map(o => `<button type="button" class="status-chip ${o.key === statusKey ? 'on' : ''}"
            style="--c:${o.color}" ${dataAttr}="${escAttr(o.key)}"
            aria-pressed="${o.key === statusKey ? 'true' : 'false'}">${escHtml(o.label)}</button>`).join('')}
      </div>
    </div>`;
}

// ── Édition d'un intitulé au clic ────────────────────────
function startInlineEdit(el, id) {
  const kind = el.dataset.edit;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'add-item-input';
  input.value = el.dataset.val || '';
  el.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const finish = commit => {
    if (done) return;
    done = true;
    if (commit) {
      const v = input.value.trim();
      updateTrip(id, t2 => {
        if (kind === 'transport') return { transport: { ...t2.transport, label: v } };
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

// ── Section logement ─────────────────────────────────────
function lodgingSectionHTML(t) {
  const h = t.hebergement || {};
  const ctx = bookingContext({ trip: t });
  const tools = lodgingLinks({ trip: t });
  const F = (id, lbl, val, type) => `
    <div class="adv-field">
      <label for="${id}">${escHtml(lbl)}</label>
      <input id="${id}" class="add-item-input lg-field" type="${type || 'text'}" value="${escAttr(val || '')}">
    </div>`;
  return `
    <h3 class="section-title">🏨 Choisir son logement</h3>
    <div class="lodging-tools">${tools.map(x =>
      `<a class="mini-btn" target="_blank" rel="noopener noreferrer" href="${safeUrl(x.url)}">${escHtml(x.emoji)} ${escHtml(x.label)}</a>`).join('')}</div>
    <p class="lodging-hint">${ctx.hasDates
      ? `Recherches pré-remplies du <strong>${escHtml(ctx.checkin)}</strong> au <strong>${escHtml(ctx.checkout)}</strong> pour ${escHtml(ctx.travelers)} personne(s).`
      : 'Renseigne les dates du voyage ci-dessous pour que les recherches soient pré-remplies.'}
      Compare, puis enregistre le logement retenu.</p>
    <div class="lodging-form">
      ${F('lg-nom', 'Nom du logement', h.nom)}
      ${F('lg-lien', 'Lien (Booking / Airbnb…)', h.lien, 'url')}
      ${F('lg-adresse', 'Adresse', h.adresse)}
      ${F('lg-prix', 'Prix (ex : 95€/nuit)', h.prix)}
      ${F('lg-ci-date', '🛬 Date d\'arrivée', h.checkinDate || ctx.checkin, 'date')}
      ${F('lg-ci-time', '🛬 Heure d\'arrivée', h.checkinTime, 'time')}
      ${F('lg-co-date', '🛫 Date de départ', h.checkoutDate || ctx.checkout, 'date')}
      ${F('lg-co-time', '🛫 Heure de départ', h.checkoutTime, 'time')}
      ${F('lg-tel', '📞 Téléphone', h.tel, 'tel')}
      ${F('lg-email', '✉️ Email', h.email, 'email')}
      <div class="adv-field lg-full">
        <label for="lg-notes">Notes (code d'accès, contact, à savoir…)</label>
        <textarea id="lg-notes" class="add-item-input lg-field lg-notes">${escHtml(h.notes || '')}</textarea>
      </div>
    </div>
    <div class="el-chips mt-sm" role="group" aria-label="Statut de l'hébergement">
      ${ELEMENT_STATUS.hebergement.map(o => `<button type="button" class="status-chip ${o.key === h.status ? 'on' : ''}"
        style="--c:${o.color}" data-hebergement="${escAttr(o.key)}"
        aria-pressed="${o.key === h.status ? 'true' : 'false'}">${escHtml(o.label)}</button>`).join('')}
    </div>
    <button type="button" class="btn btn-success btn-sm mt-sm" id="lodging-save">💾 Enregistrer le logement</button>`;
}

// ── Modale ───────────────────────────────────────────────
function openTripModal(id) {
  const t = getTrip(id);
  if (!t) return;
  const ov = ensureOverlay('trip-modal-overlay', 'trip-modal-title');
  const pct = progress(t);
  const d = destById(t.destinationId) || {};

  ov.innerHTML = `
    <div class="modal" id="trip-modal" role="document">
      <div class="modal-header">
        <span class="modal-emoji" aria-hidden="true">${escHtml(t.emoji || '✈️')}</span>
        <div class="modal-title">
          <h2 id="trip-modal-title">${escHtml(t.nom)}</h2>
          <p class="modal-sub">${escHtml(t.pays || '')}${t.date_depart
            ? ' · ' + escHtml(t.date_depart + ' → ' + (t.date_retour || '?')) : ' · Dates à définir'}</p>
        </div>
        <button type="button" class="modal-close" data-close aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">

        <section class="trip-status-block">
          <h3 class="el-label">🗂️ État du voyage</h3>
          <div class="el-chips" role="group" aria-label="Statut du voyage">
            ${TRIP_STATUS.filter(s => s.key !== 'archive').map(s => `
              <button type="button" class="status-chip ${s.key === t.status ? 'on' : ''}" style="--c:${s.color}"
                      data-trip-status="${escAttr(s.key)}"
                      aria-pressed="${s.key === t.status ? 'true' : 'false'}">${escHtml(s.label)}</button>`).join('')}
          </div>
          <p class="hint mt-xs">Catégorie au catalogue : <strong>${escHtml(statutMeta(d.statut).label)}</strong>
            — mise à jour automatiquement.</p>
          <div class="trip-prog-row mt-sm">${progressBar(pct, 'Avancement de la préparation')}</div>
        </section>

        <h3 class="section-title">🧩 Avancement par élément</h3>
        ${elementRow('Transport', '✈️', 'transport', t.transport.status, 'data-transport', t.transport.label, 'transport')}
        ${lodgingSectionHTML(t)}

        <div class="el-label section-head">
          🎯 Activités
          <button type="button" class="btn btn-outline btn-sm push-right" data-add-act>➕ Ajouter</button>
        </div>
        <div class="act-list">
          ${(t.activites || []).map((a, i) => {
            const am = elStatusMeta('activite', a.status);
            return `<div class="act-item">
              <button type="button" class="act-name el-value" data-edit="act:${i}" data-val="${escAttr(a.nom)}"
                      title="Cliquer pour renommer">${escHtml(a.nom)}</button>
              <button type="button" class="status-chip on" style="--c:${am.color}" data-act="${i}"
                      aria-label="Statut : ${escAttr(am.label)}. Cliquer pour passer au suivant">${escHtml(am.label)}</button>
              <button type="button" class="act-del" data-del-act="${i}"
                      aria-label="Supprimer ${escAttr(a.nom)}">✕</button>
            </div>`;
          }).join('') || '<p class="hint">Aucune activité. Clique sur « Ajouter ».</p>'}
        </div>

        <h3 class="section-title">📅 Dates &amp; voyageurs</h3>
        <div class="adv-filter-row gap-sm">
          <div class="adv-field">
            <label for="trip-date-dep">Départ</label>
            <input type="date" class="add-item-input" id="trip-date-dep" value="${escAttr(t.date_depart || '')}">
          </div>
          <div class="adv-field">
            <label for="trip-date-ret">Retour</label>
            <input type="date" class="add-item-input" id="trip-date-ret" value="${escAttr(t.date_retour || '')}">
          </div>
          <div class="adv-field">
            <label for="trip-travelers">Voyageurs</label>
            <input type="number" min="1" max="12" class="add-item-input" id="trip-travelers"
                   value="${escAttr(t.travelers || pref('travelers'))}">
          </div>
        </div>

        <h3 class="section-title">📝 Notes &amp; bons plans</h3>
        <label class="visually-hidden" for="trip-notes">Notes du voyage</label>
        <textarea id="trip-notes" class="add-item-input trip-notes"
          placeholder="Réservations, bons plans, idées, contacts…">${escHtml(t.notes || '')}</textarea>

        <h3 class="section-title">🧰 Outils du voyage</h3>
        <div class="btn-row">
          <button type="button" class="btn btn-outline btn-sm" data-go="agenda">📆 Agenda</button>
          <button type="button" class="btn btn-outline btn-sm" data-go="programmes">🧠 Programme</button>
          <button type="button" class="btn btn-outline btn-sm" data-go="transport">🚆 Transport</button>
          <button type="button" class="btn btn-outline btn-sm" data-go="valises">🧳 Valise</button>
          <button type="button" class="btn btn-outline btn-sm" data-go="recherche">🔍 Réserver</button>
          <button type="button" class="btn btn-outline btn-sm" data-go="carte">📍 Carte</button>
        </div>

        <div class="btn-row mt-md">
          <button type="button" class="btn btn-primary btn-sm" data-dossier>📄 Dossier de voyage imprimable</button>
          <a class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer"
             href="${safeUrl(routardUrl(d.nom ? d : { nom: t.nom }))}">🧭 Guide du Routard</a>
          <button type="button" class="btn btn-danger btn-sm push-right" data-delete-trip>🗑️ Supprimer ce voyage</button>
        </div>

        <div class="trip-modal-footer">
          <button type="button" class="btn btn-success" id="trip-save-quit">💾 Enregistrer et fermer</button>
          <button type="button" class="btn btn-outline" data-close>Fermer</button>
        </div>
      </div>
    </div>`;

  const m = ov.querySelector('#trip-modal');

  $$('[data-close]', m).forEach(b => b.addEventListener('click', () => { saveFields(); closeOverlay(ov); }));
  m.querySelector('[data-dossier]').addEventListener('click', () => { saveFields(); openDossier(getTrip(id)); });

  const saveFields = () => updateTrip(id, {
    date_depart: $('#trip-date-dep').value || '',
    date_retour: $('#trip-date-ret').value || '',
    travelers: Math.max(1, parseInt($('#trip-travelers').value, 10) || 1),
    notes: $('#trip-notes').value,
  });

  /**
   * Les dates, le nombre de voyageurs et les notes sont persistés dès la
   * saisie : fermer la fiche ne doit jamais faire perdre une modification.
   * Les dates étant la source de vérité de l'agenda, des valises et de
   * tous les liens de réservation, on rafraîchit ce qui en dépend.
   */
  const bindAutoSave = () => {
    ['#trip-date-dep', '#trip-date-ret', '#trip-travelers'].forEach(sel => {
      const el = m.querySelector(sel);
      if (el) {el.addEventListener('change', () => {
        saveFields();
        // Le bandeau de dates de l'en-tête et les liens de réservation suivent
        const t3 = getTrip(id);
        const sub = m.querySelector('.modal-sub');
        if (sub) {
          sub.textContent = `${t3.pays || ''}${t3.date_depart
            ? ' · ' + t3.date_depart + ' → ' + (t3.date_retour || '?') : ' · Dates à définir'}`;
        }
        const tools = m.querySelector('.lodging-tools');
        if (tools) {
          tools.innerHTML = lodgingLinks({ trip: t3 }).map(x =>
            `<a class="mini-btn" target="_blank" rel="noopener noreferrer" href="${safeUrl(x.url)}">${escHtml(x.emoji)} ${escHtml(x.label)}</a>`).join('');
        }
        showToast('📅 Dates enregistrées');
      });}
    });
    const notes = m.querySelector('#trip-notes');
    if (notes) notes.addEventListener('blur', saveFields);
  };
  bindAutoSave();

  m.querySelector('#trip-save-quit').addEventListener('click', () => {
    saveFields();
    closeOverlay(ov);
    showToast('💾 Voyage enregistré');
  });

  m.querySelector('[data-add-act]').addEventListener('click', async () => {
    const nom = await vmPrompt({ title: 'Ajouter une activité', label: 'Nom de l\'activité' });
    if (!nom) return;
    updateTrip(id, t2 => ({ activites: [...(t2.activites || []), { nom, type: 'culture', status: 'prevue' }] }));
    openTripModal(id);
  });

  delegate(m, 'click', '[data-del-act]', (e, el) => {
    const i = +el.dataset.delAct;
    const act = (getTrip(id).activites || [])[i];
    updateTrip(id, t2 => ({ activites: (t2.activites || []).filter((_, idx) => idx !== i) }));
    if (act) {pushUndo(`Activité « ${act.nom} » supprimée`, () => {
      updateTrip(id, t2 => { const a = (t2.activites || []).slice(); a.splice(i, 0, act); return { activites: a }; });
      openTripModal(id);
    });}
    openTripModal(id);
  });

  delegate(m, 'click', '[data-edit]', (e, el) => startInlineEdit(el, id));
  delegate(m, 'click', '[data-go]', (e, el) => { saveFields(); closeOverlay(ov); vmGoTo(el.dataset.go, id); });

  delegate(m, 'click', '[data-trip-status]', (e, el) => {
    updateTrip(id, { status: el.dataset.tripStatus });
    openTripModal(id);
    ['buildPinned', 'buildDashboard', 'renderDestGrid'].forEach(f => window[f] && window[f]());
  });
  delegate(m, 'click', '[data-transport]', (e, el) => {
    updateTrip(id, t2 => ({ transport: { ...t2.transport, status: el.dataset.transport } }));
    openTripModal(id);
  });
  delegate(m, 'click', '[data-hebergement]', (e, el) => {
    updateTrip(id, t2 => ({ hebergement: { ...t2.hebergement, status: el.dataset.hebergement } }));
    openTripModal(id);
  });
  delegate(m, 'click', '[data-act]', (e, el) => {
    const i = +el.dataset.act;
    updateTrip(id, t2 => {
      const acts = t2.activites.slice();
      acts[i] = { ...acts[i], status: nextElStatus('activite', acts[i].status) };
      return { activites: acts };
    });
    openTripModal(id);
  });

  m.querySelector('#lodging-save').addEventListener('click', () => {
    const gv = x => { const el = document.getElementById(x); return el ? el.value.trim() : ''; };
    updateTrip(id, t2 => ({
      hebergement: Object.assign({}, t2.hebergement, {
        nom: gv('lg-nom'), lien: gv('lg-lien'), adresse: gv('lg-adresse'), prix: gv('lg-prix'),
        checkinDate: gv('lg-ci-date'), checkoutDate: gv('lg-co-date'),
        checkinTime: gv('lg-ci-time'), checkoutTime: gv('lg-co-time'),
        tel: gv('lg-tel'), email: gv('lg-email'), notes: gv('lg-notes'),
      }),
    }));
    showToast('🏨 Logement enregistré');
    logHistory('logement enregistré', $('#lg-nom').value.trim() || t.nom);
    openTripModal(id);
  });

  m.querySelector('[data-delete-trip]').addEventListener('click', async () => {
    closeOverlay(ov);
    await window.deleteTrip(id);
  });

  openOverlay(ov);
}

function vmCreateTrip(destId) {
  const t = getTripByDestination(destId);
  if (t) { openTripModal(t.id); return; }
  window.createVoyageFromDest && createVoyageFromDest(destId);
}

Object.assign(window, { openTripModal, vmCreateTrip });
})();
