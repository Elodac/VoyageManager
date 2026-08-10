// ============================================================
// views/forms.js — ajout de destinations & d'activités
// + détection de doublons + recherche d'adresse + sélecteur d'emoji
// ============================================================
(function () {

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const val = id => (document.getElementById(id)?.value || '').trim();

const CATEGORIES = ['activité', 'visite', 'restaurant', 'excursion', 'musée', 'randonnée',
  'plage', 'monument', 'point de vue', 'hôtel', 'commerce', 'autre'];
const CAT_TO_TYPE = {
  'visite': 'culture', 'musée': 'culture', 'monument': 'culture', 'activité': 'culture',
  'point de vue': 'detente', 'hôtel': 'detente', 'commerce': 'detente',
  'randonnée': 'randonnee', 'plage': 'plage', 'excursion': 'excursion',
  'restaurant': 'restaurant', 'autre': 'culture',
};

const EMOJI_GROUPS = [
  { label: 'Voyage', emojis: ['✈️', '🚂', '🚢', '🚗', '🛵', '🚲', '🛺', '🏍️', '🚌', '🛩️'] },
  { label: 'Lieux', emojis: ['🏖️', '🏔️', '🗺️', '🏛️', '🏰', '⛩️', '🕌', '🗼', '🌋', '🏝️', '🏜️', '🌉', '🌃', '🎠', '🎡'] },
  { label: 'Activités', emojis: ['🎭', '🎨', '🎶', '🎪', '🏊', '🤿', '🧗', '🚵', '⛷️', '🏄', '🎯', '🎲', '🎰', '🎳'] },
  { label: 'Resto & Café', emojis: ['🍽️', '☕', '🍕', '🍣', '🍜', '🥘', '🍷', '🍺', '🧋', '🥐', '🍦', '🥗'] },
  { label: 'Nature', emojis: ['🌿', '🌸', '🌺', '🌴', '🌲', '🌊', '🦋', '🐠', '🦜', '🐘', '🦁', '🐬'] },
  { label: 'Divers', emojis: ['⭐', '💎', '🔮', '🎁', '🛍️', '📸', '🧭', '🗝️', '💡', '🔭', '🧳', '🎒'] },
];

function emojiPickerHTML(inputId) {
  return `
    <div class="emoji-picker-wrap">
      <button type="button" class="emoji-trigger btn btn-outline btn-sm" data-emoji-for="${escAttr(inputId)}"
              aria-expanded="false" aria-controls="ep-${escAttr(inputId)}">😀 Choisir</button>
      <div class="emoji-panel hidden" id="ep-${escAttr(inputId)}" role="listbox" aria-label="Choisir un emoji">
        ${EMOJI_GROUPS.map(g => `
          <div class="ep-group">
            <div class="ep-group-label">${escHtml(g.label)}</div>
            <div class="ep-emojis">${g.emojis.map(e =>
              `<button type="button" class="ep-btn" role="option" data-ep-target="${escAttr(inputId)}"
                       data-ep-val="${escAttr(e)}" aria-label="${escAttr(e)}">${e}</button>`).join('')}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

const field = (id, label, inner) => `<div class="adv-field"><label for="${escAttr(id)}">${escHtml(label)}</label>${inner}</div>`;
const input = (id, ph = '', type = 'text') =>
  `<input class="add-item-input" id="${escAttr(id)}" type="${type}" placeholder="${escAttr(ph)}">`;

function shell() {
  return `
    <div class="filtres" role="tablist" aria-label="Type d'ajout">
      <button type="button" class="filtre-btn active" data-ftab="dest" role="tab" aria-selected="true">🗺️ Nouvelle destination</button>
      <button type="button" class="filtre-btn" data-ftab="act" role="tab" aria-selected="false">📍 Nouvelle activité / lieu</button>
    </div>
    <div id="ftab-dest">${destForm()}</div>
    <div id="ftab-act" hidden>${actForm()}</div>`;
}

function destForm() {
  return `<div class="card">
    <h2>🗺️ Ajouter une destination</h2>
    <div class="adv-filter-row gap-sm">
      <div class="adv-field">
        <label for="fd-emoji">Emoji</label>
        <div class="emoji-row">
          <input class="add-item-input emoji-input" id="fd-emoji" value="🧭">
          ${emojiPickerHTML('fd-emoji')}
        </div>
      </div>
      ${field('fd-ville', 'Ville *', input('fd-ville', 'ex : Séville'))}
      ${field('fd-pays', 'Pays *', input('fd-pays', 'ex : Espagne'))}
      ${field('fd-region', 'Région', input('fd-region', 'ex : Andalousie'))}
    </div>

    <div class="adv-filter-row gap-sm">
      ${field('fd-quartier', 'Quartier', input('fd-quartier', 'ex : Santa Cruz'))}
      <div class="adv-field flex-2">
        <label for="fd-search">🔍 Recherche adresse / ville</label>
        <div class="input-row">
          <input class="add-item-input" id="fd-search" type="search" placeholder="ex : Séville Espagne">
          <button type="button" class="btn btn-outline btn-sm" id="fd-geo">📍 Rechercher</button>
        </div>
      </div>
      ${field('fd-lat', 'Latitude', input('fd-lat', '—', 'number'))}
      ${field('fd-lon', 'Longitude', input('fd-lon', '—', 'number'))}
    </div>
    <div id="fd-geo-res" role="status" aria-live="polite"></div>
    <div id="fd-dupes"></div>

    <div class="adv-filter-row gap-sm">
      ${field('fd-periode', 'Période idéale', input('fd-periode', 'ex : avril–juin'))}
      ${field('fd-duree', 'Durée conseillée', input('fd-duree', 'ex : 3-4 jours'))}
      ${field('fd-bmin', 'Budget min (€)', input('fd-bmin', '800', 'number'))}
      ${field('fd-bmax', 'Budget max (€)', input('fd-bmax', '1200', 'number'))}
      ${field('fd-climat', 'Climat', input('fd-climat', 'ex : chaud et sec'))}
    </div>
    <div class="adv-field">
      <label for="fd-desc">Description</label>
      <textarea class="add-item-input" id="fd-desc" rows="2" placeholder="Quelques lignes sur la destination…"></textarea>
    </div>
    <div class="adv-field">
      <label for="fd-conseils">Conseils</label>
      <textarea class="add-item-input" id="fd-conseils" rows="2" placeholder="Astuces, à savoir…"></textarea>
    </div>
    <div class="admin-only admin-block">
      <label class="inline-check">
        <input type="checkbox" id="fd-global">
        🌍 Destination <strong>commune</strong> (visible par tous les profils) — sinon elle reste personnelle
      </label>
    </div>
    <div class="btn-row mt-md"><button type="button" class="btn btn-success" id="fd-save">✅ Ajouter la destination</button></div>
    <div id="fd-msg" role="status" aria-live="polite"></div>
  </div>`;
}

function actForm() {
  const opts = activeDests().map(d => `<option value="${escAttr(d.id)}">${escHtml(d.emoji + ' ' + d.nom)}</option>`).join('');
  const cats = CATEGORIES.map(c => `<option value="${escAttr(c)}">${escHtml(c)}</option>`).join('');
  return `<div class="card">
    <h2>📍 Ajouter une activité / un lieu</h2>
    <div class="adv-filter-row gap-sm">
      <div class="adv-field">
        <label for="fa-emoji">Emoji</label>
        <div class="emoji-row">
          <input class="add-item-input emoji-input" id="fa-emoji" value="📍">
          ${emojiPickerHTML('fa-emoji')}
        </div>
      </div>
      ${field('fa-nom', 'Nom *', input('fa-nom', 'ex : Alcázar de Séville'))}
      ${field('fa-cat', 'Catégorie', `<select class="valise-select" id="fa-cat">${cats}</select>`)}
      ${field('fa-dest', 'Rattacher à *', `<select class="valise-select" id="fa-dest"><option value="">— choisir une destination —</option>${opts}</select>`)}
    </div>

    <div class="adv-filter-row gap-sm">
      <div class="adv-field flex-2">
        <label for="fa-search">🔍 Recherche adresse</label>
        <div class="input-row">
          <input class="add-item-input" id="fa-search" type="search" placeholder="ex : Alcázar de Séville">
          <button type="button" class="btn btn-outline btn-sm" id="fa-geo">📍 Rechercher</button>
        </div>
      </div>
      ${field('fa-lat', 'Latitude', input('fa-lat', '—', 'number'))}
      ${field('fa-lon', 'Longitude', input('fa-lon', '—', 'number'))}
    </div>
    <div id="fa-geo-res" role="status" aria-live="polite"></div>

    <div class="adv-filter-row gap-sm">
      ${field('fa-adresse', 'Adresse complète', input('fa-adresse', 'ex : Patio de Banderas, Séville'))}
      ${field('fa-horaires', 'Horaires', input('fa-horaires', 'ex : 9h30–17h'))}
      ${field('fa-tarif', 'Tarif', input('fa-tarif', 'ex : ~13€/pers'))}
    </div>
    <div class="adv-filter-row gap-sm">
      ${field('fa-duree', 'Durée', input('fa-duree', 'ex : 2h'))}
      ${field('fa-diff', 'Difficulté', `<select class="valise-select" id="fa-diff"><option value="">—</option><option>Facile</option><option>Moyen</option><option>Difficile</option></select>`)}
      ${field('fa-site', 'Site internet', input('fa-site', 'https://…', 'url'))}
      ${field('fa-tel', 'Téléphone', input('fa-tel', '+34 …', 'tel'))}
      <div class="adv-field self-end">
        <label class="inline-check"><input type="checkbox" id="fa-resa"> Réservation obligatoire</label>
      </div>
    </div>
    <div class="adv-field">
      <label for="fa-desc">Description / notes</label>
      <textarea class="add-item-input" id="fa-desc" rows="2" placeholder="Description, avis, notes personnelles…"></textarea>
    </div>
    <div class="btn-row mt-md"><button type="button" class="btn btn-success" id="fa-save">✅ Ajouter l'activité</button></div>
    <div id="fa-msg" role="status" aria-live="polite"></div>
  </div>`;
}

// ── Sélecteur d'emoji ────────────────────────────────────
function initEmojiPickers(root) {
  delegate(root, 'click', '.emoji-trigger', (e, btn) => {
    e.stopPropagation();
    const panel = document.getElementById('ep-' + btn.dataset.emojiFor);
    if (!panel) return;
    $$('.emoji-panel', root).forEach(p => { if (p !== panel) p.classList.add('hidden'); });
    $$('.emoji-trigger', root).forEach(b => { if (b !== btn) b.setAttribute('aria-expanded', 'false'); });
    const open = panel.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
  delegate(root, 'click', '.ep-btn', (e, btn) => {
    e.stopPropagation();
    const inp = document.getElementById(btn.dataset.epTarget);
    if (inp) inp.value = btn.dataset.epVal;
    document.getElementById('ep-' + btn.dataset.epTarget)?.classList.add('hidden');
    root.querySelector(`[data-emoji-for="${btn.dataset.epTarget}"]`)?.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('click', () => {
    $$('.emoji-panel', root).forEach(p => p.classList.add('hidden'));
    $$('.emoji-trigger', root).forEach(b => b.setAttribute('aria-expanded', 'false'));
  });
}

// ── Détection de doublons ────────────────────────────────
function findDupes(ville, coords) {
  const n = norm(ville);
  return activeDests().filter(d => {
    const nameMatch = n.length > 2 && norm(d.nom).includes(n);
    const geoMatch = coords && d.coords && haversine(coords, d.coords) < 25;
    return nameMatch || geoMatch;
  });
}

function renderDupes() {
  const box = $('#fd-dupes');
  if (!box) return;
  const lat = parseFloat(val('fd-lat')), lon = parseFloat(val('fd-lon'));
  const coords = (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : null;
  const dupes = findDupes(val('fd-ville'), coords);
  if (!dupes.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="info-box warning"><strong>⚠️ Destination(s) similaire(s) déjà présente(s) :</strong>
    <div class="chip-row mt-xs">
      ${dupes.map(d => `<button type="button" class="mini-btn" data-open-dupe="${escAttr(d.id)}">${escHtml(d.emoji + ' ' + d.nom)} — voir la fiche</button>`).join('')}
    </div></div>`;
}

// ── Géocodage ────────────────────────────────────────────
async function runGeocode(query, resBox, onPick) {
  if (!query) return;
  resBox.innerHTML = '<span class="hint">🔍 Recherche en cours…</span>';
  const { results, error } = await geocode(query);
  if (error) { resBox.innerHTML = `<span class="txt-yellow">⚠️ ${escHtml(error)}</span>`; return; }
  if (!results.length) { resBox.innerHTML = `<span class="hint">Aucun résultat pour « ${escHtml(query)} ».</span>`; return; }
  resBox.innerHTML = `<div class="geocode-results">
    ${results.map((r, i) => `<button type="button" class="geocode-result-btn" data-geo-pick="${i}">
      <span class="gr-pin" aria-hidden="true">📍</span>
      <span class="gr-label">${escHtml(r.label)}</span>
      <span class="gr-coords">${r.lat.toFixed(4)}, ${r.lon.toFixed(4)}</span>
    </button>`).join('')}
  </div>`;
  delegate(resBox, 'click', '[data-geo-pick]', (e, b) => {
    const r = results[+b.dataset.geoPick];
    onPick(r);
    resBox.innerHTML = `<div class="info-box success">✓ Coordonnées récupérées : ${r.lat.toFixed(5)}, ${r.lon.toFixed(5)}</div>`;
  });
}

function attachAutoGeocode(inputId, resBoxId, onPick) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.addEventListener('input', debounce(e => {
    const q = e.target.value.trim();
    const box = document.getElementById(resBoxId);
    if (q.length < 3) { box.innerHTML = ''; return; }
    runGeocode(q, box, onPick);
  }, 700));
}

// ── Enregistrement ───────────────────────────────────────
function saveDest() {
  const ville = val('fd-ville'), pays = val('fd-pays');
  const msg = $('#fd-msg');
  if (!ville || !pays) { msg.innerHTML = '<div class="info-box danger">Ville et pays sont obligatoires.</div>'; return; }
  const lat = parseFloat(val('fd-lat')), lon = parseFloat(val('fd-lon'));
  let id = slug(ville);
  if (activeDests().some(d => d.id === id)) id += '-' + Date.now().toString(36).slice(-4);
  const emoji = val('fd-emoji') || '🧭';
  const dest = {
    id, nom: ville, pays, emoji, statut: 'projet',
    region: val('fd-region'), quartier: val('fd-quartier'),
    coords: (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : null,
    budget_min: +val('fd-bmin') || 0, budget_max: +val('fd-bmax') || 0,
    dates: '', periode: val('fd-periode'), duree_conseillee: val('fd-duree'),
    climat: val('fd-climat'), description: val('fd-desc'), conseils_perso: val('fd-conseils'),
    type: [], pois: [], gastronomie: [], liens: [], custom: true,
  };

  const asGlobal = isAdmin() && $('#fd-global')?.checked;
  if (asGlobal) {
    dest.scope = 'global';
    const gd = getGlobalDests();
    gd.push(dest);
    setGlobalDests(gd);
    if (!window.DESTINATIONS.some(d => d.id === dest.id)) window.DESTINATIONS.push(dest);
    ['buildDestGrid', 'buildPinned', 'buildDashboard'].forEach(f => window[f] && window[f]());
    logHistory('destination commune ajoutée', ville);
  } else {
    dest.scope = 'personal';
    addUserDestination(dest);
    logHistory('destination personnelle ajoutée', ville);
  }

  msg.innerHTML = `<div class="info-box success">✅ « ${escHtml(emoji + ' ' + ville)} » ajoutée${asGlobal ? ' aux destinations <strong>communes</strong>' : ' à tes destinations'}.
    <div class="chip-row mt-xs">
      <button type="button" class="mini-btn" data-after="open" data-id="${escAttr(id)}">Voir la fiche</button>
      <button type="button" class="mini-btn" data-after="trip" data-id="${escAttr(id)}">🧳 Créer un voyage</button>
      <button type="button" class="mini-btn" data-after="transport" data-id="${escAttr(id)}">🚗 Transport</button>
      <button type="button" class="mini-btn" data-after="programmes" data-id="${escAttr(id)}">🧠 Programme</button>
    </div></div>`;
  showToast('🗺️ Destination ajoutée !');
  renderDupes();
}

function saveAct() {
  const nom = val('fa-nom');
  const msg = $('#fa-msg');
  if (!nom) { msg.innerHTML = '<div class="info-box danger">Le nom est obligatoire.</div>'; return; }
  const dId = val('fa-dest');
  if (!dId) {
    msg.innerHTML = '<div class="info-box danger">Choisis la destination à laquelle rattacher ce lieu — c\'est là qu\'il apparaîtra (onglet « Lieux » de la fiche).</div>';
    return;
  }
  const lat = parseFloat(val('fa-lat')), lon = parseFloat(val('fa-lon'));
  const coords = (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : null;
  const cat = val('fa-cat') || 'activité';
  const emoji = val('fa-emoji') || '📍';
  const act = {
    id: 'a' + Date.now().toString(36),
    nom: `${emoji} ${nom}`, categorie: cat, type: CAT_TO_TYPE[cat] || 'culture',
    destinationId: dId, adresse: val('fa-adresse') || val('fa-search'), coords,
    horaires: val('fa-horaires'), prix: val('fa-tarif'), duree: val('fa-duree'),
    difficulte: val('fa-diff'), site: val('fa-site'), tel: val('fa-tel'),
    reservation: $('#fa-resa').checked, description: val('fa-desc'),
  };
  addUserActivity(act);

  const d = destById(dId);
  if (d) {
    d.pois = d.pois || [];
    d.pois.push({
      nom: act.nom, type: act.type, coords: coords || d.coords, prix: act.prix,
      horaires: act.horaires, site: act.site, lien: act.site, tel: act.tel, custom: true,
    });
  }

  msg.innerHTML = `<div class="info-box success">✅ « ${escHtml(emoji + ' ' + nom)} » ajoutée — retrouve-la dans l'onglet « Lieux » de sa fiche.
    <div class="chip-row mt-xs"><button type="button" class="mini-btn" data-after="open" data-id="${escAttr(dId)}">Voir la destination</button></div>
  </div>`;
  showToast('📍 Activité ajoutée !');
  ['fa-nom', 'fa-search', 'fa-adresse', 'fa-lat', 'fa-lon', 'fa-horaires', 'fa-tarif',
    'fa-duree', 'fa-site', 'fa-tel', 'fa-desc'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  $('#fa-emoji').value = '📍';
  $('#fa-geo-res').innerHTML = '';
}

// ── Câblage ──────────────────────────────────────────────
function init() {
  const mount = $('#forms-mount');
  if (!mount) return;
  mount.innerHTML = shell();
  initEmojiPickers(mount);

  delegate(mount, 'click', '[data-ftab]', (e, b) => {
    $$('[data-ftab]', mount).forEach(x => {
      const on = x === b;
      x.classList.toggle('active', on);
      x.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('#ftab-dest').hidden = b.dataset.ftab !== 'dest';
    $('#ftab-act').hidden = b.dataset.ftab !== 'act';
  });

  ['fd-ville', 'fd-pays', 'fd-lat', 'fd-lon'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', debounce(renderDupes, 250)));

  attachAutoGeocode('fd-search', 'fd-geo-res', r => {
    $('#fd-lat').value = r.lat.toFixed(5);
    $('#fd-lon').value = r.lon.toFixed(5);
    if (!val('fd-pays') && r.pays) $('#fd-pays').value = r.pays;
    if (!val('fd-ville') && r.label) $('#fd-ville').value = r.label.split(',')[0].trim();
    renderDupes();
  });
  $('#fd-geo')?.addEventListener('click', () => {
    const q = val('fd-search') || [val('fd-quartier'), val('fd-ville'), val('fd-pays')].filter(Boolean).join(', ');
    runGeocode(q, $('#fd-geo-res'), r => {
      $('#fd-lat').value = r.lat.toFixed(5);
      $('#fd-lon').value = r.lon.toFixed(5);
      if (!val('fd-pays') && r.pays) $('#fd-pays').value = r.pays;
      renderDupes();
    });
  });
  $('#fd-save')?.addEventListener('click', saveDest);

  attachAutoGeocode('fa-search', 'fa-geo-res', r => {
    $('#fa-lat').value = r.lat.toFixed(5);
    $('#fa-lon').value = r.lon.toFixed(5);
    if (!val('fa-adresse') && r.label) $('#fa-adresse').value = r.label;
  });
  $('#fa-geo')?.addEventListener('click', () => {
    const q = val('fa-search') || val('fa-adresse') || val('fa-nom');
    runGeocode(q, $('#fa-geo-res'), r => {
      $('#fa-lat').value = r.lat.toFixed(5);
      $('#fa-lon').value = r.lon.toFixed(5);
      if (!val('fa-adresse') && r.label) $('#fa-adresse').value = r.label;
    });
  });
  $('#fa-save')?.addEventListener('click', saveAct);

  delegate(mount, 'click', '[data-open-dupe]', (e, el) => openDest(el.dataset.openDupe));
  delegate(mount, 'click', '[data-after]', (e, el) => {
    const id = el.dataset.id;
    switch (el.dataset.after) {
      case 'open': openDest(id); break;
      case 'trip': window.createVoyageFromDest && createVoyageFromDest(id); break;
      default: vmGoTo(el.dataset.after, id);
    }
  });

  // Le sélecteur de destination de l'onglet Activité suit le catalogue
  subscribe(() => {
    const sel = $('#fa-dest');
    if (!sel) return;
    const keep = sel.value;
    sel.innerHTML = '<option value="">— choisir une destination —</option>'
      + activeDests().map(d => `<option value="${escAttr(d.id)}">${escHtml(d.emoji + ' ' + d.nom)}</option>`).join('');
    sel.value = keep;
  });
}

Object.assign(window, { initForms: init });
})();
