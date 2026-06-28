// ============================================================
// views/forms.js — ajout de destinations & d'activités
// + détection de doublons + recherche d'adresse + emoji picker
// (chantiers 7 & 8 — classic globals)
// ============================================================
(function () {

const dests = () => window.DESTINATIONS || [];
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const val = id => (document.getElementById(id)?.value || '').trim();

const CATEGORIES = ['activité', 'visite', 'restaurant', 'excursion', 'musée', 'randonnée', 'plage', 'monument', 'point de vue', 'hôtel', 'commerce', 'autre'];
const CAT_TO_TYPE = {
  'visite': 'culture', 'musée': 'culture', 'monument': 'culture', 'activité': 'culture',
  'point de vue': 'detente', 'hôtel': 'detente', 'commerce': 'detente',
  'randonnée': 'randonnee', 'plage': 'plage', 'excursion': 'excursion', 'restaurant': 'restaurant', 'autre': 'culture',
};

// Emoji organisés par catégorie
const EMOJI_GROUPS = [
  { label: 'Voyage', emojis: ['✈️','🚂','🚢','🚗','🛵','🚲','🛺','🏍️','🚌','🛩️'] },
  { label: 'Lieux', emojis: ['🏖️','🏔️','🗺️','🏛️','🏰','⛩️','🕌','🗼','🌋','🏝️','🏜️','🌉','🌃','🎠','🎡'] },
  { label: 'Activités', emojis: ['🎭','🎨','🎶','🎪','🏊','🤿','🧗','🚵','⛷️','🏄','🎯','🎲','🎰','🎳'] },
  { label: 'Resto & Café', emojis: ['🍽️','☕','🍕','🍣','🍜','🥘','🍷','🍺','🧋','🥐','🍦','🥗'] },
  { label: 'Nature', emojis: ['🌿','🌸','🌺','🌴','🌲','🌊','🦋','🐠','🦜','🐘','🦁','🐬'] },
  { label: 'Divers', emojis: ['⭐','💎','🔮','🎁','🛍️','📸','🧭','🗝️','💡','🔭','🧳','🎒'] },
];

function emojiPickerHTML(inputId) {
  return `
    <div class="emoji-picker-wrap">
      <button type="button" class="emoji-trigger btn btn-outline btn-sm" data-emoji-for="${inputId}">😀 Choisir</button>
      <div class="emoji-panel hidden" id="ep-${inputId}">
        ${EMOJI_GROUPS.map(g => `
          <div class="ep-group">
            <div class="ep-group-label">${g.label}</div>
            <div class="ep-emojis">${g.emojis.map(e => `<button type="button" class="ep-btn" data-ep-target="${inputId}" data-ep-val="${e}">${e}</button>`).join('')}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

function shell() {
  return `
    <div class="filtres" style="margin-bottom:16px">
      <button class="filtre-btn active" data-ftab="dest">🗺️ Nouvelle destination</button>
      <button class="filtre-btn" data-ftab="act">📍 Nouvelle activité / lieu</button>
    </div>
    <div id="ftab-dest">${destForm()}</div>
    <div id="ftab-act" style="display:none">${actForm()}</div>`;
}

function field(label, inner) { return `<div class="adv-field" style="flex:1;min-width:160px"><label>${label}</label>${inner}</div>`; }
const input = (id, ph = '', type = 'text') => `<input class="add-item-input" id="${id}" type="${type}" placeholder="${ph}">`;

function destForm() {
  return `<div class="card">
    <h2>🗺️ Ajouter une destination</h2>
    <div class="adv-filter-row" style="gap:12px;align-items:flex-end">
      <div class="adv-field" style="flex:1;min-width:160px">
        <label>Emoji</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input class="add-item-input" id="fd-emoji" value="🧭" style="width:60px;font-size:1.4rem;text-align:center">
          ${emojiPickerHTML('fd-emoji')}
        </div>
      </div>
      ${field('Ville *', input('fd-ville', 'ex : Séville'))}
      ${field('Pays *', input('fd-pays', 'ex : Espagne'))}
      ${field('Région', input('fd-region', 'ex : Andalousie'))}
    </div>

    <div class="adv-filter-row" style="gap:12px;margin-top:10px;align-items:flex-end">
      ${field('Quartier', input('fd-quartier', 'ex : Santa Cruz'))}
      <div class="adv-field" style="flex:2;min-width:240px">
        <label>🔍 Recherche adresse / ville</label>
        <div style="display:flex;gap:6px">
          <input class="add-item-input" id="fd-search" placeholder="ex : Séville Espagne" style="flex:1">
          <button class="btn btn-outline btn-sm" id="fd-geo" style="white-space:nowrap">📍 Rechercher</button>
        </div>
      </div>
      ${field('Latitude', input('fd-lat', '—', 'number'))}
      ${field('Longitude', input('fd-lon', '—', 'number'))}
    </div>
    <div id="fd-geo-res" style="margin-top:8px"></div>
    <div id="fd-dupes" style="margin-top:8px"></div>

    <div class="adv-filter-row" style="gap:12px;margin-top:10px">
      ${field('Période idéale', input('fd-periode', 'ex : avril–juin'))}
      ${field('Durée conseillée', input('fd-duree', 'ex : 3-4 jours'))}
      ${field('Budget min (€)', input('fd-bmin', '800', 'number'))}
      ${field('Budget max (€)', input('fd-bmax', '1200', 'number'))}
      ${field('Climat', input('fd-climat', 'ex : chaud et sec'))}
    </div>
    <div class="adv-field" style="margin-top:10px"><label>Description</label>
      <textarea class="add-item-input" id="fd-desc" rows="2" placeholder="Quelques lignes sur la destination…"></textarea></div>
    <div class="adv-field" style="margin-top:10px"><label>Conseils</label>
      <textarea class="add-item-input" id="fd-conseils" rows="2" placeholder="Astuces, à savoir…"></textarea></div>
    <div style="margin-top:14px"><button class="btn btn-success" id="fd-save">✅ Ajouter la destination</button></div>
    <div id="fd-msg" style="margin-top:10px"></div>
  </div>`;
}

function actForm() {
  const opts = dests().map(d => `<option value="${d.id}">${d.emoji} ${d.nom}</option>`).join('');
  const cats = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  return `<div class="card">
    <h2>📍 Ajouter une activité / un lieu</h2>
    <div class="adv-filter-row" style="gap:12px;align-items:flex-end">
      <div class="adv-field" style="flex:0 0 auto">
        <label>Emoji</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input class="add-item-input" id="fa-emoji" value="📍" style="width:60px;font-size:1.4rem;text-align:center">
          ${emojiPickerHTML('fa-emoji')}
        </div>
      </div>
      ${field('Nom *', input('fa-nom', 'ex : Alcázar de Séville'))}
      ${field('Catégorie', `<select class="valise-select" id="fa-cat">${cats}</select>`)}
      ${field('Rattacher à', `<select class="valise-select" id="fa-dest"><option value="">— aucune —</option>${opts}</select>`)}
    </div>

    <div class="adv-filter-row" style="gap:12px;margin-top:10px;align-items:flex-end">
      <div class="adv-field" style="flex:2;min-width:240px">
        <label>🔍 Recherche adresse</label>
        <div style="display:flex;gap:6px">
          <input class="add-item-input" id="fa-search" placeholder="ex : Alcázar de Séville" style="flex:1">
          <button class="btn btn-outline btn-sm" id="fa-geo" style="white-space:nowrap">📍 Rechercher</button>
        </div>
      </div>
      ${field('Latitude', input('fa-lat', '—', 'number'))}
      ${field('Longitude', input('fa-lon', '—', 'number'))}
    </div>
    <div id="fa-geo-res" style="margin-top:8px"></div>

    <div class="adv-filter-row" style="gap:12px;margin-top:10px">
      ${field('Adresse complète', input('fa-adresse', 'ex : Patio de Banderas, Séville'))}
      ${field('Horaires', input('fa-horaires', 'ex : 9h30–17h'))}
      ${field('Tarif', input('fa-tarif', 'ex : ~13€/pers'))}
    </div>
    <div class="adv-filter-row" style="gap:12px;margin-top:10px">
      ${field('Durée', input('fa-duree', 'ex : 2h'))}
      ${field('Difficulté', `<select class="valise-select" id="fa-diff"><option value="">—</option><option>Facile</option><option>Moyen</option><option>Difficile</option></select>`)}
      ${field('Site internet', input('fa-site', 'https://…'))}
      ${field('Téléphone', input('fa-tel', '+34 …'))}
      <div class="adv-field" style="align-self:flex-end"><label style="display:flex;gap:6px;align-items:center;text-transform:none"><input type="checkbox" id="fa-resa"> Réservation obligatoire</label></div>
    </div>
    <div class="adv-field" style="margin-top:10px"><label>Description / notes</label>
      <textarea class="add-item-input" id="fa-desc" rows="2" placeholder="Description, avis, notes personnelles…"></textarea></div>
    <div style="margin-top:14px"><button class="btn btn-success" id="fa-save">✅ Ajouter l'activité</button></div>
    <div id="fa-msg" style="margin-top:10px"></div>
  </div>`;
}

// ── Emoji picker ─────────────────────────────────────────
function initEmojiPickers(root) {
  root.querySelectorAll('.emoji-trigger').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const panel = document.getElementById('ep-' + btn.dataset.emojiFor);
      if (!panel) return;
      // Ferme les autres
      root.querySelectorAll('.emoji-panel').forEach(p => { if (p !== panel) p.classList.add('hidden'); });
      panel.classList.toggle('hidden');
    });
  });
  root.querySelectorAll('.ep-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const inp = document.getElementById(btn.dataset.epTarget);
      if (inp) inp.value = btn.dataset.epVal;
      const panel = document.getElementById('ep-' + btn.dataset.epTarget);
      if (panel) panel.classList.add('hidden');
    });
  });
  document.addEventListener('click', () => root.querySelectorAll('.emoji-panel').forEach(p => p.classList.add('hidden')), { once: false });
}

