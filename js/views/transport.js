// ============================================================
// views/transport.js — comparateur voiture / avion
// Les paramètres par défaut viennent des Réglages ; les ajustements
// faits ici sont ponctuels (ils ne modifient pas les préférences).
// ============================================================
(function () {

const state = { destId: '', cityName: '', conso: 0, prix: 0, depIata: '' };

const cityCoords = name => ((window.FR_CITIES || []).find(c => c.nom === name) || (window.FR_CITIES || [])[0]).coords;

function syncFromPrefs() {
  const p = getPrefs();
  state.cityName = p.departCity;
  state.depIata = p.departIata;
  state.conso = p.carConso;
  state.prix = p.carFuelPrice;
}

function renderToolbar() {
  const dests = activeDests();
  const opts = dests.map(d => `<option value="${escAttr(d.id)}">${escHtml(d.emoji + ' ' + d.nom + ' (' + d.pays + ')')}</option>`).join('');
  const cities = (window.FR_CITIES || []).map(c =>
    `<option value="${escAttr(c.nom)}"${c.nom === state.cityName ? ' selected' : ''}>${escHtml(c.nom)}</option>`).join('');
  return `
    <div class="agenda-toolbar">
      <div class="adv-field">
        <label for="tr-dest">Destination</label>
        <select class="valise-select" id="tr-dest"><option value="">— Choisir —</option>${opts}</select>
      </div>
      <div class="adv-field">
        <label for="tr-city">Ville de départ</label>
        <select class="valise-select" id="tr-city">${cities}</select>
      </div>
      <div class="adv-field">
        <label for="tr-airport">✈️ Aéroport de départ</label>
        <select class="valise-select" id="tr-airport"></select>
      </div>
      <div class="adv-field">
        <label for="tr-conso">Conso (L/100)</label>
        <input type="number" id="tr-conso" value="${escAttr(state.conso)}" step="0.5" min="2">
      </div>
      <div class="adv-field">
        <label for="tr-prix">Essence (€/L)</label>
        <input type="number" id="tr-prix" value="${escAttr(state.prix)}" step="0.05" min="0.5">
      </div>
      <div class="adv-filter-actions">
        <button type="button" class="btn btn-outline btn-sm" data-tr-prefs>⚙️ Réglages</button>
      </div>
    </div>
    <div id="transport-results"></div>`;
}

function populateAirports() {
  const sel = $('#tr-airport');
  if (!sel) return;
  const near = nearestAirports(cityCoords(state.cityName), 4);
  if (!near.find(a => a.iata === state.depIata)) state.depIata = near[0].iata;
  sel.innerHTML = near.map(a =>
    `<option value="${escAttr(a.iata)}"${a.iata === state.depIata ? ' selected' : ''}>${escHtml(a.iata + ' · ' + a.nom + ' (' + a.dist + ' km)')}</option>`).join('');
}

async function renderResults() {
  const box = $('#transport-results');
  if (!box) return;
  if (!state.destId) {
    box.innerHTML = '<div class="ag-empty-hint">👆 Choisis une destination pour comparer voiture et avion.</div>';
    return;
  }
  const d = destById(state.destId);
  if (!d || !d.coords) { box.innerHTML = '<div class="ag-empty-hint">Cette destination n\'a pas de coordonnées.</div>'; return; }

  const from = cityCoords(state.cityName);
  const opt = { conso: +state.conso, prix: +state.prix };
  const car = compareCar(from, d.coords, opt);
  const near = nearestAirports(from, 4);
  const depAirport = near.find(a => a.iata === state.depIata) || near[0];
  const plane = comparePlane(from, d.coords, { ...opt, depAirport });
  const reco = recommend(d, car, plane);
  const trip = getTripByDestination(d.id);
  const date = (trip && trip.date_depart) || d.date_depart || '';

  box.innerHTML = `
    <div class="info-box ${reco === 'voiture' ? 'success' : ''}">
      <strong>Recommandation :</strong> ${reco === 'voiture'
        ? `🚗 La voiture est pertinente (${car.km} km depuis ${escHtml(state.cityName)}, ${escHtml(fmtDuration(car.timeToll))} de route).`
        : `✈️ L'avion est plus adapté (${car.km} km en voiture, soit ${escHtml(fmtDuration(car.timeToll))} contre ${escHtml(fmtDuration(plane.globalTime))} porte-à-porte).`}
    </div>
    <div class="grid grid-2 gap-md align-start">
      <section class="card">
        <h2>🚗 Voiture <span class="hint">${escHtml(state.cityName)} → ${escHtml(shortName(d))}</span></h2>
        <table class="tbl">
          <tbody>
            <tr><td>Distance routière</td><td class="num"><strong>${car.km} km</strong></td></tr>
            <tr><td>⏱️ Avec péages</td><td class="num">${escHtml(fmtDuration(car.timeToll))}</td></tr>
            <tr><td>⏱️ Sans péages</td><td class="num">${escHtml(fmtDuration(car.timeNoToll))} <span class="txt-yellow">(+${escHtml(fmtDuration(car.dTime))})</span></td></tr>
            <tr><td>⛽ Carburant</td><td class="num">${car.fuel} €</td></tr>
            <tr><td>🛣️ Péages</td><td class="num">${car.tolls} €</td></tr>
            <tr class="total-row"><td>Total avec péages</td><td class="num txt-green"><strong>${car.totalToll} €</strong></td></tr>
            <tr><td>Total sans péages</td><td class="num">${car.totalNoToll} € <span class="txt-green">(−${car.economy} €)</span></td></tr>
          </tbody>
        </table>
        <div class="detail-actions">
          <a class="mini-btn" target="_blank" rel="noopener noreferrer"
             href="https://www.google.com/maps/dir/?api=1&origin=${escUrl(state.cityName)}&destination=${d.coords[0]},${d.coords[1]}&travelmode=driving">🗺️ Itinéraire</a>
          <a class="mini-btn" target="_blank" rel="noopener noreferrer"
             href="https://www.google.com/maps/dir/?api=1&origin=${escUrl(state.cityName)}&destination=${d.coords[0]},${d.coords[1]}&travelmode=driving&avoid=tolls">🚫 Sans péages</a>
        </div>
        <p class="source-note">Estimation : ${escHtml(state.conso)} L/100 · ${escHtml(state.prix)} €/L · péage ~${escHtml(pref('tollRate'))} €/km · détour routier ×${ROAD_DETOUR_FACTOR}.</p>
      </section>

      <section class="card">
        <h2>✈️ Avion <span class="hint">${escHtml(depAirport.iata)} → ${escHtml(d.iata || shortName(d))}</span></h2>
        <table class="tbl">
          <tbody>
            <tr><td>Aéroport de départ</td><td class="num"><strong>${escHtml(depAirport.iata)}</strong> · ${escHtml(depAirport.nom)}</td></tr>
            <tr><td>Distance de vol</td><td class="num">${plane.km} km</td></tr>
            <tr><td>🛫 Durée de vol</td><td class="num">${escHtml(fmtDuration(plane.flightTime))}</td></tr>
            <tr><td>+ Trajet aéroport / attente</td><td class="num">~${escHtml(fmtDuration(plane.toAirport + plane.wait + plane.fromArrival))}</td></tr>
            <tr class="total-row"><td>⏱️ Temps porte-à-porte</td><td class="num txt-accent"><strong>${escHtml(fmtDuration(plane.globalTime))}</strong></td></tr>
            <tr><td>💶 Tarif indicatif</td><td class="num" id="tr-price">…</td></tr>
          </tbody>
        </table>
        <p class="hint mt-xs">Aéroports proches de ${escHtml(state.cityName)} :</p>
        <div class="chip-row">${near.map(a => `<span class="type-tag">${escHtml(a.iata)} · ${a.dist} km</span>`).join('')}</div>
        <div class="detail-actions" id="tr-flight-links"></div>
      </section>
    </div>`;

  const res = await searchFlights({ from: depAirport.iata, to: d.iata, date });
  const priceCell = $('#tr-price');
  if (priceCell) {
    priceCell.innerHTML = res.available
      ? `${escHtml(res.results[0] && res.results[0].price)} €`
      : `<span class="hint">${escHtml(d.vol_prix || 'à brancher (API)')}</span>`;
  }
  const links = $('#tr-flight-links');
  if (links) {
    links.innerHTML = comparatorLinks(depAirport.iata, d.iata, date)
      .map(l => `<a class="mini-btn" target="_blank" rel="noopener noreferrer" href="${safeUrl(l.url)}">🔎 ${escHtml(l.label)}</a>`).join('');
  }
}

function transportSelect(destId) {
  const s = $('#tr-dest');
  if (s && destId) { s.value = destId; state.destId = destId; renderResults(); }
}

function init() {
  const mount = $('#transport-mount');
  if (!mount) return;
  syncFromPrefs();
  mount.innerHTML = renderToolbar();
  const first = (activeDests()[0] || {}).id;
  if (first) { state.destId = first; $('#tr-dest').value = first; }
  populateAirports();
  renderResults();

  delegate(mount, 'change', '#tr-dest', (e, el) => { state.destId = el.value; renderResults(); });
  delegate(mount, 'change', '#tr-city', (e, el) => { state.cityName = el.value; populateAirports(); renderResults(); });
  delegate(mount, 'change', '#tr-airport', (e, el) => { state.depIata = el.value; renderResults(); });
  delegate(mount, 'input', '#tr-conso', debounce((e, el) => { state.conso = el.value; renderResults(); }, 250));
  delegate(mount, 'input', '#tr-prix', debounce((e, el) => { state.prix = el.value; renderResults(); }, 250));
  delegate(mount, 'click', '[data-tr-prefs]', () => showPage('reglages'));

  document.addEventListener('vm:prefs-changed', () => {
    const keep = state.destId;
    syncFromPrefs();
    mount.innerHTML = renderToolbar();
    state.destId = keep;
    if (keep) $('#tr-dest').value = keep;
    populateAirports();
    renderResults();
  });
  subscribe(() => { if (document.getElementById('page-transport').classList.contains('active')) renderResults(); });
}

Object.assign(window, { transportSelect, initTransport: init });
})();
