// ============================================================
// views/destModal.js — fiche destination (modale à onglets)
// Onglets ARIA conformes, navigation clavier, contenu 100% échappé.
// L'onglet Programme s'appuie désormais sur le générateur réel
// (services/programs.js) au lieu d'un cas particulier codé en dur.
// ============================================================
(function () {

let currentDest = null;

const TABS = [
  { key: 'infos', label: '📋 Infos' },
  { key: 'pratique', label: '🧾 Pratique' },
  { key: 'programme', label: '📅 Programme' },
  { key: 'pois', label: '📍 Lieux' },
  { key: 'routard', label: '🧭 Routard' },
  { key: 'gastronomie', label: '🍽️ Gastronomie' },
  { key: 'argent', label: '💱 Argent' },
  { key: 'reserver', label: '🔍 Réserver' },
];

// ── Blocs réutilisables ──────────────────────────────────
function ficheList(title, items, tone) {
  if (!items || !items.length) return '';
  return `<section class="fiche-block">
    <h3 class="section-title">${escHtml(title)}</h3>
    <ul class="dot-list dot-${tone || 'accent'}">
      ${items.map(t => `<li>${escHtml(typeof t === 'string' ? t : (t.text || ''))}</li>`).join('')}
    </ul>
  </section>`;
}

function poiBookingUrl(p, dest) {
  const direct = safeUrl(p.lien) || safeUrl(p.site);
  if (direct) return direct;
  return 'https://www.getyourguide.fr/s/?q=' + escUrl((p.nom || '') + ' ' + (dest ? shortName(dest) : ''));
}
function restoBookingUrl(r, dest) {
  const direct = safeUrl(r.site);
  if (direct) return direct;
  return 'https://www.google.com/search?q=' + escUrl('réserver ' + (r.nom || '') + ' ' + (dest ? shortName(dest) : ''));
}

// ── Météo réelle ─────────────────────────────────────────
async function renderWeather(d) {
  const box = document.getElementById('dest-weather');
  if (!box || !d.coords) return;
  const trip = getTripByDestination(d.id);
  const depart = (trip && trip.date_depart) || d.date_depart;
  const soon = depart && (new Date(depart) - new Date()) < 7 * 86400000 && new Date(depart) >= new Date(todayISO());

  if (soon || !depart) {
    const f = await getForecast(d.coords);
    if (!f.available) { box.innerHTML = `<p class="hint">${escHtml(f.error || 'Météo indisponible.')}</p>`; return; }
    box.innerHTML = `<div class="meteo-row">${f.days.map(day => {
      const [ico, lbl] = wmoMeta(day.code);
      const dt = new Date(day.date + 'T12:00:00');
      return `<div class="meteo-item" title="${escAttr(lbl)}">
        <div class="meteo-day">${escHtml(dt.toLocaleDateString('fr-FR', { weekday: 'short' }))}</div>
        <div class="meteo-ico" aria-hidden="true">${ico}</div>
        <div class="meteo-val">${day.tmax}°</div>
        <div class="meteo-lbl">${day.tmin}° · ${day.rain ?? 0}% 💧</div>
      </div>`;
    }).join('')}</div>
    <p class="source-note">Prévisions à 7 jours · source Open-Meteo</p>`;
    return;
  }

  const month = +depart.slice(5, 7);
  const c = await getClimate(d.coords, month);
  if (!c.available) { box.innerHTML = `<p class="hint">Normales saisonnières indisponibles.</p>`; return; }
  box.innerHTML = `<div class="meteo-row">
      <div class="meteo-item"><div class="meteo-val">${c.tmax}°</div><div class="meteo-lbl">Max moyen</div></div>
      <div class="meteo-item"><div class="meteo-val">${c.tmin}°</div><div class="meteo-lbl">Min moyen</div></div>
      <div class="meteo-item"><div class="meteo-val">${c.rainRatio}%</div><div class="meteo-lbl">Jours de pluie</div></div>
    </div>
    <p class="source-note">Normales de ${escHtml(FR_MONTH_NAMES[month - 1])} · moyenne ${escHtml(c.years)} · source Open-Meteo</p>`;
}

// ── Onglet Pratique ──────────────────────────────────────
function renderPratique(d) {
  const c = countryInfo(d.pays);
  const trip = getTripByDestination(d.id);
  const fact = (label, value, hint) => value
    ? `<div class="fact"><dt>${escHtml(label)}</dt><dd>${escHtml(value)}${hint ? ` <span class="hint">${escHtml(hint)}</span>` : ''}</dd></div>` : '';

  $('#tab-pratique').innerHTML = `
    ${seasonStripHTML(d)}
    ${trip && trip.date_depart ? seasonVerdictHTML(d, trip.date_depart, trip.date_retour || trip.date_depart) : ''}

    <h3 class="section-title">🧾 Informations pratiques</h3>
    <dl class="fact-grid">
      ${fact('Pays', d.pays)}
      ${fact('Région', d.region)}
      ${fact('Langue', d.langue || c.langue)}
      ${fact('Monnaie', currencyLabel(c.devise), c.euro ? 'zone euro' : 'conversion nécessaire')}
      ${fact('Fuseau horaire', d.fuseau || c.fuseau)}
      ${fact('Durée conseillée', d.duree_conseillee)}
      ${fact('Meilleure période', bestMonthsLabel(d))}
      ${fact('À éviter', d.periode_eviter)}
      ${fact('Conduite', c.conduite === 'gauche' ? 'À gauche ⚠️' : 'À droite')}
      ${fact('Prises électriques', 'Type ' + c.prise, c.prise === 'G' || c.prise === 'J' || c.prise === 'A/B' ? 'adaptateur nécessaire' : 'compatible France')}
      ${fact('Union européenne', c.eu ? 'Oui' : 'Non', c.eu ? 'CEAM valable' : 'assurance voyage conseillée')}
      ${fact('Espace Schengen', c.schengen ? 'Oui' : 'Non')}
      ${fact('Formalités', c.visa ? String(c.visa) : (c.eu ? 'Carte d\'identité suffisante' : 'Passeport'))}
      ${fact('Urgences', c.urgence)}
    </dl>
    ${c.alerte ? `<div class="info-box danger"><strong>⚠️ ${escHtml(c.alerte)}</strong></div>` : ''}

    ${d.transport_local ? `<h3 class="section-title">🚇 Se déplacer sur place</h3>
      <p class="fiche-text">${escHtml(d.transport_local)}</p>` : ''}
    ${d.vol ? `<h3 class="section-title">✈️ S'y rendre</h3>
      <p class="fiche-text">${escHtml(d.vol)}${d.vol_prix ? ` — <span class="txt-green">${escHtml(d.vol_prix)}</span>` : ''}</p>` : ''}

    ${ficheList('📌 Bon à savoir', d.a_savoir)}
    ${ficheList('⚠️ Risques & vigilance', d.risques, 'red')}
    ${ficheList('💡 Bons plans', d.bons_plans, 'green')}
    ${ficheList('🏨 Où loger', d.logements)}

    ${d.urgences && d.urgences.length ? `<section class="fiche-block">
      <h3 class="section-title">🚨 Numéros d'urgence</h3>
      <div class="grid grid-2 gap-xs">${d.urgences.map(u => `
        <div class="card card-sm">
          <div class="urg-service">${escHtml(u.service)}</div>
          <a class="urg-tel" href="tel:${escAttr(String(u.tel).replace(/\s/g, ''))}">${escHtml(u.tel)}</a>
        </div>`).join('')}</div>
    </section>` : ''}

    ${d.liens && d.liens.length ? `<section class="fiche-block">
      <h3 class="section-title">🔗 Liens utiles</h3>
      <div class="liens-grid">${d.liens.map(l => {
        const u = safeUrl(l.url);
        return u ? `<a class="lien-btn" href="${u}" target="_blank" rel="noopener noreferrer">${escHtml(l.label)}</a>` : '';
      }).join('')}</div>
    </section>` : ''}`;
}

// ── Onglet Argent ────────────────────────────────────────
function renderArgent(d) {
  $('#tab-argent').innerHTML = `
    <h3 class="section-title">💱 Monnaie et paiements</h3>
    ${moneySectionHTML(d)}`;
  fillMoneyRate(d);
}

// ── Onglets ──────────────────────────────────────────────
function showTab(key) {
  TABS.forEach(t => {
    const panel = document.getElementById('tab-' + t.key);
    const btn = document.getElementById('tabbtn-' + t.key);
    const on = t.key === key;
    if (panel) { panel.classList.toggle('active', on); panel.hidden = !on; }
    if (btn) {
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
    }
  });
}

function onTabKeydown(e) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(e.key)) return;
  e.preventDefault();
  const i = TABS.findIndex(t => document.getElementById('tabbtn-' + t.key)?.getAttribute('aria-selected') === 'true');
  let next = i;
  if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
  if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
  if (e.key === 'Home') next = 0;
  if (e.key === 'End') next = TABS.length - 1;
  showTab(TABS[next].key);
  document.getElementById('tabbtn-' + TABS[next].key)?.focus();
}

