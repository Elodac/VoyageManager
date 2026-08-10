// ============================================================
// views/roadtrips.js — module Road Trip
//
// L'éditeur est une PAGE, plus une modale. C'est ce qui corrige à la
// racine le bug « ouvrir une fiche annule le road trip » : une fiche
// destination est une modale qui se superpose à la page ; la fermer
// ramène naturellement à l'éditeur, intact.
//
// Le brouillon est autosauvegardé (vm_rt_draft) : quitter l'app, aller
// sur une autre page ou recharger ne perd rien.
//
// Le rendu est granulaire (une fonction par section) : plus de
// reconstruction intégrale du DOM qui invalidait les références et
// faisait perdre le focus au deuxième clic.
// ============================================================
(function () {

const DRAFT_KEY = 'vm_rt_draft';

let view = 'list';        // 'list' | 'editor'
let draft = null;         // road trip en cours d'édition (copie de travail)
let baseline = '';        // instantané JSON pour détecter les modifications
let openStops = new Set();
let geoResults = [];
let searchAbort = null;
let countryPick = '';

/**
 * Empreinte du contenu métier, hors horodatage : `updatedAt` change à
 * chaque autosauvegarde et faisait apparaître le brouillon comme
 * modifié une milliseconde après avoir été enregistré.
 */
const fingerprint = rt => {
  if (!rt) return '';
  const { updatedAt: _u, createdAt: _c, ...rest } = rt;
  return JSON.stringify(rest);
};
const dirty = () => !!draft && fingerprint(draft) !== baseline;

// ── Persistance du brouillon ─────────────────────────────
function saveDraft() {
  if (!draft) { lsRemove(DRAFT_KEY); return; }
  draft.updatedAt = Date.now();
  lsSet(DRAFT_KEY, { rt: draft, baseline, openStops: [...openStops] });
}
function clearDraft() { draft = null; baseline = ''; openStops = new Set(); lsRemove(DRAFT_KEY); }
function loadDraft() {
  const d = lsGet(DRAFT_KEY, null);
  if (!d || !d.rt) return null;
  try {
    draft = rtNormalize(d.rt);
    baseline = d.baseline || '';
    openStops = new Set(d.openStops || []);
    return draft;
  } catch { lsRemove(DRAFT_KEY); return null; }
}

/** Toute mutation passe par ici : synchro des segments, sauvegarde, rendu ciblé. */
function mutate(fn, sections) {
  if (!draft) return;
  fn(draft);
  draft.segments = rtSyncSegments(draft, draft.segments);
  draft.pays = [...new Set(draft.stops.map(s => s.pays).filter(Boolean))];
  saveDraft();
  renderSections(sections || ['itineraire', 'resume', 'budget', 'controle', 'header']);
}

// ══════════════════════════════════════════════════════════
//  VUE LISTE
// ══════════════════════════════════════════════════════════
function renderList() {
  const mount = $('#roadtrips-mount');
  if (!mount) return;
  const rts = getRoadtrips().map(rtNormalize);
  const hasDraft = !!lsGet(DRAFT_KEY, null);

  const draftBanner = hasDraft && !getRoadtrips().some(r => r.id === (lsGet(DRAFT_KEY, {}).rt || {}).id)
    ? `<div class="info-box warning rt-draft-banner">
         <strong>📝 Brouillon en cours</strong> — un road trip non enregistré a été retrouvé.
         <div class="btn-row mt-xs">
           <button type="button" class="btn btn-primary btn-sm" data-rt-resume>Reprendre</button>
           <button type="button" class="btn btn-outline btn-sm" data-rt-discard>Supprimer le brouillon</button>
         </div>
       </div>` : '';

  // Les road trips archivés sont sortis de la liste principale mais restent
  // consultables : archiver n'est pas supprimer.
  const actifs = rts.filter(r => r.status !== 'archive');
  const archives = rts.filter(r => r.status === 'archive');

  mount.className = '';
  mount.innerHTML = draftBanner + (actifs.length ? `
    <div class="grid grid-3">${actifs.map(rtCardHTML).join('')}</div>
  ` : `
    <div class="pin-empty">
      <p>🚗 <strong>${archives.length ? 'Aucun road trip actif.' : 'Aucun road trip pour l\'instant.'}</strong></p>
      <p>Compose un itinéraire multi-étapes : transports, hébergements, budget et dossier imprimable.</p>
      <button type="button" class="btn btn-primary" data-rt-new>➕ Créer ${archives.length ? 'un road trip' : 'mon premier road trip'}</button>
    </div>`)
  + (archives.length ? `
    <details class="rt-archives"${archives.length && !actifs.length ? ' open' : ''}>
      <summary>🗄️ Road trips archivés <span class="pin-group-count">${archives.length}</span></summary>
      <div class="grid grid-3 mt-sm">${archives.map(rtCardHTML).join('')}</div>
    </details>` : '');
}

function rtCardHTML(rt) {
  const s = rtStats(rt);
  const meta = rtStatusMeta(rt.status);
  const route = [rt.origin.nom, ...rt.stops.map(x => shortName(x))].filter(Boolean).join(' → ') || 'Itinéraire à composer';
  const issues = rtValidate(rt).filter(i => i.niveau === 'error').length;
  return `<article class="rt-card" data-rt-open="${escAttr(rt.id)}" tabindex="0" role="button"
                   aria-label="Ouvrir le road trip ${escAttr(rt.nom || 'sans nom')}">
    <div class="rt-card-head">
      <h3 class="rt-card-title">🚗 ${escHtml(rt.nom || 'Road trip sans nom')}</h3>
      <span class="trip-badge" style="--c:${meta.color}">${escHtml(meta.label)}</span>
    </div>
    <p class="rt-card-dates">${s.debut ? escHtml(fmtDateFR(s.debut) + ' → ' + fmtDateFR(s.fin)) : 'Dates à définir'}
      · ${s.jours} jour${s.jours > 1 ? 's' : ''}</p>
    <p class="rt-card-route">${escHtml(route)}</p>
    <div class="rt-card-stats">
      <span>📍 ${s.etapes} étape${s.etapes > 1 ? 's' : ''}</span>
      <span>🌙 ${s.nuits} nuit${s.nuits > 1 ? 's' : ''}</span>
      <span>🛣️ ${s.km} km</span>
      <span>⏱️ ${escHtml(fmtDuration(s.heures))}</span>
      ${s.total ? `<span>💶 ~${s.total} €</span>` : ''}
    </div>
    ${issues ? `<p class="rt-card-warn">⚠️ ${issues} point${issues > 1 ? 's' : ''} à compléter</p>` : ''}
    <div class="rt-card-actions">
      <button type="button" class="btn btn-outline btn-sm" data-rt-open="${escAttr(rt.id)}">✏️ Ouvrir</button>
      <button type="button" class="btn btn-outline btn-sm" data-rt-map="${escAttr(rt.id)}">📍 Carte</button>
      <button type="button" class="btn btn-outline btn-sm" data-rt-print="${escAttr(rt.id)}">📄 Dossier</button>
      <button type="button" class="btn btn-outline btn-sm" data-rt-dup="${escAttr(rt.id)}" title="Dupliquer">⧉</button>
      ${rt.status === 'archive'
        ? `<button type="button" class="btn btn-outline btn-sm" data-rt-unarchive="${escAttr(rt.id)}" title="Réactiver">📤 Réactiver</button>`
        : `<button type="button" class="btn btn-outline btn-sm" data-rt-archive="${escAttr(rt.id)}" title="Archiver">🗄️</button>`}
      <button type="button" class="btn btn-danger btn-sm" data-rt-del="${escAttr(rt.id)}" title="Supprimer">🗑</button>
    </div>
  </article>`;
}

const fmtDateFR = iso => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};
const fmtDateLong = iso => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
};

// ══════════════════════════════════════════════════════════
//  VUE ÉDITEUR
// ══════════════════════════════════════════════════════════
function renderEditor() {
  const mount = $('#roadtrips-mount');
  if (!mount || !draft) return;
  mount.className = 'rt-editor';
  mount.innerHTML = `
    <div id="rt-sec-header"></div>
    <div class="rt-editor-grid">
      <div class="rt-editor-main">
        <section class="card" id="rt-sec-reglages"></section>
        <section class="card" id="rt-sec-itineraire"></section>
        <section class="card" id="rt-sec-checklist"></section>
      </div>
      <aside class="rt-editor-side">
        <section class="card" id="rt-sec-resume"></section>
        <section class="card" id="rt-sec-budget"></section>
        <section class="card" id="rt-sec-controle"></section>
      </aside>
    </div>`;
  renderSections(['header', 'reglages', 'itineraire', 'checklist', 'resume', 'budget', 'controle']);
}