// ── Détection de doublons ────────────────────────────────
function findDupes(ville, pays, coords) {
  const n = norm(ville);
  return dests().filter(d => {
    const nameMatch = n.length > 2 && norm(d.nom).includes(n);
    const geoMatch = coords && d.coords && haversine(coords, d.coords) < 25;
    return nameMatch || geoMatch;
  });
}
function renderDupes() {
  const box = document.getElementById('fd-dupes'); if (!box) return;
  const lat = parseFloat(val('fd-lat')), lon = parseFloat(val('fd-lon'));
  const coords = (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : null;
  const dupes = findDupes(val('fd-ville'), val('fd-pays'), coords);
  if (!dupes.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="info-box warning"><strong>⚠️ Destination(s) similaire(s) déjà présente(s) :</strong>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
      ${dupes.map(d => `<button class="mini-btn" data-open="${d.id}">${d.emoji} ${d.nom} — voir la fiche</button>`).join('')}
    </div></div>`;
  box.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { window.openDest && window.openDest(b.dataset.open); }));
}

// ── Géocodage avec dropdown de résultats ────────────────
async function runGeocode(query, resBox, onPick) {
  if (!query) return;
  resBox.innerHTML = `<span style="color:var(--muted);font-size:.8rem">🔍 Recherche en cours…</span>`;
  const { results, error } = await geocode(query);
  if (error) { resBox.innerHTML = `<span style="color:var(--yellow);font-size:.8rem">⚠️ ${error}</span>`; return; }
  if (!results.length) { resBox.innerHTML = `<span style="color:var(--muted);font-size:.8rem">Aucun résultat pour « ${query} ».</span>`; return; }
  resBox.innerHTML = `<div class="geocode-results">
    ${results.map((r, i) => `<button class="geocode-result-btn" data-i="${i}">
      <span class="gr-pin">📍</span>
      <span class="gr-label">${r.label}</span>
      <span class="gr-coords">${r.lat.toFixed(4)}, ${r.lon.toFixed(4)}</span>
    </button>`).join('')}
  </div>`;
  resBox.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => {
    onPick(results[+b.dataset.i]);
    resBox.innerHTML = `<div class="info-box success" style="font-size:.8rem">✓ Coordonnées récupérées : ${results[+b.dataset.i].lat.toFixed(5)}, ${results[+b.dataset.i].lon.toFixed(5)}</div>`;
  }));
}

// Auto-search sur frappe (debounce 600ms)
function attachAutoGeocode(inputId, resBoxId, onPick) {
  let timer;
  document.getElementById(inputId).addEventListener('input', e => {
    clearTimeout(timer);
    const q = e.target.value.trim();
    if (q.length < 3) { document.getElementById(resBoxId).innerHTML = ''; return; }
    timer = setTimeout(() => runGeocode(q, document.getElementById(resBoxId), onPick), 600);
  });
}

function init() {
  const mount = document.getElementById('forms-mount');
  if (!mount) return;
  loadStore();
  mount.innerHTML = shell();

  initEmojiPickers(mount);

  // Onglets
  mount.querySelectorAll('[data-ftab]').forEach(b => b.addEventListener('click', () => {
    mount.querySelectorAll('[data-ftab]').forEach(x => x.classList.toggle('active', x === b));
    document.getElementById('ftab-dest').style.display = b.dataset.ftab === 'dest' ? '' : 'none';
    document.getElementById('ftab-act').style.display = b.dataset.ftab === 'act' ? '' : 'none';
  }));

  // Destination : doublons
  ['fd-ville', 'fd-pays', 'fd-lat', 'fd-lon'].forEach(id => document.getElementById(id).addEventListener('input', renderDupes));

  // Destination : geocode auto sur le champ de recherche
  attachAutoGeocode('fd-search', 'fd-geo-res', r => {
    document.getElementById('fd-lat').value = r.lat.toFixed(5);
    document.getElementById('fd-lon').value = r.lon.toFixed(5);
    if (!val('fd-pays') && r.pays) document.getElementById('fd-pays').value = r.pays;
    // Pré-remplir la ville si vide
    if (!val('fd-ville') && r.label) {
      const parts = r.label.split(',');
      if (parts[0]) document.getElementById('fd-ville').value = parts[0].trim();
    }
    renderDupes();
  });

  // Bouton manuel
  document.getElementById('fd-geo').addEventListener('click', () => {
    const q = val('fd-search') || [val('fd-quartier'), val('fd-ville'), val('fd-pays')].filter(Boolean).join(', ');
    runGeocode(q, document.getElementById('fd-geo-res'), r => {
      document.getElementById('fd-lat').value = r.lat.toFixed(5);
      document.getElementById('fd-lon').value = r.lon.toFixed(5);
      if (!val('fd-pays') && r.pays) document.getElementById('fd-pays').value = r.pays;
      renderDupes();
    });
  });

  document.getElementById('fd-save').addEventListener('click', saveDest);

  // Activité : geocode auto sur champ de recherche
  attachAutoGeocode('fa-search', 'fa-geo-res', r => {
    document.getElementById('fa-lat').value = r.lat.toFixed(5);
    document.getElementById('fa-lon').value = r.lon.toFixed(5);
    if (!val('fa-adresse') && r.label) document.getElementById('fa-adresse').value = r.label;
  });

  document.getElementById('fa-geo').addEventListener('click', () => {
    const q = val('fa-search') || val('fa-adresse') || val('fa-nom');
    runGeocode(q, document.getElementById('fa-geo-res'), r => {
      document.getElementById('fa-lat').value = r.lat.toFixed(5);
      document.getElementById('fa-lon').value = r.lon.toFixed(5);
      if (!val('fa-adresse') && r.label) document.getElementById('fa-adresse').value = r.label;
    });
  });

  document.getElementById('fa-save').addEventListener('click', saveAct);
}

function saveDest() {
  const ville = val('fd-ville'), pays = val('fd-pays');
  const msg = document.getElementById('fd-msg');
  if (!ville || !pays) { msg.innerHTML = `<div class="info-box danger">Ville et pays sont obligatoires.</div>`; return; }
  const lat = parseFloat(val('fd-lat')), lon = parseFloat(val('fd-lon'));
  let id = slug(ville); if (dests().some(d => d.id === id)) id += '-' + Date.now().toString(36).slice(-4);
  const emoji = val('fd-emoji') || '🧭';
  const dest = {
    id, nom: ville, pays, emoji, statut: 'projet',
    region: val('fd-region'), quartier: val('fd-quartier'),
    coords: (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : [46.6, 2.4],
    budget_min: +val('fd-bmin') || 0, budget_max: +val('fd-bmax') || 0,
    dates: '', periode: val('fd-periode'), duree_conseillee: val('fd-duree'),
    climat: val('fd-climat'), description: val('fd-desc'), conseils_perso: val('fd-conseils'),
    type: [], pois: [], gastronomie: [], liens: [], custom: true,
  };
  addUserDestination(dest);
  msg.innerHTML = `<div class="info-box success">✅ « ${emoji} ${ville} » ajoutée au catalogue.
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <button class="mini-btn" id="fd-open">Voir la fiche</button>
      <button class="mini-btn" id="fd-trip">🧳 Créer un voyage</button>
      <button class="mini-btn" id="fd-transport">🚗 Transport</button>
      <button class="mini-btn" id="fd-prog">🧠 Programme</button>
    </div>
  </div>`;
  document.getElementById('fd-open').addEventListener('click', () => window.openDest && window.openDest(id));
  document.getElementById('fd-trip').addEventListener('click', () => window.vmCreateTrip && window.vmCreateTrip(id));
  document.getElementById('fd-transport').addEventListener('click', () => { window.showPage('transport'); setTimeout(() => window.transportSelect && window.transportSelect(id), 80); });
  document.getElementById('fd-prog').addEventListener('click', () => { window.showPage('programmes'); setTimeout(() => window.programsSelect && window.programsSelect(id), 80); });
  window.showToast && window.showToast('🗺️ Destination ajoutée !');
  renderDupes();
}

function saveAct() {
  const nom = val('fa-nom');
  const msg = document.getElementById('fa-msg');
  if (!nom) { msg.innerHTML = `<div class="info-box danger">Le nom est obligatoire.</div>`; return; }
  const lat = parseFloat(val('fa-lat')), lon = parseFloat(val('fa-lon'));
  const coords = (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : null;
  const cat = val('fa-cat') || 'activité';
  const emoji = val('fa-emoji') || '📍';
  const act = {
    id: 'a' + Date.now().toString(36), nom: `${emoji} ${nom}`, categorie: cat, type: CAT_TO_TYPE[cat] || 'culture',
    destinationId: val('fa-dest') || null, adresse: val('fa-adresse') || val('fa-search'), coords,
    horaires: val('fa-horaires'), prix: val('fa-tarif'), duree: val('fa-duree'),
    difficulte: val('fa-diff'), site: val('fa-site'), tel: val('fa-tel'),
    reservation: document.getElementById('fa-resa').checked, description: val('fa-desc'),
  };
  addUserActivity(act);
  const dId = val('fa-dest');
  if (dId) {
    const d = dests().find(x => x.id === dId);
    if (d) {
      (d.pois = d.pois || []).push({
        nom: act.nom, type: act.type, coords: coords || d.coords, prix: act.prix,
        horaires: act.horaires, site: act.site, lien: act.site, tel: act.tel,
      });
    }
  }
  msg.innerHTML = `<div class="info-box success">✅ « ${emoji} ${nom} » ajoutée${dId ? ' et rattachée à la destination' : ' au catalogue d\'activités'}.
    ${dId ? `<div style="margin-top:8px"><button class="mini-btn" id="fa-see-dest">Voir la destination</button></div>` : ''}
  </div>`;
  if (dId) document.getElementById('fa-see-dest').addEventListener('click', () => window.openDest && window.openDest(dId));
  window.showToast && window.showToast('📍 Activité ajoutée !');
  ['fa-nom', 'fa-search', 'fa-adresse', 'fa-lat', 'fa-lon', 'fa-horaires', 'fa-tarif', 'fa-duree', 'fa-site', 'fa-tel', 'fa-desc'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  document.getElementById('fa-emoji').value = '📍';
  document.getElementById('fa-geo-res').innerHTML = '';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