// ── Ouverture de la fiche ────────────────────────────────
function openDest(id) {
  const d = destById(id);
  if (!d) return;
  currentDest = d;
  window.currentDest = d;

  const s = statutMeta(d.statut);
  $('#modal-emoji').textContent = d.emoji || '🧭';
  $('#modal-title').textContent = d.nom;
  $('#modal-subtitle').innerHTML =
    `<span class="badge badge-${escAttr(s.cls)}">${escHtml(s.label)}</span> `
    + `<span class="muted-inline">${escHtml(d.pays)}${d.dates ? ' · ' + escHtml(d.dates) : ''}</span>`;

  renderInfos(d);
  renderPratique(d);
  renderProgramme(d);
  renderPois(d);
  renderRoutard(d);
  renderGastro(d);
  renderArgent(d);
  renderReserver(d);

  syncModalButtons();
  showTab('infos');
  openOverlay('#modal-overlay');

  // Données distantes : chargées après affichage pour ne pas retarder l'ouverture
  renderWeather(d);
}

function closeDestModal() { closeOverlay('#modal-overlay'); }

// ── Onglet Infos ─────────────────────────────────────────
function renderInfos(d) {
  const trip = getTripByDestination(d.id);
  const editable = d.custom && (d.scope !== 'global' || isAdmin());
  $('#tab-infos').innerHTML = `
    <div class="cat-select-row">
      <label for="dest-statut-select">🗂️ Catégorie</label>
      <select class="cat-select" id="dest-statut-select" data-set-statut="${escAttr(d.id)}">
        ${Object.keys(window.STATUT_CONFIG || {}).map(k =>
          `<option value="${escAttr(k)}"${d.statut === k ? ' selected' : ''}>${escHtml(STATUT_CONFIG[k].label)}</option>`).join('')}
        <option value="aucun">➖ Retirer du suivi (archiver)</option>
      </select>
      <button type="button" class="btn btn-primary btn-sm push-right" data-open-or-create="${escAttr(d.id)}">
        ${trip ? '🧭 Préparation &amp; suivi' : '➕ Créer le voyage'}
      </button>
    </div>

    ${d.description ? `<div class="info-box"><strong>${escHtml(d.description)}</strong></div>` : ''}

    <div class="grid grid-2 gap-sm">
      <div class="card card-sm">
        <h3>✈️ Transport</h3>
        <p class="stack-tight">${escHtml(d.vol || '—')}</p>
        ${d.vol_prix ? `<p class="txt-green">${escHtml(d.vol_prix)}</p>` : ''}
        ${d.compagnie ? `<p class="hint">${escHtml(d.compagnie)}</p>` : ''}
      </div>
      <div class="card card-sm">
        <h3>🏨 Hébergement</h3>
        <p>${trip && trip.hebergement && trip.hebergement.nom
          ? escHtml(trip.hebergement.nom)
          : 'À choisir depuis la préparation du voyage'}</p>
      </div>
    </div>

    <section class="fiche-block">${seasonStripHTML(d, { compact: true })}</section>

    <section class="fiche-block">
      <h3 class="section-title">🌡️ Météo</h3>
      <div id="dest-weather"><p class="hint">Chargement…</p></div>
    </section>

    ${d.budget_min ? `<section class="fiche-block">
      <h3 class="section-title">💶 Budget estimé</h3>
      <p class="big-figure">${escHtml(d.budget_min)}€ – ${escHtml(d.budget_max)}€
        <span class="hint">pour ${escHtml((trip && trip.travelers) || (window.pref && pref('travelers')) || 2)} personnes</span></p>
      ${usesEuro(d.pays) ? '' : `<p class="hint">💱 Monnaie locale : ${escHtml(currencyLabel(currencyOf(d.pays)))}
        — <button type="button" class="link-btn" data-open-converter="${escAttr(d.pays)}">convertir</button></p>`}
    </section>` : ''}

    ${ficheList('💡 Bons plans', d.bons_plans, 'green')}

    <div class="btn-row">
      <button type="button" class="btn btn-success btn-sm" data-open-or-create="${escAttr(d.id)}">🧳 ${trip ? 'Ouvrir' : 'Créer'} le voyage</button>
      <button type="button" class="btn btn-outline btn-sm" data-dest-goto="carte" data-dest-id="${escAttr(d.id)}">📍 Sur la carte</button>
      <button type="button" class="btn btn-outline btn-sm" data-dest-goto="transport" data-dest-id="${escAttr(d.id)}">🚆 Transport</button>
      <button type="button" class="btn btn-outline btn-sm" data-dest-goto="programmes" data-dest-id="${escAttr(d.id)}">🧠 Programme</button>
      <button type="button" class="btn btn-outline btn-sm" data-dest-goto="recherche" data-dest-id="${escAttr(d.id)}">🔍 Réserver</button>
      <button type="button" class="btn btn-outline btn-sm" data-rt-quick="${escAttr(d.id)}">🚗 Road trip</button>
      <a class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" href="${safeUrl(routardUrl(d))}">🧭 Guide du Routard</a>
      ${editable ? `<button type="button" class="btn btn-outline btn-sm" data-edit-dest="${escAttr(d.id)}">✏️ Modifier</button>
      <button type="button" class="btn btn-danger btn-sm" data-del-dest="${escAttr(d.id)}">🗑️ Supprimer</button>` : ''}
    </div>`;
}