function renderSections(list) {
  if (view !== 'editor' || !draft) return;
  const R = {
    header: renderHeader, reglages: renderReglages, itineraire: renderItineraire,
    checklist: renderChecklist, resume: renderResume, budget: renderBudget, controle: renderControle,
  };
  list.forEach(k => { const el = document.getElementById('rt-sec-' + k); if (el && R[k]) R[k](el); });
}

// ── En-tête ──────────────────────────────────────────────
function renderHeader(el) {
  const meta = rtStatusMeta(draft.status);
  const saved = getRoadtrip(draft.id);
  el.innerHTML = `
    <div class="rt-header">
      <button type="button" class="btn btn-ghost btn-sm" data-rt-back>← Tous les road trips</button>
      <div class="rt-header-title">
        <label class="visually-hidden" for="rt-nom">Nom du road trip</label>
        <input id="rt-nom" class="rt-title-input" value="${escAttr(draft.nom)}"
               placeholder="Nom du road trip (ex : Tour d'Irlande)">
        <span class="trip-badge" style="--c:${meta.color}">${escHtml(meta.label)}</span>
        ${dirty() ? '<span class="rt-dirty" title="Modifications non enregistrées">● non enregistré</span>' : ''}
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-success btn-sm" data-rt-save>💾 Enregistrer</button>
        <button type="button" class="btn btn-outline btn-sm" data-rt-showmap>📍 Carte</button>
        <button type="button" class="btn btn-outline btn-sm" data-rt-dossier>📄 Dossier</button>
        ${saved ? `<button type="button" class="btn btn-danger btn-sm" data-rt-del="${escAttr(draft.id)}">🗑 Supprimer</button>` : ''}
      </div>
    </div>`;
}

// ── Réglages généraux ────────────────────────────────────
function renderReglages(el) {
  const sched = rtSchedule(draft);
  const near = draft.origin.coords ? nearestAirports(draft.origin.coords, 4) : [];
  const retour = draft.retourIdentique ? draft.origin : (draft.retour || rtNewPoint());
  el.innerHTML = `
    <h2>⚙️ Le voyage</h2>
    <div class="adv-filter-row gap-sm">
      <div class="adv-field">
        <label for="rt-debut">Date de départ</label>
        <input type="date" id="rt-debut" value="${escAttr(draft.date_debut)}">
      </div>
      <div class="adv-field">
        <label for="rt-fin-calc">Date de retour <span class="rt-auto">calculée</span></label>
        <input type="text" id="rt-fin-calc" value="${escAttr(fmtDateLong(sched.fin))}" readonly
               title="Déduite des nuits de chaque étape — modifie les nuits pour l'ajuster">
      </div>
      <div class="adv-field">
        <label for="rt-travelers">Voyageurs</label>
        <input type="number" id="rt-travelers" min="1" max="12" value="${escAttr(draft.travelers)}">
      </div>
      <div class="adv-field">
        <label for="rt-status">Statut</label>
        <select id="rt-status">
          ${RT_STATUS.map(s =>
            `<option value="${escAttr(s.key)}"${s.key === draft.status ? ' selected' : ''}>${escHtml(s.label)}</option>`).join('')}
        </select>
      </div>
    </div>

    <h3 class="section-title">🏁 Point de départ et retour</h3>
    <div class="adv-filter-row gap-sm">
      <div class="adv-field flex-2">
        <label for="rt-origin">Je pars de</label>
        <div class="input-row">
          <input id="rt-origin" class="add-item-input" value="${escAttr(draft.origin.nom)}" placeholder="Ville de départ">
          <button type="button" class="btn btn-outline btn-sm" data-rt-geo-origin>📍 Localiser</button>
        </div>
        ${draft.origin.coords ? `<span class="hint">✓ ${draft.origin.coords[0].toFixed(3)}, ${draft.origin.coords[1].toFixed(3)}</span>`
          : '<span class="hint txt-yellow">Non géolocalisé — distances et carte incomplètes</span>'}
      </div>
      <div class="adv-field">
        <label for="rt-origin-iata">Aéroport de départ</label>
        <select id="rt-origin-iata">
          <option value="">— aucun (pas d'avion) —</option>
          ${near.map(a => `<option value="${escAttr(a.iata)}"${a.iata === draft.origin.iata ? ' selected' : ''}>${escHtml(a.iata + ' · ' + a.nom + ' (' + a.dist + ' km)')}</option>`).join('')}
        </select>
        ${near.length ? `<span class="hint">${near.length} aéroports à moins de ${near[near.length - 1].dist} km</span>` : ''}
      </div>
    </div>
    <div class="adv-filter-row gap-sm">
      <div class="adv-field">
        <label class="inline-check"><input type="checkbox" id="rt-retour-same" ${draft.retourIdentique ? 'checked' : ''}>
          Je reviens au même endroit</label>
      </div>
      ${draft.retourIdentique ? '' : `
      <div class="adv-field flex-2">
        <label for="rt-retour">Je rentre à</label>
        <div class="input-row">
          <input id="rt-retour" class="add-item-input" value="${escAttr(retour.nom)}" placeholder="Ville de retour">
          <button type="button" class="btn btn-outline btn-sm" data-rt-geo-retour>📍 Localiser</button>
        </div>
      </div>`}
    </div>

    <h3 class="section-title">🚗 Véhicule et transport principal</h3>
    <div class="adv-filter-row gap-sm">
      <div class="adv-field">
        <label for="rt-mode">Mode principal</label>
        <select id="rt-mode">
          ${RT_MODES.map(m => `<option value="${escAttr(m.key)}"${m.key === draft.vehicle.mode ? ' selected' : ''}>${m.emoji} ${escHtml(m.label)}</option>`).join('')}
        </select>
      </div>
      <div class="adv-field">
        <label for="rt-modele">Modèle / compagnie</label>
        <input id="rt-modele" class="add-item-input" value="${escAttr(draft.vehicle.modele)}" placeholder="ex : Clio diesel, Hertz…">
      </div>
      <div class="adv-field">
        <label for="rt-conso">Consommation (L/100)</label>
        <input type="number" id="rt-conso" step="0.1" min="0" value="${escAttr(draft.vehicle.conso)}">
      </div>
      <div class="adv-field">
        <label for="rt-fuel">Carburant (€/L)</label>
        <input type="number" id="rt-fuel" step="0.01" min="0" value="${escAttr(draft.vehicle.prixCarburant)}">
      </div>
      <div class="adv-filter-actions">
        <button type="button" class="btn btn-outline btn-sm" data-rt-apply-mode
                title="Appliquer ce mode à tous les trajets">↻ Appliquer à tous les trajets</button>
      </div>
    </div>

    <div class="adv-field mt-sm">
      <label for="rt-notes">📝 Préférences et notes générales</label>
      <textarea id="rt-notes" class="add-item-input" rows="2"
        placeholder="Rythme souhaité, contraintes, envies, ce qu'il ne faut pas oublier…">${escHtml(draft.notes || '')}</textarea>
    </div>`;
}

// ── Itinéraire : segments et étapes alternés ─────────────
function renderItineraire(el) {
  const sched = rtSchedule(draft);
  const rows = [];

  rows.push(pointCardHTML('origin', sched));
  draft.stops.forEach((stop, i) => {
    const seg = draft.segments.find(s => s.toRef === stop.id);
    if (seg) rows.push(segmentCardHTML(seg, sched));
    rows.push(stopCardHTML(stop, i, sched));
  });
  if (draft.stops.length) {
    const back = draft.segments.find(s => s.toRef === 'retour');
    if (back) rows.push(segmentCardHTML(back, sched));
    rows.push(pointCardHTML('retour', sched));
  }

  el.innerHTML = `
    <div class="card-head">
      <h2>🗺️ Itinéraire</h2>
      <span class="hint">${draft.stops.length} étape${draft.stops.length > 1 ? 's' : ''} · glisse pour réordonner</span>
    </div>
    <div class="rt-timeline" id="rt-timeline">${rows.join('')}</div>
    ${addStopPanelHTML()}`;
}

