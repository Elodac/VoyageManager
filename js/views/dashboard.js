// ============================================================
// views/dashboard.js — tableau de bord
//
// Refonte de l'architecture de l'information : les 4 zones qui
// décrivaient les mêmes objets (héros épinglés / sélecteur / grille
// « Mes voyages » / « Destinations en planification ») sont réduites
// à DEUX :
//   ① Mes voyages  — une seule liste : épinglés en grand, autres en compact
//   ② Panneau      — le catalogue, pour créer un nouveau voyage
// ============================================================
(function () {

// ── Compte à rebours ─────────────────────────────────────
function refreshCountdowns() {
  const now = new Date();
  $$('.countdown[data-date]').forEach(el => {
    const target = new Date(el.dataset.date + 'T04:30:00');
    const diff = target - now;
    if (!isFinite(diff)) { el.textContent = ''; return; }
    if (diff <= 0) {
      el.innerHTML = '<span class="countdown-go">🎉 C\'est parti !</span>';
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    el.innerHTML = [[days, 'jours'], [hours, 'heures'], [mins, 'minutes']]
      .map(([v, l]) => `<span class="countdown-unit"><span class="countdown-val">${v}</span><span class="countdown-lbl">${l}</span></span>`)
      .join('');
  });
}

// ── Carte « héros » d'un voyage épinglé ──────────────────
function heroPills(t, d) {
  const pills = [];
  const n = t.date_depart && t.date_retour
    ? Math.round((new Date(t.date_retour) - new Date(t.date_depart)) / 86400000) : null;
  if (t.transport && t.transport.label) pills.push('✈️ ' + t.transport.label);
  if (n > 0) pills.push(`🏨 ${n} nuits / ${n + 1} jours`);
  else if (d && d.dates) pills.push('📅 ' + d.dates);
  const b = t.budget || {};
  if (b.min) pills.push(b.min === b.max ? `💳 ${b.min}€` : `💶 ${b.min}–${b.max}€`);
  if (t.travelers) pills.push(`👥 ${t.travelers} pers.`);
  if (t.hebergement && t.hebergement.nom) pills.push('🏨 ' + t.hebergement.nom);
  return pills;
}

function heroHTML(t) {
  const d = destById(t.destinationId) || {};
  const meta = tripStatusMeta(t.status);
  const pct = progress(t);
  const ready = t.status === 'pret' || t.status === 'termine';
  const sub = (t.hebergement && t.hebergement.nom) || d.description || '';
  const progColor = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--border-strong)';
  return `
  <article class="hero-confirmed${ready ? '' : ' hero-plan'}" draggable="true" data-pin="${escAttr(t.destinationId)}" data-trip="${escAttr(t.id)}">
    <span class="pin-grip" aria-hidden="true" title="Glisser pour réordonner">⠿</span>
    <button type="button" class="pin-remove" data-unpin="${escAttr(t.destinationId)}"
            title="Retirer de la une" aria-label="Retirer ${escAttr(t.nom)} de la une">✕</button>
    <div class="hero-emoji" aria-hidden="true">${escHtml(t.emoji || '✈️')}</div>
    <div class="hero-content">
      <h2 class="hero-title">${escHtml(t.nom)}${ready ? ' ✅' : ''}</h2>
      ${sub ? `<p class="hero-sub">${escHtml(sub)}</p>` : ''}
      ${t.date_depart ? `<div class="countdown" data-date="${escAttr(t.date_depart)}"></div>` : ''}
      <div class="hero-meta">${heroPills(t, d).map(p => `<span class="hero-pill">${escHtml(p)}</span>`).join('')}</div>
      <div class="hero-prog">
        <span class="hero-prog-status" style="--c:${meta.color}">${escHtml(meta.label)}</span>
        <div class="hero-prog-bars">
          <div class="trip-prog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
               aria-label="Avancement de la préparation">
            <div class="trip-prog-bar" style="width:${pct}%;background:${progColor}"></div>
          </div>
          <span class="trip-prog-pct">${pct}%</span>
        </div>
      </div>
    </div>
    <div class="hero-actions">
      <button type="button" class="btn ${ready ? 'btn-success' : 'btn-primary'}" data-open-trip="${escAttr(t.id)}">🧭 Préparation &amp; suivi</button>
      <button type="button" class="btn btn-outline" data-open-dest="${escAttr(t.destinationId)}">ℹ️ Fiche destination</button>
      <button type="button" class="btn btn-outline" data-goto-map="${escAttr(t.destinationId)}">📍 Sur la carte</button>
      <button type="button" class="btn btn-outline" data-archive="${escAttr(t.destinationId)}">🗄️ Archiver</button>
    </div>
  </article>`;
}

// ── Carte compacte d'un voyage non épinglé ───────────────
function tripCardHTML(t) {
  const meta = tripStatusMeta(t.status);
  const pct = progress(t);
  const dates = t.date_depart ? `${t.date_depart} → ${t.date_retour || '?'}` : 'Dates à définir';
  const color = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--border-strong)';
  return `
    <article class="trip-card" data-trip="${escAttr(t.id)}" tabindex="0" role="button"
             aria-label="Ouvrir la préparation de ${escAttr(t.nom)}">
      <button type="button" class="trip-del" data-del-trip="${escAttr(t.id)}"
              title="Supprimer ce voyage" aria-label="Supprimer le voyage ${escAttr(t.nom)}">✕</button>
      <button type="button" class="trip-pin" data-pin-trip="${escAttr(t.destinationId)}"
              title="Mettre à la une" aria-label="Mettre ${escAttr(t.nom)} à la une">📌</button>
      <div class="trip-card-top">
        <span class="trip-emoji" aria-hidden="true">${escHtml(t.emoji || '✈️')}</span>
        <div class="trip-card-head">
          <div class="trip-name">${escHtml(t.nom)}</div>
          <div class="trip-dates">${escHtml(dates)}</div>
        </div>
      </div>
      <div class="trip-badge" style="--c:${meta.color}">${escHtml(meta.label)}</div>
      <div class="trip-prog-row">
        <div class="trip-prog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="trip-prog-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="trip-prog-pct">${pct}%</span>
      </div>
    </article>`;
}

// ── Liste unique des voyages ─────────────────────────────
function buildPinned() {
  const mount = $('#trips-mount');
  if (!mount) return;
  const archived = new Set(getArchivedIds());
  const trips = getTrips().filter(t => t.status !== 'archive' && !archived.has(t.destinationId));
  const pinnedIds = getPinnedIds();

  const pinned = pinnedIds.map(id => trips.find(t => t.destinationId === id)).filter(Boolean);
  const others = trips.filter(t => !pinnedIds.includes(t.destinationId));

  if (!trips.length) {
    mount.innerHTML = `
      <div class="pin-empty">
        <p><strong>Aucun voyage pour l'instant.</strong></p>
        <p>Choisis une destination dans le panneau de droite, ou crée ton voyage directement.</p>
        <button type="button" class="btn btn-primary" data-create-voyage>➕ Créer un voyage</button>
      </div>`;
    return;
  }

  mount.innerHTML =
    (pinned.length ? `<div class="hero-list">${pinned.map(heroHTML).join('')}</div>
       <p class="pin-hint">↕ Glisse les cartes pour les réordonner · ✕ pour retirer de la une</p>` : '')
    + `<div class="pin-dropzone${pinned.length ? '' : ' pin-dropzone-empty'}">
         <span>📌 <strong>Dépose un voyage ici</strong> pour le mettre à la une</span>
       </div>`
    + (others.length ? `
       <h3 class="section-title">Autres voyages <span class="count-badge">${others.length}</span></h3>
       <div class="trip-grid">${others.map(tripCardHTML).join('')}</div>` : '');

  refreshCountdowns();
}

// ── Voyage prioritaire (pilote « À faire » et « Programme ») ──
function getPrimaryTrip() {
  const today = todayISO();
  const archived = new Set(getArchivedIds());
  const live = getTrips().filter(t => t.status !== 'archive' && !archived.has(t.destinationId));
  // 1. Voyage prêt, en cours ou à venir
  const ready = live.filter(t => t.status === 'pret' && (!t.date_retour || t.date_retour >= today))
    .sort((a, b) => (a.date_depart || '').localeCompare(b.date_depart || ''));
  if (ready.length) return ready[0];
  // 2. Premier voyage mis à la une
  for (const id of getPinnedIds()) {
    const t = live.find(x => x.destinationId === id);
    if (t && t.status !== 'termine') return t;
  }
  // 3. Prochain voyage daté
  const dated = live.filter(t => t.date_depart && t.date_depart >= today)
    .sort((a, b) => a.date_depart.localeCompare(b.date_depart));
  if (dated.length) return dated[0];
  // 4. Premier voyage en préparation
  return live.find(t => t.status !== 'idee' && t.status !== 'termine') || live[0] || null;
}

// ── Check-list contextuelle ──────────────────────────────
const TODO_KEY = t => 'todos_' + t.id;

function genericTodos(trip) {
  const d = destById(trip.destinationId) || {};
  const out = [];
  const trOk = trip.transport && ['confirme', 'paye'].includes(trip.transport.status);
  const hbOk = trip.hebergement && ['confirme', 'paye'].includes(trip.hebergement.status);
  out.push({ done: trOk, text: 'Réserver le transport', urgent: !trOk, auto: true });
  out.push({ done: hbOk, text: 'Réserver l\'hébergement', urgent: !hbOk, auto: true });
  (trip.activites || []).filter(a => a.status === 'prevue').slice(0, 3)
    .forEach(a => out.push({ done: false, text: 'Réserver / caler : ' + a.nom, urgent: false }));
  const eu = continentOf(d.pays) === 'Europe';
  out.push({ done: false, text: eu ? `Commander la CEAM ×${trip.travelers || 2} (ameli.fr)` : 'Souscrire une assurance voyage', urgent: false });
  out.push({ done: false, text: `Vérifier passeport / CNI valides (${trip.travelers || 2} pers.)`, urgent: false });
  out.push({ done: false, text: 'Cartes hors-ligne sur le téléphone', urgent: false });
  out.push({ done: false, text: 'Préparer la valise', urgent: false });
  return out;
}

function renderTodos(trip) {
  const el = $('#todo-list');
  if (!el) return;
  const todos = genericTodos(trip);
  const key = TODO_KEY(trip);
  let saved = lsGet(key, null);
  if (!Array.isArray(saved) || saved.length !== todos.length) saved = todos.map(t => t.done);
  el.innerHTML = `<ul class="todo-ul">` + todos.map((t, i) => {
    const done = t.auto ? t.done : !!saved[i];
    const id = `todo-${trip.id}-${i}`;
    return `<li class="todo-li">
      <input type="checkbox" id="${escAttr(id)}" ${done ? 'checked' : ''} ${t.auto ? 'disabled' : ''}
             data-todo="${i}" data-todo-key="${escAttr(key)}">
      <label for="${escAttr(id)}" class="${done ? 'is-done' : ''}">${escHtml(t.text)}</label>
      ${t.auto ? '<span class="todo-auto" title="Se coche automatiquement depuis le suivi du voyage">auto</span>' : ''}
      ${t.urgent && !done ? '<span class="todo-urgent">URGENT</span>' : ''}
    </li>`;
  }).join('') + `</ul>`;
}

function saveTodo(i, val, key) {
  const saved = lsGet(key, []);
  saved[i] = val;
  lsSet(key, saved);
}

// ── Timeline programme ───────────────────────────────────
function buildProgrammeDays(trip) {
  const ag = getAgenda(trip.id);
  if (ag && (ag.blocks || []).length) {
    const byDay = {};
    ag.blocks.forEach(b => { (byDay[b.day] = byDay[b.day] || []).push(b); });
    return Object.keys(byDay).sort().slice(0, 6).map((iso, i) => {
      const blocks = byDay[iso].sort((a, b) => a.start - b.start);
      return {
        emoji: blocks[0].emoji || '📅',
        label: 'J' + (i + 1) + ' · ' + iso.slice(8) + '/' + iso.slice(5, 7),
        title: blocks[0].label,
        items: blocks.slice(0, 4).map(b => b.label),
      };
    });
  }
  const d = destById(trip.destinationId);
  if (d && d.pois && d.pois.length) {
    return [{ emoji: d.emoji || '📍', label: 'À voir', title: shortName(d), items: d.pois.slice(0, 6).map(p => p.nom) }];
  }
  return null;
}

function renderTimeline(trip) {
  const el = $('#mini-timeline');
  if (!el) return;
  const days = buildProgrammeDays(trip);
  if (days && days.length) {
    el.innerHTML = days.map(d => `
      <div class="timeline-day">
        <div class="timeline-dot" aria-hidden="true">${escHtml(d.emoji)}</div>
        <div class="timeline-content">
          <div class="timeline-day-label">${escHtml(d.label)}</div>
          <div class="timeline-title">${escHtml(d.title)}</div>
          <div class="timeline-items">${d.items.map(i => `<div class="timeline-item">${escHtml(i)}</div>`).join('')}</div>
        </div>
      </div>`).join('');
  } else {
    el.innerHTML = `<p class="hint">Pas encore de programme pour ${escHtml(shortName(trip))}.
      <button type="button" class="btn btn-outline btn-sm" data-goto-agenda="${escAttr(trip.id)}">📆 Créer l'agenda</button></p>`;
  }
}

// ── Tableau de bord complet ──────────────────────────────
function buildDashboard() {
  // Statistiques (hors archives)
  const archived = new Set(getArchivedIds());
  const counts = { confirme: 0, planification: 0, projet: 0, projet_longterme: 0 };
  allDests().forEach(d => { if (counts[d.statut] != null && !archived.has(d.id)) counts[d.statut]++; });
  Object.keys(counts).forEach(k => { const el = document.getElementById('stat-' + k); if (el) el.textContent = counts[k]; });

  const primary = getPrimaryTrip();
  const todoTitle = $('#todo-title');
  const progTitle = $('#programme-title');
  const todoList = $('#todo-list');
  const timeline = $('#mini-timeline');

  if (!primary) {
    if (todoTitle) todoTitle.textContent = '🔴 À faire avant ton prochain voyage';
    if (progTitle) progTitle.textContent = '📅 Programme';
    if (todoList) {todoList.innerHTML = `<p class="hint">Aucun voyage actif.
      <button type="button" class="btn btn-primary btn-sm" data-create-voyage>➕ Créer un voyage</button></p>`;}
    if (timeline) timeline.innerHTML = '<p class="hint">Aucun programme pour le moment.</p>';
  } else {
    const name = shortName(primary);
    if (todoTitle) todoTitle.innerHTML = `🔴 À faire avant <button type="button" class="link-btn" data-open-trip="${escAttr(primary.id)}">${escHtml(name)}</button>`;
    if (progTitle) progTitle.innerHTML = `📅 Programme — <button type="button" class="link-btn" data-open-trip="${escAttr(primary.id)}">${escHtml(name)}</button>`;
    renderTodos(primary);
    renderTimeline(primary);
  }

  buildCatalogPanel();
  buildDashRoadtrips();
}

// ── Road trips sur le tableau de bord ────────────────────
/**
 * Le tableau de bord doit refléter exactement les données : un road trip
 * créé, modifié, dupliqué ou supprimé apparaît / disparaît ici sans délai
 * (la vue est abonnée au store).
 */
function buildDashRoadtrips() {
  const mount = $('#dash-roadtrips');
  if (!mount) return;
  const rts = getRoadtrips().map(rtNormalize).filter(r => r.status !== 'archive');
  const card = $('#dash-rt-card');
  if (card) card.hidden = false;

  if (!rts.length) {
    mount.className = '';
    mount.innerHTML = `<p class="hint">Aucun road trip. Un itinéraire multi-étapes avec transports,
      hébergements et dossier imprimable se construit en quelques minutes.
      <button type="button" class="btn btn-outline btn-sm" data-goto-rt>🚗 Créer un road trip</button></p>`;
    return;
  }
  mount.className = 'trip-grid';
  mount.innerHTML = rts.slice(0, 6).map(rt => {
    const s = rtStats(rt);
    const meta = rtStatusMeta(rt.status);
    return `<article class="trip-card" data-dash-rt="${escAttr(rt.id)}" tabindex="0" role="button"
             aria-label="Ouvrir le road trip ${escAttr(rt.nom || 'sans nom')}">
      <div class="trip-card-top">
        <span class="trip-emoji" aria-hidden="true">🚗</span>
        <div class="trip-card-head">
          <div class="trip-name">${escHtml(rt.nom || 'Road trip sans nom')}</div>
          <div class="trip-dates">${s.debut ? escHtml(s.debut + ' → ' + s.fin) : 'Dates à définir'}</div>
        </div>
      </div>
      <div class="trip-badge" style="--c:${meta.color}">${escHtml(meta.label)}</div>
      <div class="rt-card-stats">
        <span>📍 ${s.etapes}</span><span>🌙 ${s.nuits}</span>
        <span>🛣️ ${s.km} km</span>${s.total ? `<span>💶 ${s.total} €</span>` : ''}
      </div>
    </article>`;
  }).join('');
}

// ── Panneau latéral : créer un voyage depuis le catalogue ──
let _catQuery = '';
let _catExpandAll = false;

function buildCatalogPanel(keepFocus) {
  const el = $('#pin-selector');
  if (!el) return;
  const q = _catQuery;
  const withTrip = new Set(getTrips().map(t => t.destinationId));
  const groups = [
    { key: 'confirme', label: '✅ Confirmés' },
    { key: 'planification', label: '🔍 En planification' },
    { key: 'projet', label: '📋 Projets Europe' },
    { key: 'projet_longterme', label: '🌍 Longs courriers' },
  ];

  let html = `<div class="pin-selector-head" id="catalog-panel-title">🧭 Catalogue
      <button type="button" class="pin-expand-btn" data-toggle-all
        aria-label="${_catExpandAll ? 'Tout replier' : 'Tout déplier'}"
        title="${_catExpandAll ? 'Tout replier' : 'Tout déplier'}">${_catExpandAll ? '⊟' : '⊞'}</button>
    </div>
    <p class="pin-selector-sub">Clique une destination pour en faire un voyage.</p>
    <label class="visually-hidden" for="pin-sel-search">Filtrer les destinations</label>
    <input id="pin-sel-search" class="pin-sel-search" type="search"
           placeholder="🔎 Filtrer les destinations…" value="${escAttr(_catQuery)}">`;

  let any = false;
  groups.forEach(g => {
    let items = activeDests().filter(d => d.statut === g.key);
    if (q) items = items.filter(d => d.nom.toLowerCase().includes(q) || (d.pays || '').toLowerCase().includes(q));
    items.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    if (!items.length) return;
    any = true;
    const open = _catExpandAll || q || g.key === 'confirme' || g.key === 'planification';
    html += `<details class="pin-group"${open ? ' open' : ''}>
      <summary>${g.label} <span class="pin-group-count">${items.length}</span></summary>
      <div class="pin-group-body">
        ${items.map(d => {
          const has = withTrip.has(d.id);
          return `<button type="button" class="pin-sel-item${has ? ' is-pinned' : ''}"
              draggable="true" data-cat-dest="${escAttr(d.id)}"
              title="${has ? 'Ouvrir le voyage existant' : 'Créer un voyage vers ' + escAttr(d.nom)}">
            <span class="pin-sel-emoji" aria-hidden="true">${escHtml(d.emoji)}</span>
            <span class="pin-sel-name">${escHtml(d.nom)}</span>
            <span class="pin-sel-act" aria-hidden="true">${has ? '✓' : '+'}</span>
          </button>`;
        }).join('')}
      </div>
    </details>`;
  });
  if (!any) html += `<p class="hint">Aucune destination trouvée.</p>`;
  el.innerHTML = html;

  if (keepFocus) {
    const s = $('#pin-sel-search');
    if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  }
}

// ── Épinglage & drag and drop ────────────────────────────
let _dragDestId = null;

function pinTrip(destId) {
  pinDest(destId);
  buildPinned();
  showToast('📌 Mis à la une');
}
function unpinTrip(destId) {
  unpinDest(destId);
  buildPinned();
}

function handleDrop(targetDestId) {
  if (!_dragDestId) return;
  const ids = getPinnedIds();
  const from = ids.indexOf(_dragDestId);
  const to = targetDestId ? ids.indexOf(targetDestId) : -1;
  if (from < 0) {
    ids.splice(to < 0 ? ids.length : to, 0, _dragDestId);
  } else {
    if (to < 0 || from === to) { _dragDestId = null; return; }
    ids.splice(to, 0, ids.splice(from, 1)[0]);
  }
  setPinnedIds(ids);
  _dragDestId = null;
  buildPinned();
}

// ── Création d'un voyage ─────────────────────────────────
async function createVoyageFromDest(destId) {
  const d = destById(destId);
  if (!d) return;
  let trip = getTripByDestination(destId);
  if (!trip) {
    unarchiveDest(destId);
    trip = addTrip(tripFromDestination(d));
    adoptLegacyForTrip(trip);
    // Créer un voyage, c'est décider de le préparer : une simple « idée » passe en préparation.
    const mapped = CATALOG_TO_TRIP_STATUS[d.statut] || 'preparation';
    updateTrip(trip.id, { status: mapped === 'idee' ? 'preparation' : mapped });
    logHistory('voyage créé', d.nom);
    showToast('🧳 Voyage créé — complète sa préparation !');
  }
  pinDest(destId);
  buildPinned();
  buildDashboard();
  closeOverlay('#create-voyage-overlay');
  if (window.openTripModal) openTripModal(trip.id);
}

function openCreateVoyage() {
  const ov = ensureOverlay('create-voyage-overlay', 'cv-title');
  ov.innerHTML = `
    <div class="modal modal-narrow" role="document">
      <div class="modal-header">
        <span class="modal-emoji" aria-hidden="true">🧳</span>
        <div class="modal-title">
          <h2 id="cv-title">Créer un voyage</h2>
          <p class="modal-sub">Choisis une destination — tu seras guidé pour la préparer.</p>
        </div>
        <button type="button" class="modal-close" data-close aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <label class="visually-hidden" for="cv-search">Rechercher une destination</label>
        <input id="cv-search" class="add-item-input" type="search" placeholder="🔎 Rechercher une destination…">
        <div id="cv-list" class="cv-list"></div>
        <p class="hint">Ta destination n'est pas là ?
          <button type="button" class="btn btn-outline btn-sm" data-add-dest>➕ Ajouter une destination</button></p>
      </div>
    </div>`;
  ov.querySelector('[data-close]').addEventListener('click', () => closeOverlay(ov));
  ov.querySelector('[data-add-dest]').addEventListener('click', () => { closeOverlay(ov); showPage('ajouter'); });
  ov.querySelector('#cv-search').addEventListener('input', debounce(e => renderCreateVoyageList(e.target.value), 150));
  delegate(ov, 'click', '[data-cv-dest]', (e, el) => createVoyageFromDest(el.dataset.cvDest));
  renderCreateVoyageList('');
  openOverlay(ov);
}

function renderCreateVoyageList(q) {
  const box = $('#cv-list');
  if (!box) return;
  q = (q || '').toLowerCase().trim();
  let list = activeDests();
  if (q) list = list.filter(d => d.nom.toLowerCase().includes(q) || (d.pays || '').toLowerCase().includes(q));
  if (!list.length) { box.innerHTML = '<p class="hint">Aucune destination trouvée.</p>'; return; }
  const groups = {};
  list.forEach(d => { const c = continentOf(d.pays); (groups[c] = groups[c] || []).push(d); });
  const order = CONTINENT_ORDER.filter(c => groups[c])
    .concat(Object.keys(groups).filter(c => !CONTINENT_ORDER.includes(c)).sort());
  box.innerHTML = order.map(cont => `
    <details class="pin-group"${(q || cont === 'Europe') ? ' open' : ''}>
      <summary>${escHtml(CONTINENT_EMOJI[cont] || '🌐')} ${escHtml(cont)} <span class="pin-group-count">${groups[cont].length}</span></summary>
      <div class="pin-group-body">
        ${groups[cont].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(d => `
          <button type="button" class="pin-sel-item" data-cv-dest="${escAttr(d.id)}">
            <span class="pin-sel-emoji" aria-hidden="true">${escHtml(d.emoji)}</span>
            <span class="pin-sel-name">${escHtml(d.nom)} <span class="muted-inline">· ${escHtml(d.pays)}</span></span>
            <span class="pin-sel-act" aria-hidden="true">➕</span>
          </button>`).join('')}
      </div>
    </details>`).join('');
}

// ── Suppression d'un voyage (annulable) ──────────────────
async function deleteTrip(id) {
  const t = getTrip(id);
  if (!t) return;
  const ok = await vmConfirm({
    title: `Supprimer le voyage « ${t.nom} » ?`,
    message: 'Son agenda, sa valise et ses dépenses seront également supprimés.',
    confirmLabel: 'Supprimer', danger: true,
  });
  if (!ok) return;
  const tripSnap = removeTrip(id);
  const dataSnap = dropTripData(id);
  pushUndo(`Voyage « ${t.nom} » supprimé`, () => {
    restoreTrip(tripSnap);
    restoreTripData(id, dataSnap);
    buildPinned(); buildDashboard();
  });
  logHistory('voyage supprimé', t.nom);
  buildPinned(); buildDashboard();
}

// ── Câblage (délégation — aucun onclick inline) ──────────
function init() {
  const dash = document.getElementById('page-dashboard');
  if (!dash) return;

  delegate(dash, 'click', '[data-statut-filter]', (e, el) => {
    showPage('destinations');
    if (window.setFiltre) setFiltre(el.dataset.statutFilter);
  });
  delegate(dash, 'click', '[data-create-voyage]', openCreateVoyage);
  delegate(dash, 'click', '[data-open-trip]', (e, el) => window.openTripModal && openTripModal(el.dataset.openTrip));
  delegate(dash, 'click', '[data-open-dest]', (e, el) => window.openDest && openDest(el.dataset.openDest));
  delegate(dash, 'click', '[data-goto-map]', (e, el) => { showPage('carte'); setTimeout(() => window.focusMap && focusMap(el.dataset.gotoMap), 300); });
  delegate(dash, 'click', '[data-goto-agenda]', (e, el) => vmGoTo('agenda', el.dataset.gotoAgenda));
  delegate(dash, 'click', '[data-archive]', (e, el) => {
    const id = el.dataset.archive;
    archiveDest(id);
    pushUndo('Voyage archivé', () => { unarchiveDest(id); buildPinned(); buildDashboard(); });
    buildPinned(); buildDashboard();
  });
  delegate(dash, 'click', '[data-unpin]', (e, el) => { e.stopPropagation(); unpinTrip(el.dataset.unpin); });
  delegate(dash, 'click', '[data-pin-trip]', (e, el) => { e.stopPropagation(); pinTrip(el.dataset.pinTrip); });
  delegate(dash, 'click', '[data-del-trip]', (e, el) => { e.stopPropagation(); deleteTrip(el.dataset.delTrip); });
  delegate(dash, 'click', '[data-cat-dest]', (e, el) => createVoyageFromDest(el.dataset.catDest));
  delegate(dash, 'click', '[data-goto-rt]', () => { showPage('roadtrips'); setTimeout(() => window.openRoadtripEditor && openRoadtripEditor(null), 60); });
  delegate(dash, 'click', '[data-dash-rt]', (e, el) => {
    showPage('roadtrips');
    setTimeout(() => window.openRoadtripEditor && openRoadtripEditor(el.dataset.dashRt), 60);
  });
  delegate(dash, 'keydown', '[data-dash-rt]', (e, el) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    showPage('roadtrips');
    setTimeout(() => window.openRoadtripEditor && openRoadtripEditor(el.dataset.dashRt), 60);
  });
  delegate(dash, 'click', '[data-toggle-all]', () => { _catExpandAll = !_catExpandAll; buildCatalogPanel(true); });

  // Carte de voyage : ouverture au clic et au clavier
  delegate(dash, 'click', '.trip-card', (e, el) => {
    if (e.target.closest('button')) return;
    window.openTripModal && openTripModal(el.dataset.trip);
  });
  delegate(dash, 'keydown', '.trip-card', (e, el) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    window.openTripModal && openTripModal(el.dataset.trip);
  });
  delegate(dash, 'click', '.hero-confirmed', (e, el) => {
    if (e.target.closest('button')) return;
    window.openTripModal && openTripModal(el.dataset.trip);
  });

  // Cases à cocher de la check-list
  delegate(dash, 'change', '[data-todo]', (e, el) => saveTodo(+el.dataset.todo, el.checked, el.dataset.todoKey));

  // Recherche du panneau catalogue
  delegate(dash, 'input', '#pin-sel-search', debounce((e, el) => {
    _catQuery = (el.value || '').toLowerCase().trim();
    buildCatalogPanel(true);
  }, 180));

  // Drag & drop : réordonner les cartes à la une
  dash.addEventListener('dragstart', e => {
    const src = e.target.closest('[data-pin],[data-cat-dest]');
    if (!src) return;
    _dragDestId = src.dataset.pin || src.dataset.catDest;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', _dragDestId); } catch { /* Safari */ }
    src.classList.add('pin-dragging');
  });
  dash.addEventListener('dragend', () => {
    $$('.pin-dragging,.pin-dragover,.pin-mount-over').forEach(el =>
      el.classList.remove('pin-dragging', 'pin-dragover', 'pin-mount-over'));
    _dragDestId = null;
  });
  dash.addEventListener('dragover', e => {
    const zone = e.target.closest('[data-pin],.pin-dropzone');
    if (!zone) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    zone.classList.add(zone.classList.contains('pin-dropzone') ? 'pin-mount-over' : 'pin-dragover');
  });
  dash.addEventListener('dragleave', e => {
    const zone = e.target.closest('[data-pin],.pin-dropzone');
    if (zone) zone.classList.remove('pin-dragover', 'pin-mount-over');
  });
  dash.addEventListener('drop', e => {
    const zone = e.target.closest('[data-pin],.pin-dropzone');
    if (!zone) return;
    e.preventDefault();
    handleDrop(zone.dataset.pin || null);
  });

  buildPinned();
  buildDashboard();
  subscribe(() => { buildPinned(); buildDashboard(); });
  setInterval(refreshCountdowns, 60000);
}

Object.assign(window, {
  buildPinned, buildDashboard, buildCatalogPanel, buildDashRoadtrips, refreshCountdowns,
  openCreateVoyage, createVoyageFromDest, deleteTrip, getPrimaryTrip,
  pinTrip, unpinTrip, initDashboard: init,
});
})();