// ── Onglet Programme (générateur réel) ───────────────────
function renderProgramme(d) {
  const box = $('#tab-programme');
  const trip = getTripByDestination(d.id);
  const ag = trip && getAgenda(trip.id);

  if (ag && (ag.blocks || []).length) {
    const byDay = {};
    ag.blocks.forEach(b => { (byDay[b.day] = byDay[b.day] || []).push(b); });
    box.innerHTML = `<p class="hint">Programme construit dans l'agenda de ce voyage.</p>
      <div class="prog-days">${Object.keys(byDay).sort().map((iso, i) => {
        const blocks = byDay[iso].sort((a, b) => a.start - b.start);
        return `<div class="card card-sm">
          <h3>Jour ${i + 1} <span class="hint">${escHtml(iso)}</span></h3>
          ${blocks.map(b => `<div class="prog-line">
            <span class="prog-time">${escHtml(fmtMin(b.start))}–${escHtml(fmtMin(b.start + b.dur))}</span>
            <span>${escHtml((b.emoji || '') + ' ' + b.label)}</span></div>`).join('')}
        </div>`;
      }).join('')}</div>
      <div class="btn-row"><button type="button" class="btn btn-outline btn-sm" data-dest-goto="agenda" data-dest-id="${escAttr(d.id)}">📆 Ouvrir l'agenda</button></div>`;
    return;
  }

  const canGenerate = (d.pois && d.pois.length) || (d.routard && d.routard.incontournables);
  box.innerHTML = `
    <p class="hint">Aucun programme pour cette destination. Génère une proposition à partir de ses lieux,
      puis ajuste-la dans l'agenda.</p>
    <div class="prog-gen-row">
      <div class="adv-field">
        <label for="dm-prog-days">Durée</label>
        <select class="valise-select" id="dm-prog-days">
          ${(window.DURATIONS || [3, 5, 7, 10]).map(n => `<option value="${n}"${n === 5 ? ' selected' : ''}>${n} jours</option>`).join('')}
        </select>
      </div>
      <div class="adv-field">
        <label for="dm-prog-theme">Thème</label>
        <select class="valise-select" id="dm-prog-theme">
          ${(window.THEMES || []).map(t => `<option value="${escAttr(t.key)}">${escHtml(t.label)}</option>`).join('')}
        </select>
      </div>
      <button type="button" class="btn btn-success btn-sm" data-gen-prog="${escAttr(d.id)}"
        ${canGenerate ? '' : 'disabled title="Ajoute d\'abord des lieux à cette destination"'}>✨ Générer</button>
    </div>
    <div id="dm-prog-preview"></div>`;
}

const fmtMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function generateProgramPreview(destId) {
  const d = destById(destId);
  if (!d || !window.generateProgram) return;
  const days = +($('#dm-prog-days')?.value) || 5;
  const theme = $('#dm-prog-theme')?.value || 'culture';
  const p = generateProgram(d, days, theme);
  const byDay = {};
  p.blocks.forEach(b => { (byDay[b.d] = byDay[b.d] || []).push(b); });
  $('#dm-prog-preview').innerHTML = `
    <div class="info-box success">Proposition ${escHtml(days)} jours générée. Charge-la dans l'agenda pour l'ajuster.</div>
    <div class="prog-days">${Object.keys(byDay).map(Number).sort((a, b) => a - b).map(i => `
      <div class="card card-sm">
        <h3>Jour ${i + 1}</h3>
        ${byDay[i].sort((a, b) => (a.h * 60 + a.m) - (b.h * 60 + b.m)).map(b => `
          <div class="prog-line">
            <span class="prog-time">${escHtml(fmtMin(b.h * 60 + b.m))}</span>
            <span>${escHtml((b.emoji || '') + ' ' + b.label)}</span>
          </div>`).join('')}
      </div>`).join('')}</div>
    <div class="btn-row">
      <button type="button" class="btn btn-primary btn-sm" data-dest-goto="programmes" data-dest-id="${escAttr(destId)}">📆 Ouvrir dans Programmes &amp; charger</button>
    </div>`;
}