function pointCardHTML(kind, sched) {
  const p = rtResolvePoint(draft, kind);
  const date = kind === 'origin' ? sched.debut : sched.fin;
  return `<div class="rt-point rt-point-${kind}">
    <span class="rt-point-ico" aria-hidden="true">${kind === 'origin' ? '🏁' : '🏠'}</span>
    <div>
      <div class="rt-point-nom">${escHtml(p ? p.nom : '—')}</div>
      <div class="hint">${kind === 'origin' ? 'Départ' : 'Retour'} · ${escHtml(fmtDateLong(date))}</div>
    </div>
  </div>`;
}

function segmentCardHTML(seg, sched) {
  const a = rtResolvePoint(draft, seg.fromRef);
  const b = rtResolvePoint(draft, seg.toRef);
  const v = rtSegmentValues(draft, seg);
  const m = rtModeMeta(seg.mode);
  const when = sched.segments[seg.id];
  const bk = rtBookingMeta(seg.reservation.status);
  return `<div class="rt-segment" data-seg="${escAttr(seg.id)}">
    <div class="rt-seg-line" aria-hidden="true"></div>
    <div class="rt-seg-body">
      <div class="rt-seg-head">
        <span class="rt-seg-mode">${m.emoji}</span>
        <span class="rt-seg-route">${escHtml((a ? a.nom : '?') + ' → ' + (b ? b.nom : '?'))}</span>
        <span class="rt-seg-when">${when ? escHtml(fmtDateFR(when.date)) : ''}</span>
        <button type="button" class="rt-seg-toggle" data-seg-toggle="${escAttr(seg.id)}"
                aria-expanded="false" aria-label="Détails du trajet">⋯</button>
      </div>
      <div class="rt-seg-facts">
        <span>${escHtml(m.label)}</span>
        ${v.distanceKm != null ? `<span>${v.distanceKm} km${v.manuel.distanceKm ? '' : ' <em>est.</em>'}</span>` : '<span class="txt-yellow">distance inconnue</span>'}
        ${v.dureeH != null ? `<span>${escHtml(fmtDuration(v.dureeH))}${v.manuel.dureeH ? '' : ' <em>est.</em>'}</span>` : ''}
        ${seg.departTime ? `<span>${escHtml(seg.departTime)}${seg.arriveeTime ? ' → ' + escHtml(seg.arriveeTime) : ''}</span>` : ''}
        ${v.cout != null ? `<span>${v.cout} €${v.manuel.cout ? '' : ' <em>est.</em>'}</span>` : ''}
        <span class="rt-bk" style="--c:${bk.color}">${escHtml(bk.label)}</span>
      </div>
      <div class="rt-seg-detail" id="segd-${escAttr(seg.id)}" hidden>
        <div class="adv-filter-row gap-sm">
          <div class="adv-field">
            <label for="sm-${escAttr(seg.id)}">Moyen de transport</label>
            <select id="sm-${escAttr(seg.id)}" data-seg-field="mode" data-seg="${escAttr(seg.id)}">
              ${RT_MODES.map(m2 => `<option value="${escAttr(m2.key)}"${m2.key === seg.mode ? ' selected' : ''}>${m2.emoji} ${escHtml(m2.label)}</option>`).join('')}
            </select>
          </div>
          <div class="adv-field">
            <label for="sdep-${escAttr(seg.id)}">Heure de départ</label>
            <input type="time" id="sdep-${escAttr(seg.id)}" value="${escAttr(seg.departTime)}" data-seg-field="departTime" data-seg="${escAttr(seg.id)}">
          </div>
          <div class="adv-field">
            <label for="sarr-${escAttr(seg.id)}">Heure d'arrivée</label>
            <input type="time" id="sarr-${escAttr(seg.id)}" value="${escAttr(seg.arriveeTime)}" data-seg-field="arriveeTime" data-seg="${escAttr(seg.id)}">
          </div>
        </div>
        <div class="adv-filter-row gap-sm">
          <div class="adv-field">
            <label for="sdist-${escAttr(seg.id)}">Distance (km) <span class="rt-auto">auto si vide</span></label>
            <input type="number" id="sdist-${escAttr(seg.id)}" min="0" value="${seg.distanceKm ?? ''}"
                   placeholder="${v.estimation.distanceKm ?? ''}" data-seg-field="distanceKm" data-seg="${escAttr(seg.id)}">
          </div>
          <div class="adv-field">
            <label for="sdur-${escAttr(seg.id)}">Durée (h) <span class="rt-auto">auto si vide</span></label>
            <input type="number" id="sdur-${escAttr(seg.id)}" min="0" step="0.25" value="${seg.dureeH ?? ''}"
                   placeholder="${v.estimation.dureeH ?? ''}" data-seg-field="dureeH" data-seg="${escAttr(seg.id)}">
          </div>
          <div class="adv-field">
            <label for="scout-${escAttr(seg.id)}">Coût (€) <span class="rt-auto">auto si vide</span></label>
            <input type="number" id="scout-${escAttr(seg.id)}" min="0" value="${seg.cout ?? ''}"
                   placeholder="${v.estimation.cout ?? ''}" data-seg-field="cout" data-seg="${escAttr(seg.id)}">
          </div>
          <div class="adv-field">
            <label for="sres-${escAttr(seg.id)}">Réservation</label>
            <select id="sres-${escAttr(seg.id)}" data-seg-field="resStatus" data-seg="${escAttr(seg.id)}">
              ${RT_BOOKING_STATUS.map(s => `<option value="${escAttr(s.key)}"${s.key === seg.reservation.status ? ' selected' : ''}>${escHtml(s.label)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="adv-filter-row gap-sm">
          <div class="adv-field flex-2">
            <label for="sref-${escAttr(seg.id)}">Référence / n° de billet</label>
            <input id="sref-${escAttr(seg.id)}" class="add-item-input" value="${escAttr(seg.reservation.reference)}" data-seg-field="resRef" data-seg="${escAttr(seg.id)}">
          </div>
          <div class="adv-field flex-2">
            <label for="slien-${escAttr(seg.id)}">Lien de réservation</label>
            <input id="slien-${escAttr(seg.id)}" class="add-item-input" type="url" value="${escAttr(seg.reservation.lien)}" data-seg-field="resLien" data-seg="${escAttr(seg.id)}">
          </div>
        </div>
        <div class="adv-field">
          <label for="snotes-${escAttr(seg.id)}">Remarques</label>
          <textarea id="snotes-${escAttr(seg.id)}" class="add-item-input" rows="2" data-seg-field="notes" data-seg="${escAttr(seg.id)}">${escHtml(seg.notes)}</textarea>
        </div>
        <div class="btn-row">${segBookingLinksHTML(seg)}</div>
      </div>
    </div>
  </div>`;
}

function segBookingLinksHTML(seg) {
  const b = rtResolvePoint(draft, seg.toRef);
  const a = rtResolvePoint(draft, seg.fromRef);
  const sched = rtSchedule(draft);
  const when = sched.segments[seg.id];
  const dest = (draft.stops.find(s => s.id === seg.toRef) || {}).destId;
  const ctx = { dest: destById(dest) || { nom: b ? b.nom : '', pays: '' }, checkin: when ? when.date : '', travelers: draft.travelers, fromIata: a ? a.iata : '' };
  let links;
  if (seg.mode === 'avion') links = flightLinks(Object.assign({ iata: b ? b.iata : '' }, ctx));
  else links = groundLinks(ctx).slice(0, 5);
  return links.map(l => `<a class="mini-btn" target="_blank" rel="noopener noreferrer" href="${safeUrl(l.url)}">${escHtml(l.emoji || '🔎')} ${escHtml(l.label)}</a>`).join('');
}

function stopCardHTML(stop, i, sched) {
  const sc = sched.stopById[stop.id] || {};
  const open = openStops.has(stop.id);
  const d = stop.destId && destById(stop.destId);
  const lg = stop.lodging;
  const bk = rtBookingMeta(lg.status);
  const season = d && window.evaluatePeriod ? evaluatePeriod(d, sc.arrivee, sc.depart) : null;
  return `<div class="rt-stop-card${open ? ' is-open' : ''}" data-stop="${escAttr(stop.id)}" draggable="true">
    <div class="rt-stop-head">
      <span class="rt-stop-num">${i + 1}</span>
      <span class="rt-grip" aria-hidden="true" title="Glisser pour réordonner">⠿</span>
      <div class="rt-stop-main">
        <div class="rt-stop-title">${escHtml(stop.nom)}
          ${d ? '<span class="rt-badge">fiche</span>' : '<span class="rt-badge rt-badge-geo">lieu</span>'}
          ${stop.pays ? `<span class="rt-stop-pays">${escHtml(stop.pays)}</span>` : ''}
        </div>
        <div class="rt-stop-sub">
          ${sc.arrivee ? `📅 ${escHtml(fmtDateFR(sc.arrivee))} → ${escHtml(fmtDateFR(sc.depart))}` : ''}
          ${lg.nom ? `· 🏨 ${escHtml(lg.nom)}` : '· <span class="txt-yellow">hébergement à choisir</span>'}
          ${season && season.worst === 0 ? '· <span class="txt-red">⚠️ hors saison</span>' : ''}
        </div>
      </div>
      <div class="rt-nights-stepper">
        <span aria-hidden="true">🌙</span>
        <button type="button" class="rt-step-btn" data-nights-dec="${escAttr(stop.id)}" aria-label="Une nuit de moins" ${(+stop.nights || 0) <= 0 ? 'disabled' : ''}>−</button>
        <label class="visually-hidden" for="n-${escAttr(stop.id)}">Nuits à ${escAttr(stop.nom)}</label>
        <input type="number" id="n-${escAttr(stop.id)}" class="rt-nights" min="0" max="60" value="${+stop.nights || 0}" data-nights="${escAttr(stop.id)}">
        <button type="button" class="rt-step-btn" data-nights-inc="${escAttr(stop.id)}" aria-label="Une nuit de plus">+</button>
        <span class="rt-nights-unit">nuit${(+stop.nights || 0) > 1 ? 's' : ''}</span>
      </div>
      <div class="rt-stop-actions">
        <button type="button" data-stop-up="${escAttr(stop.id)}" aria-label="Monter l'étape" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button type="button" data-stop-down="${escAttr(stop.id)}" aria-label="Descendre l'étape" ${i === draft.stops.length - 1 ? 'disabled' : ''}>▼</button>
        <button type="button" data-stop-dup="${escAttr(stop.id)}" aria-label="Dupliquer l'étape" title="Dupliquer">⧉</button>
        ${d ? `<button type="button" data-stop-fiche="${escAttr(stop.destId)}" aria-label="Voir la fiche destination" title="Fiche destination">ℹ️</button>` : ''}
        <button type="button" data-stop-map="${escAttr(stop.id)}" aria-label="Voir sur la carte" title="Sur la carte">📍</button>
        <button type="button" class="rt-del-stop" data-stop-del="${escAttr(stop.id)}" aria-label="Retirer l'étape">✕</button>
      </div>
      <button type="button" class="rt-stop-expand" data-stop-toggle="${escAttr(stop.id)}"
              aria-expanded="${open ? 'true' : 'false'}" aria-controls="stopd-${escAttr(stop.id)}">${open ? '▲' : '▼'}</button>
    </div>

    <div class="rt-stop-detail" id="stopd-${escAttr(stop.id)}"${open ? '' : ' hidden'}>
      ${season ? `<p class="rt-season ${season.worst === 0 ? 'bad' : season.worst >= 3 ? 'good' : ''}">
        ${escHtml(seasonMeta(season.worst).label)} — ${escHtml(season.advice)}</p>` : ''}

      <h4 class="section-title">🏨 Hébergement · ${escHtml(sc.arrivee ? fmtDateFR(sc.arrivee) + ' → ' + fmtDateFR(sc.depart) : '')}
        <span class="rt-bk" style="--c:${bk.color}">${escHtml(bk.label)}</span></h4>
      ${(+stop.nights || 0) === 0
        ? '<p class="hint">Étape de passage (0 nuit) — pas d\'hébergement nécessaire.</p>'
        : `
      <div class="btn-row rt-lodging-tools">${lodgingLinksHTML(stop, sc)}</div>
      <p class="hint">Compare, puis enregistre ci-dessous le logement que tu retiens. Rien n'est pré-rempli.</p>
      <div class="lodging-form">
        ${lgField(stop, 'nom', 'Nom du logement')}
        ${lgField(stop, 'lien', 'Lien de réservation', 'url')}
        ${lgField(stop, 'adresse', 'Adresse')}
        ${lgField(stop, 'prix', 'Prix par nuit (€)')}
        ${lgField(stop, 'checkinTime', 'Heure de check-in', 'time')}
        ${lgField(stop, 'checkoutTime', 'Heure de check-out', 'time')}
        ${lgField(stop, 'tel', 'Téléphone', 'tel')}
        ${lgField(stop, 'email', 'Email', 'email')}
        ${lgField(stop, 'reference', 'Référence de réservation')}
        <div class="adv-field">
          <label for="lgs-${escAttr(stop.id)}">Statut</label>
          <select id="lgs-${escAttr(stop.id)}" data-lg="status" data-stop="${escAttr(stop.id)}">
            ${RT_BOOKING_STATUS.map(s => `<option value="${escAttr(s.key)}"${s.key === lg.status ? ' selected' : ''}>${escHtml(s.label)}</option>`).join('')}
          </select>
        </div>
        <div class="adv-field lg-full">
          <label for="lgn-${escAttr(stop.id)}">Notes (code d'accès, contact…)</label>
          <textarea id="lgn-${escAttr(stop.id)}" class="add-item-input" rows="2" data-lg="notes" data-stop="${escAttr(stop.id)}">${escHtml(lg.notes)}</textarea>
        </div>
      </div>`}

      <h4 class="section-title">🎯 Activités sur place</h4>
      <div class="rt-act-list">
        ${(stop.activites || []).map((a, ai) => `
          <div class="rt-act">
            <input class="add-item-input" value="${escAttr(a.nom)}" data-act-nom="${ai}" data-stop="${escAttr(stop.id)}" aria-label="Nom de l'activité">
            <input class="add-item-input rt-act-prix" value="${escAttr(a.prix || '')}" placeholder="€" data-act-prix="${ai}" data-stop="${escAttr(stop.id)}" aria-label="Prix">
            <label class="inline-check"><input type="checkbox" ${a.reserve ? 'checked' : ''} data-act-res="${ai}" data-stop="${escAttr(stop.id)}"> réservée</label>
            <button type="button" class="act-del" data-act-del="${ai}" data-stop="${escAttr(stop.id)}" aria-label="Supprimer l'activité">✕</button>
          </div>`).join('') || '<p class="hint">Aucune activité prévue.</p>'}
      </div>
      <div class="btn-row mt-xs">
        <button type="button" class="btn btn-outline btn-sm" data-act-add="${escAttr(stop.id)}">➕ Ajouter une activité</button>
        ${d && (d.pois || []).length ? `<button type="button" class="btn btn-outline btn-sm" data-act-suggest="${escAttr(stop.id)}">✨ Reprendre les lieux de la fiche</button>` : ''}
      </div>

      <div class="adv-field mt-sm">
        <label for="note-${escAttr(stop.id)}">Notes de l'étape</label>
        <textarea id="note-${escAttr(stop.id)}" class="add-item-input" rows="2" data-stop-note="${escAttr(stop.id)}"
                  placeholder="Ce qu'il ne faut pas oublier ici…">${escHtml(stop.note)}</textarea>
      </div>
    </div>
  </div>`;
}

function lgField(stop, key, label, type) {
  const id = `lg-${key}-${stop.id}`;
  return `<div class="adv-field">
    <label for="${escAttr(id)}">${escHtml(label)}</label>
    <input id="${escAttr(id)}" class="add-item-input lg-field" type="${type || 'text'}"
           value="${escAttr(stop.lodging[key] || '')}" data-lg="${escAttr(key)}" data-stop="${escAttr(stop.id)}">
  </div>`;
}

function lodgingLinksHTML(stop, sc) {
  const dest = (stop.destId && destById(stop.destId)) || { nom: stop.nom, pays: stop.pays };
  const links = lodgingLinks({
    dest, checkin: sc.arrivee, checkout: sc.depart,
    travelers: draft.travelers, ville: shortName(stop), villeComplete: stop.nom,
  });
  return links.map(l => `<a class="mini-btn" target="_blank" rel="noopener noreferrer" href="${safeUrl(l.url)}">${escHtml(l.emoji)} ${escHtml(l.label)}</a>`).join('');
}

// ── Panneau d'ajout d'étape ──────────────────────────────
function addStopPanelHTML() {
  const counts = {};
  activeDests().forEach(d => { if (d.pays) counts[d.pays] = (counts[d.pays] || 0) + 1; });
  const pays = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'fr'));
  return `
    <div class="rt-add-panel">
      <h3 class="section-title">➕ Ajouter une étape</h3>
      <div class="rt-country-row">
        <label class="visually-hidden" for="rt-country-select">Choisir un pays</label>
        <select class="sort-select" id="rt-country-select">
          <option value="">— Parcourir par pays —</option>
          ${pays.map(p => `<option value="${escAttr(p)}"${p === countryPick ? ' selected' : ''}>${escHtml(p)} (${counts[p]})</option>`).join('')}
        </select>
        ${countryPick ? `<button type="button" class="btn btn-sm btn-success" data-rt-add-all>➕ Tout ajouter</button>` : ''}
      </div>
      <div id="rt-country-dests">${countryDestsHTML()}</div>
      <label class="visually-hidden" for="rt-add-search">Rechercher une ville ou un lieu</label>
      <input class="add-item-input mt-sm" id="rt-add-search" type="search" autocomplete="off"
             placeholder="🔎 Chercher une ville, un lieu, une destination du catalogue…">
      <div id="rt-add-results" class="rt-add-results"></div>
    </div>`;
}

function countryDestsHTML() {
  if (!countryPick) return '';
  const dests = activeDests().filter(d => d.pays === countryPick).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  if (!dests.length) return '';
  return `<div class="rt-country-grid">${dests.map(d => {
    const added = draft.stops.some(s => s.destId === d.id);
    return `<button type="button" class="rt-country-chip${added ? ' added' : ''}" data-country-toggle="${escAttr(d.id)}"
              aria-pressed="${added ? 'true' : 'false'}">
      <span class="rt-chip-name">${escHtml(d.emoji)} ${escHtml(d.nom)}</span>
      <span class="rt-chip-ico" aria-hidden="true">${added ? '✓' : '+'}</span>
    </button>`;
  }).join('')}</div>`;
}

// ── Résumé ───────────────────────────────────────────────
function renderResume(el) {
  const s = rtStats(draft);
  const modes = Object.entries(s.parMode).filter(([, km]) => km > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, km]) => `<li>${rtModeMeta(k).emoji} ${escHtml(rtModeMeta(k).label)} — ${Math.round(km)} km</li>`).join('');
  el.innerHTML = `
    <h2>📊 Synthèse</h2>
    <div class="rt-summary">
      <div><strong>${s.jours}</strong><span>jours</span></div>
      <div><strong>${s.etapes}</strong><span>étapes</span></div>
      <div><strong>${s.nuits}</strong><span>nuits</span></div>
      <div><strong>${s.km}</strong><span>km</span></div>
      <div><strong>${escHtml(fmtDuration(s.heures))}</strong><span>de trajet</span></div>
      <div><strong>${draft.travelers}</strong><span>voyageurs</span></div>
    </div>
    <p class="hint mt-sm">${s.debut ? escHtml(fmtDateLong(s.debut) + ' → ' + fmtDateLong(s.fin)) : 'Dates à définir'}</p>
    ${s.pays.length ? `<p class="hint">🌍 ${escHtml(s.pays.join(' · '))}</p>` : ''}
    ${modes ? `<h3 class="section-title">Répartition</h3><ul class="dot-list">${modes}</ul>` : ''}`;
}

// ── Budget ───────────────────────────────────────────────
function renderBudget(el) {
  const s = rtStats(draft);
  const row = (key, label, auto) => {
    const manual = draft.budget[key];
    return `<div class="rt-budget-row">
      <label for="bg-${key}">${escHtml(label)}</label>
      <input type="number" id="bg-${key}" min="0" value="${manual ?? ''}" placeholder="${auto}"
             data-budget="${key}" aria-label="${escAttr(label)} en euros">
      <span class="hint">${manual != null ? 'saisi' : 'estimé ' + auto + ' €'}</span>
    </div>`;
  };
  el.innerHTML = `
    <h2>💶 Budget</h2>
    ${row('transport', '🚗 Transport', s.coutTransport)}
    ${row('hebergement', '🏨 Hébergement', s.coutHebergement)}
    ${row('activites', '🎯 Activités', s.coutActivites)}
    ${row('autres', '📦 Divers', 0)}
    <div class="rt-budget-total">
      <span>Total</span><strong>${s.total} €</strong>
    </div>
    ${draft.travelers > 1 ? `<p class="hint">soit ~${s.parPersonne} € par personne</p>` : ''}
    ${budgetCurrencyHTML()}`;
}

function budgetCurrencyHTML() {
  const devises = [...new Set(draft.stops.map(s => currencyOf(s.pays)).filter(c => c && c !== 'EUR'))];
  if (!devises.length) return '<p class="hint mt-sm">✅ Tout le parcours est en zone euro.</p>';
  return `<p class="hint mt-sm">💱 Devises rencontrées : ${escHtml(devises.map(currencyLabel).join(' · '))}
    <button type="button" class="link-btn" data-rt-convert>ouvrir le convertisseur</button></p>`;
}

// ── Checklist ────────────────────────────────────────────
function renderChecklist(el) {
  el.innerHTML = `
    <div class="card-head">
      <h2>✅ Préparation</h2>
      <button type="button" class="btn btn-outline btn-sm" data-ck-suggest>✨ Proposer une liste</button>
    </div>
    <div class="rt-checklist">
      ${(draft.checklist || []).map((c, i) => `
        <label class="todo-li">
          <input type="checkbox" ${c.fait ? 'checked' : ''} data-ck="${i}">
          <span class="${c.fait ? 'is-done' : ''}">${escHtml(c.texte)}</span>
          <button type="button" class="act-del" data-ck-del="${i}" aria-label="Supprimer">✕</button>
        </label>`).join('') || '<p class="hint">Aucun élément. Clique sur « Proposer une liste » pour partir d\'une base adaptée à ton itinéraire.</p>'}
    </div>
    <div class="input-row mt-sm">
      <label class="visually-hidden" for="ck-new">Nouvel élément</label>
      <input class="add-item-input" id="ck-new" placeholder="+ Ajouter un élément…">
      <button type="button" class="btn btn-outline btn-sm" data-ck-add>+</button>
    </div>`;
}

// ── Contrôle de cohérence ────────────────────────────────
function renderControle(el) {
  const issues = rtValidate(draft);
  const ico = { error: '⛔', warn: '⚠️', info: 'ℹ️' };
  el.innerHTML = `
    <h2>🔎 Points à vérifier</h2>
    ${issues.length ? `<ul class="rt-issues">${issues.map(i =>
      `<li class="rt-issue rt-issue-${i.niveau}">${ico[i.niveau]} ${escHtml(i.texte)}</li>`).join('')}</ul>`
      : '<p class="hint">✅ Rien à signaler, l\'itinéraire est cohérent.</p>'}`;
}

// ══════════════════════════════════════════════════════════
//  ACTIONS
// ══════════════════════════════════════════════════════════
function openEditor(id) {
  if (id) {
    const existing = getRoadtrip(id);
    if (!existing) return;
    draft = rtNormalize(existing);
    baseline = fingerprint(draft);
  } else {
    draft = rtNew();
    draft.segments = rtSyncSegments(draft, []);
    baseline = '';
  }
  openStops = new Set();
  saveDraft();
  view = 'editor';
  renderEditor();
}

async function backToList(force) {
  if (!force && dirty()) {
    const ok = await vmConfirm({
      title: 'Modifications non enregistrées',
      message: 'Ton brouillon est conservé et te sera proposé à ton retour. Enregistrer maintenant ?',
      confirmLabel: 'Enregistrer', cancelLabel: 'Plus tard',
    });
    if (ok) { saveRoadtripDraft(); return; }
  }
  view = 'list';
  renderList();
}

function saveRoadtripDraft(silent) {
  if (!draft) return null;
  if (!draft.nom.trim()) draft.nom = draft.stops.length ? 'Road trip ' + (draft.stops[0].pays || shortName(draft.stops[0])) : 'Road trip sans nom';
  if (!draft.stops.length) { showToast('Ajoute au moins une étape avant d\'enregistrer', { tone: 'error' }); return null; }
  if (draft.status === 'idee') draft.status = 'planification';
  const saved = saveRoadtrip(JSON.parse(JSON.stringify(draft)));
  saveDraft();
  baseline = fingerprint(draft);
  logHistory('road trip enregistré', draft.nom);
  if (!silent) showToast('🚗 Road trip enregistré');
  renderSections(['header']);
  return saved;
}

async function deleteRoadtrip(id) {
  const rt = getRoadtrip(id);
  if (!rt) return;
  const ok = await vmConfirm({
    title: `Supprimer « ${rt.nom || 'ce road trip'} » ?`,
    message: 'Étapes, transports, hébergements et budget seront supprimés.',
    confirmLabel: 'Supprimer', danger: true,
  });
  if (!ok) return;
  const snap = removeRoadtrip(id);
  if (draft && draft.id === id) { clearDraft(); view = 'list'; }
  renderCurrent();
  pushUndo(`Road trip « ${rt.nom} » supprimé`, () => { restoreRoadtrip(snap); renderCurrent(); });
  logHistory('road trip supprimé', rt.nom);
}

/** Archive ou réactive un road trip. Réversible et annulable. */
function setRoadtripStatus(id, status) {
  const rt = getRoadtrip(id);
  if (!rt) return;
  const avant = rt.status;
  const copie = rtNormalize(JSON.parse(JSON.stringify(rt)));
  copie.status = status;
  saveRoadtrip(copie);
  if (draft && draft.id === id) { draft.status = status; saveDraft(); renderSections(['header', 'reglages']); }
  renderCurrent();
  const archive = status === 'archive';
  pushUndo(archive ? `« ${rt.nom} » archivé` : `« ${rt.nom} » réactivé`, () => {
    const back = rtNormalize(JSON.parse(JSON.stringify(getRoadtrip(id) || copie)));
    back.status = avant;
    saveRoadtrip(back);
    renderCurrent();
  });
  logHistory(archive ? 'road trip archivé' : 'road trip réactivé', rt.nom);
}

function duplicateRoadtrip(id) {
  const rt = getRoadtrip(id);
  if (!rt) return;
  const copy = rtNormalize(JSON.parse(JSON.stringify(rt)));
  copy.id = rtId();
  copy.nom = (rt.nom || 'Road trip') + ' (copie)';
  copy.status = 'planification';
  copy.createdAt = Date.now();
  copy.stops.forEach(s => { s.id = rtId('st'); });
  copy.segments = rtSyncSegments(copy, []);
  saveRoadtrip(copy);
  renderCurrent();
  showToast('⧉ Road trip dupliqué');
}

function addStopFromDest(destId) {
  const d = destById(destId);
  if (!d || !draft) return;
  mutate(rt => {
    rt.stops.push(rtNewStop({
      nom: d.nom, destId: d.id, pays: d.pays,
      coords: Array.isArray(d.coords) ? [d.coords[0], d.coords[1]] : null,
      nights: 2,
    }));
    if (!rt.nom && d.pays) rt.nom = 'Road trip ' + d.pays;
  }, ['itineraire', 'resume', 'budget', 'controle', 'header', 'reglages']);
  showToast(`📍 ${shortName(d)} ajoutée`);
}

function renderCurrent() { view === 'editor' && draft ? renderEditor() : renderList(); }

// ── Carte ────────────────────────────────────────────────
function showOnMap(rt, focusStopId) {
  const target = rt || draft;
  if (!target) return;
  if (!target.stops.some(s => s.coords) && !target.origin.coords) {
    showToast('Aucun point géolocalisé à afficher', { tone: 'error' });
    return;
  }
  showPage('carte');
  setTimeout(() => drawRoadtrip(rtNormalize(target), focusStopId), 260);
}

// ══════════════════════════════════════════════════════════
//  CÂBLAGE (délégation sur la page — survit aux re-rendus)
// ══════════════════════════════════════════════════════════
function init() {
  const page = document.getElementById('page-roadtrips');
  if (!page) return;

  // ── Liste ──
  delegate(page, 'click', '[data-rt-new]', () => openEditor(null));
  delegate(page, 'click', '[data-rt-open]', (e, el) => {
    // Un clic dans la barre d'actions ne doit jamais ouvrir AUSSI l'editeur.
    // Le garde enumerait les boutons un par un : chaque nouvelle action
    // oubliee declenchait les deux comportements a la fois.
    if (e.target.closest('.rt-card-actions') && !e.target.matches('[data-rt-open]')) return;
    openEditor(el.dataset.rtOpen);
  });
  delegate(page, 'keydown', '.rt-card', (e, el) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditor(el.dataset.rtOpen); }
  });
  delegate(page, 'click', '[data-rt-del]', (e, el) => { e.stopPropagation(); deleteRoadtrip(el.dataset.rtDel); });
  delegate(page, 'click', '[data-rt-dup]', (e, el) => { e.stopPropagation(); duplicateRoadtrip(el.dataset.rtDup); });
  delegate(page, 'click', '[data-rt-archive]', (e, el) => { e.stopPropagation(); setRoadtripStatus(el.dataset.rtArchive, 'archive'); });
  delegate(page, 'click', '[data-rt-unarchive]', (e, el) => { e.stopPropagation(); setRoadtripStatus(el.dataset.rtUnarchive, 'planification'); });
  delegate(page, 'click', '[data-rt-map]', (e, el) => { e.stopPropagation(); showOnMap(getRoadtrip(el.dataset.rtMap)); });
  delegate(page, 'click', '[data-rt-print]', (e, el) => { e.stopPropagation(); openRoadtripDossier(rtNormalize(getRoadtrip(el.dataset.rtPrint))); });
  delegate(page, 'click', '[data-rt-resume]', () => { if (loadDraft()) { view = 'editor'; renderEditor(); } });
  delegate(page, 'click', '[data-rt-discard]', async () => {
    const ok = await vmConfirm({ title: 'Supprimer le brouillon ?', confirmLabel: 'Supprimer', danger: true });
    if (ok) { clearDraft(); renderList(); }
  });

  // ── Éditeur : en-tête ──
  delegate(page, 'click', '[data-rt-back]', () => backToList(false));
  delegate(page, 'click', '[data-rt-save]', () => saveRoadtripDraft());
  delegate(page, 'click', '[data-rt-showmap]', () => { saveRoadtripDraft(true); showOnMap(draft); });
  delegate(page, 'click', '[data-rt-dossier]', () => openRoadtripDossier(draft));
  delegate(page, 'input', '#rt-nom', debounce((e, el) => { draft.nom = el.value; saveDraft(); renderSections(['header']); }, 400));

  // ── Éditeur : réglages ──
  delegate(page, 'change', '#rt-debut', (e, el) => mutate(rt => { rt.date_debut = el.value; }, ['itineraire', 'resume', 'controle', 'reglages']));
  delegate(page, 'change', '#rt-travelers', (e, el) => mutate(rt => { rt.travelers = Math.max(1, +el.value || 1); }));
  delegate(page, 'change', '#rt-status', (e, el) => mutate(rt => { rt.status = el.value; }, ['header']));
  delegate(page, 'change', '#rt-origin-iata', (e, el) => mutate(rt => { rt.origin.iata = el.value; }, ['reglages', 'itineraire']));
  delegate(page, 'input', '#rt-origin', debounce((e, el) => { draft.origin.nom = el.value; saveDraft(); }, 400));
  delegate(page, 'input', '#rt-retour', debounce((e, el) => {
    draft.retour = draft.retour || rtNewPoint();
    draft.retour.nom = el.value; saveDraft();
  }, 400));
  delegate(page, 'change', '#rt-retour-same', (e, el) => mutate(rt => {
    rt.retourIdentique = el.checked;
    if (!el.checked && !rt.retour) rt.retour = rtNewPoint({ nom: rt.origin.nom, coords: rt.origin.coords, iata: rt.origin.iata });
  }, ['reglages', 'itineraire', 'resume']));
  delegate(page, 'click', '[data-rt-geo-origin]', () => geolocatePoint('origin'));
  delegate(page, 'click', '[data-rt-geo-retour]', () => geolocatePoint('retour'));
  delegate(page, 'change', '#rt-mode', (e, el) => mutate(rt => { rt.vehicle.mode = el.value; }, ['reglages']));
  delegate(page, 'input', '#rt-modele', debounce((e, el) => { draft.vehicle.modele = el.value; saveDraft(); }, 400));
  delegate(page, 'input', '#rt-notes', debounce((e, el) => { draft.notes = el.value; saveDraft(); }, 500));
  delegate(page, 'change', '#rt-conso', (e, el) => mutate(rt => { rt.vehicle.conso = +el.value || 0; }));
  delegate(page, 'change', '#rt-fuel', (e, el) => mutate(rt => { rt.vehicle.prixCarburant = +el.value || 0; }));
  delegate(page, 'click', '[data-rt-apply-mode]', () => mutate(rt => {
    rt.segments.forEach(s => { s.mode = rt.vehicle.mode; });
  }, ['itineraire', 'resume', 'budget', 'controle']));

  // ── Éditeur : étapes ──
  // Déplier/replier est une action purement visuelle : on manipule le DOM
  // en place. Un re-rendu détacherait les autres cartes et ferait perdre
  // les saisies en cours, le focus et la position de défilement.
  delegate(page, 'click', '[data-stop-toggle]', (e, el) => {
    const id = el.dataset.stopToggle;
    const panel = document.getElementById('stopd-' + id);
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    el.setAttribute('aria-expanded', open ? 'true' : 'false');
    el.textContent = open ? '▲' : '▼';
    el.closest('.rt-stop-card').classList.toggle('is-open', open);
    if (open) openStops.add(id); else openStops.delete(id);
    saveDraft();
  });
  delegate(page, 'click', '[data-stop-up]', (e, el) => moveStop(el.dataset.stopUp, -1));
  delegate(page, 'click', '[data-stop-down]', (e, el) => moveStop(el.dataset.stopDown, 1));
  delegate(page, 'click', '[data-stop-del]', (e, el) => removeStop(el.dataset.stopDel));
  delegate(page, 'click', '[data-stop-dup]', (e, el) => mutate(rt => {
    const i = rt.stops.findIndex(s => s.id === el.dataset.stopDup);
    if (i < 0) return;
    const copy = JSON.parse(JSON.stringify(rt.stops[i]));
    copy.id = rtId('st');
    copy.lodging = rtNewLodging();      // un nouvel hébergement, pas la même réservation
    rt.stops.splice(i + 1, 0, copy);
  }));
  // Consulter une fiche depuis l'éditeur : modale par-dessus la page, brouillon intact
  delegate(page, 'click', '[data-stop-fiche]', (e, el) => openDest(el.dataset.stopFiche));
  delegate(page, 'click', '[data-stop-map]', (e, el) => { saveDraft(); showOnMap(draft, el.dataset.stopMap); });
  delegate(page, 'click', '[data-nights-inc]', (e, el) => setNights(el.dataset.nightsInc, +1));
  delegate(page, 'click', '[data-nights-dec]', (e, el) => setNights(el.dataset.nightsDec, -1));
  delegate(page, 'change', '[data-nights]', (e, el) => mutate(rt => {
    const s = rt.stops.find(x => x.id === el.dataset.nights);
    if (s) s.nights = Math.max(0, Math.min(60, +el.value || 0));
  }));
  delegate(page, 'input', '[data-stop-note]', debouncePerTarget((e, el) => {
    const s = draft.stops.find(x => x.id === el.dataset.stopNote);
    if (s) { s.note = el.value; saveDraft(); }
  }, 500));

  // Hébergement (saisie sans re-rendu : on ne veut pas perdre le focus)
  delegate(page, 'input', '[data-lg]', debouncePerTarget((e, el) => {
    const s = draft.stops.find(x => x.id === el.dataset.stop);
    if (!s) return;
    s.lodging[el.dataset.lg] = el.value;
    saveDraft();
    renderSections(['budget', 'controle']);
  }, 450));
  delegate(page, 'change', 'select[data-lg]', (e, el) => {
    const s = draft.stops.find(x => x.id === el.dataset.stop);
    if (!s) return;
    s.lodging[el.dataset.lg] = el.value;
    saveDraft();
    renderSections(['itineraire', 'controle']);
  });

  // Activités
  delegate(page, 'click', '[data-act-add]', (e, el) => mutate(rt => {
    const s = rt.stops.find(x => x.id === el.dataset.actAdd);
    if (s) s.activites.push({ nom: '', prix: '', reserve: false });
  }, ['itineraire']));
  delegate(page, 'click', '[data-act-del]', (e, el) => mutate(rt => {
    const s = rt.stops.find(x => x.id === el.dataset.stop);
    if (s) s.activites.splice(+el.dataset.actDel, 1);
  }, ['itineraire', 'budget']));
  delegate(page, 'click', '[data-act-suggest]', (e, el) => mutate(rt => {
    const s = rt.stops.find(x => x.id === el.dataset.actSuggest);
    const d = s && destById(s.destId);
    if (!d) return;
    (d.pois || []).slice(0, 5).forEach(p => {
      if (!s.activites.some(a => a.nom === p.nom)) s.activites.push({ nom: p.nom, prix: p.prix || '', reserve: false });
    });
  }, ['itineraire', 'budget']));
  delegate(page, 'input', '[data-act-nom]', debouncePerTarget((e, el) => {
    const s = draft.stops.find(x => x.id === el.dataset.stop);
    if (s && s.activites[+el.dataset.actNom]) { s.activites[+el.dataset.actNom].nom = el.value; saveDraft(); }
  }, 450));
  delegate(page, 'input', '[data-act-prix]', debouncePerTarget((e, el) => {
    const s = draft.stops.find(x => x.id === el.dataset.stop);
    if (s && s.activites[+el.dataset.actPrix]) { s.activites[+el.dataset.actPrix].prix = el.value; saveDraft(); renderSections(['budget']); }
  }, 450));
  delegate(page, 'change', '[data-act-res]', (e, el) => {
    const s = draft.stops.find(x => x.id === el.dataset.stop);
    if (s && s.activites[+el.dataset.actRes]) { s.activites[+el.dataset.actRes].reserve = el.checked; saveDraft(); }
  });

  // ── Éditeur : segments ──
  delegate(page, 'click', '[data-seg-toggle]', (e, el) => {
    const d = document.getElementById('segd-' + el.dataset.segToggle);
    if (!d) return;
    d.hidden = !d.hidden;
    el.setAttribute('aria-expanded', d.hidden ? 'false' : 'true');
    el.closest('.rt-segment').classList.toggle('is-open', !d.hidden);
  });
  delegate(page, 'change', 'select[data-seg-field]', (e, el) => applySegField(el, true));
  delegate(page, 'change', 'input[data-seg-field]', (e, el) => applySegField(el, true));
  delegate(page, 'input', 'textarea[data-seg-field]', debouncePerTarget((e, el) => applySegField(el, false), 500));

  // ── Éditeur : budget & checklist ──
  delegate(page, 'change', '[data-budget]', (e, el) => mutate(rt => {
    const v = el.value === '' ? null : Math.max(0, +el.value || 0);
    rt.budget[el.dataset.budget] = v;
  }, ['budget']));
  delegate(page, 'click', '[data-rt-convert]', () => openConverter(draft.stops.map(s => s.pays).find(p => p && !usesEuro(p))));
  delegate(page, 'click', '[data-ck-suggest]', () => mutate(rt => {
    const exist = new Set((rt.checklist || []).map(c => c.texte));
    rtDefaultChecklist(rt).forEach(c => { if (!exist.has(c.texte)) rt.checklist.push(c); });
  }, ['checklist']));
  delegate(page, 'click', '[data-ck-add]', () => {
    const inp = $('#ck-new');
    const t = (inp.value || '').trim();
    if (!t) return;
    inp.value = '';
    mutate(rt => rt.checklist.push({ id: rtId('ck'), texte: t, fait: false }), ['checklist']);
  });
  delegate(page, 'keydown', '#ck-new', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-ck-add]').click(); } });
  delegate(page, 'change', '[data-ck]', (e, el) => {
    if (draft.checklist[+el.dataset.ck]) { draft.checklist[+el.dataset.ck].fait = el.checked; saveDraft(); }
  });
  delegate(page, 'click', '[data-ck-del]', (e, el) => mutate(rt => rt.checklist.splice(+el.dataset.ckDel, 1), ['checklist']));

  // ── Éditeur : ajout d'étapes ──
  delegate(page, 'change', '#rt-country-select', (e, el) => { countryPick = el.value; renderSections(['itineraire']); });
  delegate(page, 'click', '[data-country-toggle]', (e, el) => {
    const id = el.dataset.countryToggle;
    const i = draft.stops.findIndex(s => s.destId === id);
    if (i >= 0) mutate(rt => rt.stops.splice(i, 1));
    else addStopFromDest(id);
  });
  delegate(page, 'click', '[data-rt-add-all]', () => {
    let n = 0;
    mutate(rt => {
      activeDests().filter(d => d.pays === countryPick).forEach(d => {
        if (rt.stops.some(s => s.destId === d.id)) return;
        rt.stops.push(rtNewStop({ nom: d.nom, destId: d.id, pays: d.pays, coords: d.coords ? [d.coords[0], d.coords[1]] : null, nights: 2 }));
        n++;
      });
      if (!rt.nom) rt.nom = 'Road trip ' + countryPick;
    });
    showToast(n ? `➕ ${n} étape(s) ajoutée(s)` : 'Toutes les villes de ce pays sont déjà dans l\'itinéraire');
  });
  delegate(page, 'input', '#rt-add-search', debounce((e, el) => searchStops(el.value), 400));
  delegate(page, 'click', '[data-add-cat-stop]', (e, el) => addStopFromDest(el.dataset.addCatStop));
  delegate(page, 'click', '[data-add-geo-stop]', (e, el) => {
    const r = geoResults[+el.dataset.addGeoStop];
    if (!r) return;
    mutate(rt => {
      rt.stops.push(rtNewStop({
        nom: (r.ville || r.label.split(',')[0]).trim(),
        pays: r.pays || '', coords: [r.lat, r.lon], nights: 1,
      }));
      if (!rt.nom && r.pays) rt.nom = 'Road trip ' + r.pays;
    });
    const box = $('#rt-add-results'); if (box) box.innerHTML = '';
    const inp = $('#rt-add-search'); if (inp) inp.value = '';
  });

  // ── Réordonnancement par glisser-déposer ──
  let dragId = null;
  page.addEventListener('dragstart', e => {
    const c = e.target.closest('.rt-stop-card');
    if (!c) return;
    dragId = c.dataset.stop;
    e.dataTransfer.effectAllowed = 'move';
    c.classList.add('pin-dragging');
  });
  page.addEventListener('dragover', e => {
    const c = e.target.closest('.rt-stop-card');
    if (c && dragId && c.dataset.stop !== dragId) { e.preventDefault(); c.classList.add('pin-dragover'); }
  });
  page.addEventListener('dragleave', e => {
    const c = e.target.closest('.rt-stop-card');
    if (c) c.classList.remove('pin-dragover');
  });
  page.addEventListener('drop', e => {
    const c = e.target.closest('.rt-stop-card');
    if (!c || !dragId) return;
    e.preventDefault();
    const to = draft.stops.findIndex(s => s.id === c.dataset.stop);
    const from = draft.stops.findIndex(s => s.id === dragId);
    dragId = null;
    if (from < 0 || to < 0 || from === to) { renderSections(['itineraire']); return; }
    mutate(rt => rt.stops.splice(to, 0, rt.stops.splice(from, 1)[0]));
  });
  page.addEventListener('dragend', () => {
    $$('.pin-dragging,.pin-dragover').forEach(x => x.classList.remove('pin-dragging', 'pin-dragover'));
    dragId = null;
  });

  // Restaure un brouillon en cours au démarrage
  loadDraft();
  renderList();
  subscribe(() => { if (view === 'list') renderList(); });
}

// ── Helpers d'action ─────────────────────────────────────
function setNights(id, delta) {
  mutate(rt => {
    const s = rt.stops.find(x => x.id === id);
    if (s) s.nights = Math.max(0, Math.min(60, (+s.nights || 0) + delta));
  });
}

function moveStop(id, dir) {
  mutate(rt => {
    const i = rt.stops.findIndex(s => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rt.stops.length) return;
    [rt.stops[i], rt.stops[j]] = [rt.stops[j], rt.stops[i]];
  });
}

function removeStop(id) {
  const s = draft.stops.find(x => x.id === id);
  if (!s) return;
  const snap = JSON.parse(JSON.stringify(s));
  const idx = draft.stops.findIndex(x => x.id === id);
  const segSnap = JSON.parse(JSON.stringify(draft.segments));
  mutate(rt => { rt.stops.splice(idx, 1); });
  pushUndo(`Étape « ${shortName(snap)} » retirée`, () => {
    mutate(rt => { rt.stops.splice(idx, 0, snap); rt.segments = segSnap; });
  });
}

function applySegField(el, rerender) {
  const seg = draft.segments.find(s => s.id === el.dataset.seg);
  if (!seg) return;
  const f = el.dataset.segField;
  const num = v => (v === '' ? null : Math.max(0, +v || 0));
  if (f === 'mode') seg.mode = el.value;
  else if (f === 'departTime') seg.departTime = el.value;
  else if (f === 'arriveeTime') seg.arriveeTime = el.value;
  else if (f === 'distanceKm') seg.distanceKm = num(el.value);
  else if (f === 'dureeH') seg.dureeH = num(el.value);
  else if (f === 'cout') seg.cout = num(el.value);
  else if (f === 'resStatus') seg.reservation.status = el.value;
  else if (f === 'resRef') seg.reservation.reference = el.value;
  else if (f === 'resLien') seg.reservation.lien = el.value;
  else if (f === 'notes') seg.notes = el.value;
  saveDraft();
  if (rerender) renderSections(['itineraire', 'resume', 'budget', 'controle']);
  else renderSections(['resume', 'budget']);
}

async function geolocatePoint(which) {
  const input = $(which === 'origin' ? '#rt-origin' : '#rt-retour');
  const q = (input && input.value || '').trim();
  if (q.length < 3) { showToast('Saisis au moins 3 caractères'); return; }
  showToast('🔎 Localisation…');
  const { results, error } = await geocode(q);
  if (error || !results.length) { showToast(error || 'Aucun résultat', { tone: 'error' }); return; }
  const r = results[0];
  mutate(rt => {
    const p = rtNewPoint({ nom: (r.ville || r.label.split(',')[0]).trim(), coords: [r.lat, r.lon] });
    if (which === 'origin') {
      const near = nearestAirports(p.coords, 1)[0];
      p.iata = near ? near.iata : '';
      rt.origin = p;
    } else { rt.retour = p; }
  }, ['reglages', 'itineraire', 'resume', 'controle']);
  showToast('📍 ' + r.label.split(',')[0]);
}

function searchStops(q) {
  const box = $('#rt-add-results');
  if (!box) return;
  q = (q || '').trim();
  if (q.length < 2) { box.innerHTML = ''; return; }
  const ql = q.toLowerCase();
  const cat = activeDests()
    .filter(d => d.nom.toLowerCase().includes(ql) || (d.pays || '').toLowerCase().includes(ql))
    .slice(0, 6);
  const catHtml = cat.map(d => `<button type="button" class="rt-result" data-add-cat-stop="${escAttr(d.id)}">
      <span>${escHtml(d.emoji)} ${escHtml(d.nom)} <span class="muted-inline">· ${escHtml(d.pays)}</span></span>
      <span class="rt-result-tag">catalogue</span></button>`).join('');
  box.innerHTML = catHtml + '<div class="rt-geo-hint">🔎 Recherche d\'autres lieux…</div>';

  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();
  geocode(q, { signal: searchAbort.signal }).then(({ results, error }) => {
    geoResults = (results || []).slice(0, 5);
    const geoHtml = geoResults.map((r, i) =>
      `<button type="button" class="rt-result" data-add-geo-stop="${i}">
        <span>📍 ${escHtml(r.label)}</span><span class="rt-result-tag rt-result-geo">carte</span></button>`).join('');
    box.innerHTML = catHtml + (geoHtml || (catHtml ? '' : `<div class="rt-geo-hint">${escHtml(error || 'Aucun résultat.')}</div>`));
  }).catch(() => { box.innerHTML = catHtml; });
}

// ── API publique ─────────────────────────────────────────
/** Depuis la fiche destination : démarre un road trip avec cette étape. */
function rtQuickAdd(destId) {
  showPage('roadtrips');
  if (!draft || !dirty()) openEditor(null);
  else { view = 'editor'; renderEditor(); }
  addStopFromDest(destId);
}

/** Depuis le filtre par pays des destinations. */
function rtFromCountry(pays) {
  const dests = activeDests().filter(d => d.pays === pays).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  if (!dests.length) return;
  showPage('roadtrips');
  openEditor(null);
  mutate(rt => {
    rt.nom = 'Road trip ' + pays;
    dests.forEach(d => rt.stops.push(rtNewStop({
      nom: d.nom, destId: d.id, pays: d.pays,
      coords: d.coords ? [d.coords[0], d.coords[1]] : null, nights: 2,
    })));
  });
}

function buildRoadtrips() { renderCurrent(); }

Object.assign(window, {
  buildRoadtrips, openRoadtripEditor: openEditor, rtQuickAdd, rtFromCountry,
  initRoadtrips: init, rtCurrentDraft: () => draft,
});
})();
