// ============================================================
// views/transport.js — page "Transport" : comparateur voiture/avion
// (Phase 2 — chantier 1)
// ============================================================
(function () {

const state = { destId: '', cityName: 'Nantes', conso: DEFAULTS.conso, prix: DEFAULTS.prix, depIata: 'NTE' };

const dests = () => window.DESTINATIONS || [];
const cityCoords = name => (FR_CITIES.find(c => c.nom === name) || FR_CITIES[0]).coords;

function renderToolbar() {
  const opts = dests().map(d => `<option value="${d.id}">${d.emoji} ${d.nom} (${d.pays})</option>`).join('');
  const cities = FR_CITIES.map(c => `<option value="${c.nom}" ${c.nom === state.cityName ? 'selected' : ''}>${c.nom}</option>`).join('');
  return `
    <div class="agenda-toolbar">
      <div class="adv-field">
        <label>Destination</label>
        <select class="valise-select" id="tr-dest"><option value="">— Choisir —</option>${opts}</select>
      </div>
      <div class="adv-field">
        <label>Ville de départ</label>
        <select class="valise-select" id="tr-city">${cities}</select>
      </div>
      <div class="adv-field">
        <label>✈️ Aéroport de départ</label>
        <select class="valise-select" id="tr-airport"></select>
      </div>
      <div class="adv-field">
        <label>Conso (L/100)</label>
        <input type="number" id="tr-conso" value="${state.conso}" step="0.5" min="2" style="width:80px">
      </div>
      <div class="adv-field">
        <label>Essence (€/L)</label>
        <input type="number" id="tr-prix" value="${state.prix}" step="0.05" min="0.5" style="width:80px">
      </div>
    </div>
    <div id="transport-results"></div>`;
}

function populateAirports() {
  const sel = document.getElementById('tr-airport');
  const near = nearestAirports(cityCoords(state.cityName), 4);
  if (!near.find(a => a.iata === state.depIata)) state.depIata = near[0].iata;
  sel.innerHTML = near.map(a => `<option value="${a.iata}" ${a.iata === state.depIata ? 'selected' : ''}>${a.iata} · ${a.nom} (${a.dist} km)</option>`).join('');
}

async function renderResults() {
  const box = document.getElementById('transport-results');
  if (!state.destId) { box.innerHTML = `<div class="ag-empty-hint">👆 Choisis une destination pour comparer voiture et avion.</div>`; return; }
  const d = dests().find(x => x.id === state.destId);
  const from = cityCoords(state.cityName);
  const opt = { conso: +state.conso, prix: +state.prix };

  const car = compareCar(from, d.coords, opt);
  const near = nearestAirports(from, 4);
  const depAirport = near.find(a => a.iata === state.depIata) || near[0];
  const plane = comparePlane(from, d.coords, { depAirport });
  const reco = recommend(d, car);
  const longCar = car.km > 1500;

  box.innerHTML = `
    <div class="info-box ${reco === 'voiture' ? 'success' : ''}" style="margin-bottom:16px">
      <strong>Recommandation :</strong> ${reco === 'voiture'
        ? `🚗 La voiture est pertinente (${car.km} km depuis ${state.cityName}).`
        : `✈️ L'avion est plus adapté (${car.km} km en voiture${longCar ? ' — trajet routier très long' : ''}).`}
    </div>
    <div class="grid grid-2" style="gap:16px;align-items:start">
      <!-- VOITURE -->
      <div class="card">
        <h2>🚗 Voiture <span style="color:var(--muted);font-weight:400;font-size:.8rem">${state.cityName} → ${d.nom.split('—')[0].trim()}</span></h2>
        <table class="tbl">
          <tr><td>Distance routière</td><td style="text-align:right"><strong>${car.km} km</strong></td></tr>
          <tr><td>⏱️ Avec péages</td><td style="text-align:right">${fmtDuration(car.timeToll)}</td></tr>
          <tr><td>⏱️ Sans péages</td><td style="text-align:right">${fmtDuration(car.timeNoToll)} <span style="color:var(--yellow)">(+${fmtDuration(car.dTime)})</span></td></tr>
          <tr><td>⛽ Carburant</td><td style="text-align:right">${car.fuel} €</td></tr>
          <tr><td>🛣️ Péages</td><td style="text-align:right">${car.tolls} €</td></tr>
          <tr class="total-row"><td>Total avec péages</td><td style="text-align:right;color:var(--green)"><strong>${car.totalToll} €</strong></td></tr>
          <tr><td>Total sans péages</td><td style="text-align:right">${car.totalNoToll} € <span style="color:var(--green)">(−${car.economy} €)</span></td></tr>
        </table>
        <div class="detail-actions">
          <a class="mini-btn" target="_blank" href="https://www.google.com/maps/dir/${encodeURIComponent(state.cityName)}/${d.coords[0]},${d.coords[1]}">🗺️ Itinéraire avec péages</a>
          <a class="mini-btn" target="_blank" href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(state.cityName)}&destination=${d.coords[0]},${d.coords[1]}&travelmode=driving&avoid=tolls">🚫 Sans péages</a>
        </div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:8px">Estimation : conso ${state.conso} L/100 · ${state.prix} €/L · péage ~${DEFAULTS.tollRate} €/km.</div>
      </div>
      <!-- AVION -->
      <div class="card">
        <h2>✈️ Avion <span style="color:var(--muted);font-weight:400;font-size:.8rem">${depAirport.iata} → ${d.iata || d.nom.split('—')[0].trim()}</span></h2>
        <table class="tbl">
          <tr><td>Aéroport de départ</td><td style="text-align:right"><strong>${depAirport.iata}</strong> · ${depAirport.nom}</td></tr>
          <tr><td>Distance de vol</td><td style="text-align:right">${plane.km} km</td></tr>
          <tr><td>🛫 Durée de vol</td><td style="text-align:right">${fmtDuration(plane.flightTime)}</td></tr>
          <tr><td>+ Trajet aéroport / attente</td><td style="text-align:right">~${fmtDuration(plane.toAirport + plane.wait + plane.fromArrival)}</td></tr>
          <tr class="total-row"><td>⏱️ Temps global porte-à-porte</td><td style="text-align:right;color:var(--accent)"><strong>${fmtDuration(plane.globalTime)}</strong></td></tr>
          <tr><td>💶 Tarif indicatif</td><td style="text-align:right" id="tr-price">…</td></tr>
        </table>
        <div style="font-size:.78rem;color:var(--muted);margin:6px 0 4px">Aéroports proches de ${state.cityName} :</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${near.map(a => `<span class="type-tag">${a.iata} · ${a.dist} km</span>`).join('')}
        </div>
        <div class="detail-actions" id="tr-flight-links"></div>
      </div>
    </div>`;

  // Tarif via provider (stub aujourd'hui) + liens comparateurs
  const res = await searchFlights({ from: depAirport.iata, to: d.iata, date: d.date_depart });
  const priceCell = document.getElementById('tr-price');
  if (priceCell) {
    priceCell.innerHTML = res.available
      ? `${res.results[0]?.price ?? '?'} €`
      : `<span style="color:var(--muted)">${d.vol_prix || 'à brancher (API)'}</span>`;
  }
  const links = document.getElementById('tr-flight-links');
  if (links) {
    links.innerHTML = comparatorLinks(depAirport.iata, d.iata, d.date_depart)
      .map(l => `<a class="mini-btn" target="_blank" href="${l.url}">🔎 ${l.label}</a>`).join('');
  }
}

function init() {
  const mount = document.getElementById('transport-mount');
  if (!mount) return;
  mount.innerHTML = renderToolbar();
  // Pré-sélection d'une destination par défaut → la page n'est jamais vide
  const first = (dests()[0] || {}).id;
  if (first) { state.destId = first; document.getElementById('tr-dest').value = first; }
  populateAirports();
  renderResults();

  document.getElementById('tr-dest').addEventListener('change', e => { state.destId = e.target.value; renderResults(); });
  document.getElementById('tr-city').addEventListener('change', e => { state.cityName = e.target.value; populateAirports(); renderResults(); });
  document.getElementById('tr-airport').addEventListener('change', e => { state.depIata = e.target.value; renderResults(); });
  document.getElementById('tr-conso').addEventListener('input', e => { state.conso = e.target.value; renderResults(); });
  document.getElementById('tr-prix').addEventListener('input', e => { state.prix = e.target.value; renderResults(); });
}

// Sélection externe (depuis un voyage / autre page)
window.transportSelect = (destId) => {
  const s = document.getElementById('tr-dest');
  if (s && destId) { s.value = destId; state.destId = destId; renderResults(); }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