// ── Onglet Lieux ─────────────────────────────────────────
function renderPois(d) {
  const box = $('#tab-pois');
  if (!d.pois || !d.pois.length) {
    box.innerHTML = `<p class="hint">Pas encore de lieux renseignés.
      <button type="button" class="btn btn-outline btn-sm" data-add-place>➕ Ajouter un lieu</button></p>`;
    return;
  }
  box.innerHTML = `<div class="poi-grid">${d.pois.map(p => `
    <div class="poi-card">
      <div class="poi-type">${escHtml((window.TYPE_ICONS && TYPE_ICONS[p.type]) || '📍')} ${escHtml(p.type || '')}</div>
      <h4>${escHtml(p.nom)}</h4>
      ${p.prix ? `<div class="poi-prix">${escHtml(p.prix)}</div>` : ''}
      ${p.horaires ? `<div class="hours-badge">🕐 ${escHtml(p.horaires)}</div>` : ''}
      <div class="detail-actions">
        <a class="mini-btn" href="${poiBookingUrl(p, d)}" target="_blank" rel="noopener noreferrer">🎟️ Réserver</a>
        ${p.tel ? `<a class="mini-btn tel" href="tel:${escAttr(String(p.tel).replace(/\s/g, ''))}">📞 ${escHtml(p.tel)}</a>` : ''}
        <a class="mini-btn" href="${escAttr(mapsLink(p, d))}" target="_blank" rel="noopener noreferrer">🗺️ Itinéraire</a>
      </div>
    </div>`).join('')}</div>`;
}

// ── Onglet Routard ───────────────────────────────────────
function renderRoutard(d) {
  const box = $('#tab-routard');
  if (!hasRoutard(d)) {
    box.innerHTML = `<p class="hint">Pas encore d'informations Routard synthétisées pour cette destination.</p>
      <a class="lien-btn" href="${safeUrl(routardUrl(d))}" target="_blank" rel="noopener noreferrer">Chercher sur routard.com</a>`;
    return;
  }
  const r = d.routard;
  box.innerHTML = `
    <div class="info-box warning"><strong>🧭 Sélection du Guide du Routard</strong><br>${escHtml(r.resume || '')}</div>
    ${r.incontournables && r.incontournables.length ? `
      <h3 class="section-title">⭐ Les incontournables</h3>
      <ul class="dot-list dot-yellow">${r.incontournables.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>` : ''}
    ${r.conseils && r.conseils.length ? `
      <h3 class="section-title">💡 Conseils pratiques</h3>
      <ul class="dot-list dot-accent">${r.conseils.map(c => `<li>${escHtml(c)}</li>`).join('')}</ul>` : ''}
    ${safeUrl(r.url) ? `<a class="lien-btn" href="${safeUrl(r.url)}" target="_blank" rel="noopener noreferrer">Ouvrir la fiche Routard complète</a>` : ''}
    <p class="source-note">Source : Guide du Routard (routard.com) — extraits synthétisés.</p>`;
}

// ── Onglet Gastronomie ───────────────────────────────────
function renderGastro(d) {
  const box = $('#tab-gastronomie');
  const gastro = d.gastronomie || [];
  const restos = d.restaurants || [];
  if (!gastro.length && !restos.length) {
    box.innerHTML = '<p class="hint">Pas encore d\'informations gastronomiques pour cette destination.</p>';
    return;
  }
  box.innerHTML = `
    ${gastro.length ? `<section class="fiche-block">
      <h3 class="section-title">🍴 À absolument goûter</h3>
      <div class="chip-row">${gastro.map(g => `<span class="chip">🍽️ ${escHtml(g)}</span>`).join('')}</div>
    </section>` : ''}
    ${restos.length ? `
      <h3 class="section-title">⭐ Restaurants repérés</h3>
      <div class="grid grid-2 gap-xs">${restos.map(r => `
        <div class="card card-sm">
          <div class="resto-nom">${escHtml(r.nom)}</div>
          ${r.note ? `<div class="txt-yellow">${escHtml(r.note)}</div>` : ''}
          ${r.type ? `<div class="hint">${escHtml(r.type)}</div>` : ''}
          ${r.prix ? `<div class="txt-green">${escHtml(r.prix)}</div>` : ''}
          ${r.horaires ? `<div class="hours-badge">🕐 ${escHtml(r.horaires)}</div>` : ''}
          <div class="detail-actions">
            <a class="mini-btn" href="${restoBookingUrl(r, d)}" target="_blank" rel="noopener noreferrer">🍽️ Réserver</a>
            ${r.tel ? `<a class="mini-btn tel" href="tel:${escAttr(String(r.tel).replace(/\s/g, ''))}">📞 ${escHtml(r.tel)}</a>` : ''}
            <a class="mini-btn" href="${escAttr(mapsLink(r, d))}" target="_blank" rel="noopener noreferrer">🗺️ Carte</a>
          </div>
        </div>`).join('')}</div>` : ''}
    <div class="info-box"><strong>💡 Astuce :</strong> sur Google Maps, cherche
      « restaurants locaux ${escHtml(shortName(d))} » et filtre au-dessus de 4,5 pour éviter les attrape-touristes.</div>`;
}

// ── Onglet Réserver ──────────────────────────────────────
function renderReserver(d) {
  const trip = getTripByDestination(d.id);
  const ctx = bookingContext({ dest: d, trip });
  const p = getPrefs();

  const card = (title, subtitle, items) => `
    <div class="search-card">
      <h3>${title}</h3>
      <p>${escHtml(subtitle)}</p>
      <div class="search-links">${bookingLinksHTML(items, ctx)}</div>
    </div>`;

  const bandeau = ctx.hasDates
    ? `<div class="info-box success">📅 Recherches pré-remplies : <strong>${escHtml(ctx.checkin)} → ${escHtml(ctx.checkout)}</strong>,
        <strong>${escHtml(ctx.travelers)} voyageur(s)</strong>, ${escHtml(ctx.rooms)} chambre(s).
        Ces dates viennent du voyage — les modifier là-bas met tous les liens à jour.</div>`
    : `<div class="info-box warning">📅 Aucune date définie : les liens ouvrent la recherche sans période.
        ${trip ? '<button type="button" class="link-btn" data-open-trip-dates="' + escAttr(trip.id) + '">Renseigner les dates du voyage</button>'
               : '<button type="button" class="link-btn" data-open-or-create="' + escAttr(d.id) + '">Créer le voyage pour fixer les dates</button>'}</div>`;

  $('#tab-reserver').innerHTML = `
    ${bandeau}
    <div class="search-grid">
      ${card('✈️ Vols', `Depuis ${p.departIata} — ${p.departCity}`, flightLinks({ dest: d, trip }))}
      ${card('🏨 Hébergement', `${ctx.travelers} voyageur(s), ${ctx.rooms} chambre(s)`, lodgingLinks({ dest: d, trip }))}
      ${card('🚆 Train, bus, voiture', 'Trajets terrestres et location', groundLinks({ dest: d, trip }))}
      ${card('🎭 Activités & restaurants', 'Billetterie et avis', activityLinks({ dest: d, trip }))}
    </div>
    <p class="source-note">Les badges <span class="bk-tag">dates</span> et <span class="bk-tag">pers.</span> indiquent
      les plateformes qui acceptent réellement ces paramètres dans l'URL. Les autres ouvrent une recherche simple —
      aucun faux paramètre n'est fabriqué.<br>
      Ville de départ et nombre de voyageurs par défaut viennent de tes
      <button type="button" class="link-btn" data-dest-goto="reglages">réglages</button>.</p>`;
}

// ── Boutons d'en-tête ────────────────────────────────────
function syncModalButtons() {
  if (!currentDest) return;
  const pinned = isPinned(currentDest.id);
  const archived = isArchived(currentDest.id);
  const pinBtn = $('#modal-pin-btn');
  const arcBtn = $('#modal-archive-btn');
  if (pinBtn) {
    pinBtn.classList.toggle('active', pinned);
    pinBtn.setAttribute('aria-pressed', pinned ? 'true' : 'false');
    const l = pinned ? 'Retirer de la une' : 'Mettre à la une';
    pinBtn.title = l; pinBtn.setAttribute('aria-label', l);
  }
  if (arcBtn) {
    arcBtn.classList.toggle('active', archived);
    arcBtn.textContent = archived ? '📤' : '🗄️';
    const l = archived ? 'Désarchiver ce voyage' : 'Archiver ce voyage';
    arcBtn.title = l; arcBtn.setAttribute('aria-label', l);
  }
}

// ── Changement de catégorie ──────────────────────────────
function setDestStatut(id, statut) {
  const d = destById(id);
  if (!d) return;
  if (statut === 'aucun') {
    archiveDest(id);
    closeDestModal();
    pushUndo('Voyage archivé', () => { unarchiveDest(id); refreshAll(); });
    refreshAll();
    return;
  }
  if (!(window.STATUT_CONFIG && STATUT_CONFIG[statut])) return;
  unarchiveDest(id);
  setDestStatutRaw(id, statut);

  let trip = getTripByDestination(id);
  if (!trip && (statut === 'confirme' || statut === 'planification')) {
    trip = addTrip(tripFromDestination(d));
    adoptLegacyForTrip(trip);
  }
  if (trip) updateTrip(trip.id, { status: CATALOG_TO_TRIP_STATUS[statut] || 'idee' });

  refreshAll();
  if (currentDest && currentDest.id === id) {
    const s = statutMeta(statut);
    $('#modal-subtitle').innerHTML =
      `<span class="badge badge-${escAttr(s.cls)}">${escHtml(s.label)}</span> `
      + `<span class="muted-inline">${escHtml(d.pays)}${d.dates ? ' · ' + escHtml(d.dates) : ''}</span>`;
  }
  showToast('🗂️ ' + statutMeta(statut).label);
}

function refreshAll() {
  ['buildPinned', 'buildDashboard', 'buildBudget', 'renderDestGrid', 'buildArchives']
    .forEach(fn => { try { window[fn] && window[fn](); } catch { /* vue absente */ } });
}

// ── Édition / suppression d'une destination ajoutée ──────
function editDestination(id) {
  const d = destById(id);
  if (!d || !d.custom) return;
  if (d.scope === 'global' && !isAdmin()) { showToast('🔒 Destination commune : modification réservée à l\'administrateur'); return; }
  const ov = ensureOverlay('edit-dest-overlay', 'ed-title');
  ov.innerHTML = `
    <div class="modal modal-narrow" role="document">
      <div class="modal-header">
        <span class="modal-emoji" aria-hidden="true">✏️</span>
        <div class="modal-title"><h2 id="ed-title">Modifier la destination</h2></div>
        <button type="button" class="modal-close" data-close aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <div class="adv-field"><label for="ed-nom">Nom</label>
          <input class="add-item-input" id="ed-nom" value="${escAttr(d.nom)}"></div>
        <div class="adv-field"><label for="ed-pays">Pays</label>
          <input class="add-item-input" id="ed-pays" value="${escAttr(d.pays || '')}"></div>
        <div class="adv-filter-row gap-sm">
          <div class="adv-field"><label for="ed-emoji">Emoji</label>
            <input class="add-item-input" id="ed-emoji" value="${escAttr(d.emoji || '🧭')}"></div>
          <div class="adv-field"><label for="ed-bmin">Budget min (€)</label>
            <input class="add-item-input" type="number" id="ed-bmin" value="${escAttr(d.budget_min || 0)}"></div>
          <div class="adv-field"><label for="ed-bmax">Budget max (€)</label>
            <input class="add-item-input" type="number" id="ed-bmax" value="${escAttr(d.budget_max || 0)}"></div>
        </div>
        <div class="adv-field"><label for="ed-desc">Description</label>
          <textarea class="add-item-input" id="ed-desc" rows="3">${escHtml(d.description || '')}</textarea></div>
        <div class="dlg-actions">
          <button type="button" class="btn btn-success" data-save-dest="${escAttr(id)}">💾 Enregistrer</button>
          <button type="button" class="btn btn-outline" data-close>Annuler</button>
        </div>
      </div>
    </div>`;
  $$('[data-close]', ov).forEach(b => b.addEventListener('click', () => closeOverlay(ov)));
  ov.querySelector('[data-save-dest]').addEventListener('click', () => saveEditDestination(id, ov));
  openOverlay(ov);
}

function saveEditDestination(id, ov) {
  const g = x => (document.getElementById(x) || {}).value || '';
  const patch = {
    nom: g('ed-nom').trim() || 'Sans nom',
    pays: g('ed-pays').trim(),
    emoji: g('ed-emoji').trim() || '🧭',
    budget_min: +g('ed-bmin') || 0,
    budget_max: +g('ed-bmax') || 0,
    description: g('ed-desc').trim(),
  };
  const d0 = destById(id);
  if (d0 && d0.scope === 'global') {
    Object.assign(d0, patch);
    const gd = getGlobalDests();
    const gi = gd.findIndex(x => x.id === id);
    if (gi >= 0) { Object.assign(gd[gi], patch); setGlobalDests(gd); }
  } else {
    updateUserDestination(id, patch);
  }
  closeOverlay(ov);
  refreshAll();
  openDest(id);
  logHistory('destination modifiée', patch.nom);
  showToast('✅ Destination modifiée');
}

async function deleteDestination(id) {
  const d = destById(id);
  if (!d) return;
  if (!d.custom) { showToast('Seules les destinations ajoutées peuvent être supprimées'); return; }
  if (d.scope === 'global' && !isAdmin()) { showToast('🔒 Destination commune : suppression réservée à l\'administrateur'); return; }
  const ok = await vmConfirm({
    title: `Supprimer « ${d.nom} » ?`,
    message: 'La destination et le voyage associé seront supprimés du catalogue.',
    confirmLabel: 'Supprimer', danger: true,
  });
  if (!ok) return;
  const snapshot = JSON.parse(JSON.stringify(d));
  const wasGlobal = d.scope === 'global';
  if (wasGlobal) setGlobalDests(getGlobalDests().filter(x => x.id !== id));
  removeUserDestination(id);
  closeDestModal();
  refreshAll();
  pushUndo(`Destination « ${d.nom} » supprimée`, () => {
    if (wasGlobal) { const gd = getGlobalDests(); gd.push(snapshot); setGlobalDests(gd); window.DESTINATIONS.push(snapshot); }
    else addUserDestination(snapshot);
    refreshAll();
  });
  logHistory('destination supprimée', d.nom);
}

// ── Câblage ──────────────────────────────────────────────
function init() {
  const ov = $('#modal-overlay');
  if (!ov) return;

  const tabs = $('#modal-tabs');
  if (tabs) {
    tabs.innerHTML = TABS.map((t, i) => `
      <button type="button" class="modal-tab${i === 0 ? ' active' : ''}" role="tab"
              id="tabbtn-${t.key}" aria-controls="tab-${t.key}"
              aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? 0 : -1}">${t.label}</button>`).join('');
    delegate(tabs, 'click', '.modal-tab', (e, el) => showTab(el.id.replace('tabbtn-', '')));
    tabs.addEventListener('keydown', onTabKeydown);
  }

  $('#modal-close-btn')?.addEventListener('click', closeDestModal);
  $('#modal-pin-btn')?.addEventListener('click', () => {
    if (!currentDest) return;
    if (isPinned(currentDest.id)) unpinDest(currentDest.id); else pinDest(currentDest.id);
    syncModalButtons();
    window.buildPinned && buildPinned();
  });
  $('#modal-archive-btn')?.addEventListener('click', () => {
    if (!currentDest) return;
    const id = currentDest.id;
    if (isArchived(id)) unarchiveDest(id); else archiveDest(id);
    syncModalButtons();
    refreshAll();
  });

  delegate(ov, 'change', '[data-set-statut]', (e, el) => setDestStatut(el.dataset.setStatut, el.value));
  delegate(ov, 'click', '[data-open-or-create]', (e, el) => {
    const id = el.dataset.openOrCreate;
    closeDestModal();
    const t = getTripByDestination(id);
    if (t && window.openTripModal) openTripModal(t.id);
    else window.createVoyageFromDest && createVoyageFromDest(id);
  });
  delegate(ov, 'click', '[data-dest-goto]', (e, el) => {
    closeDestModal();
    const page = el.dataset.destGoto;
    const destId = el.dataset.destId;
    if (page === 'reglages') { showPage('reglages'); return; }
    const t = destId && getTripByDestination(destId);
    vmGoTo(page, t ? t.id : destId);
  });
  delegate(ov, 'click', '[data-rt-quick]', (e, el) => { closeDestModal(); window.rtQuickAdd && rtQuickAdd(el.dataset.rtQuick); });
  delegate(ov, 'click', '[data-open-trip-dates]', (e, el) => {
    closeDestModal();
    window.openTripModal && openTripModal(el.dataset.openTripDates);
  });
  delegate(ov, 'click', '[data-edit-dest]', (e, el) => editDestination(el.dataset.editDest));
  delegate(ov, 'click', '[data-del-dest]', (e, el) => deleteDestination(el.dataset.delDest));
  delegate(ov, 'click', '[data-add-place]', () => { closeDestModal(); showPage('ajouter'); });
  delegate(ov, 'click', '[data-gen-prog]', (e, el) => generateProgramPreview(el.dataset.genProg));
  ov.addEventListener('click', e => { if (e.target === ov) closeDestModal(); });
}

Object.assign(window, {
  openDest, closeDestModal, showTab, setDestStatut, syncModalButtons,
  editDestination, deleteDestination, initDestModal: init,
});
})();
