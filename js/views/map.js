// ============================================================
// views/map.js — carte Leaflet : marqueurs, clusters, popups, filtres
// Les destinations archivées sont exclues, comme dans toutes les
// autres vues (elles étaient affichées ici par inadvertance).
// ============================================================
(function () {

let map = null;
let clusterGroup = null;
let tileLayer = null;
let mapFilterValue = 'all';
let roadtripLayer = null;

function vmTileUrl() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
}
function vmApplyMapTiles() { if (map && tileLayer) tileLayer.setUrl(vmTileUrl()); }

function makeIcon(color, emoji, size = 32) {
  return L.divIcon({
    html: `<div class="vm-marker" style="--mc:${color};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.46)}px">${escHtml(emoji)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
    className: 'vm-marker-wrap',
  });
}

function popupHTML(d) {
  const c = statutColor(d.statut);
  const s = statutMeta(d.statut);
  const hasTrip = !!getTripByDestination(d.id);
  return `<div class="popup-content">
    <h4>${escHtml(d.emoji)} ${escHtml(d.nom)}</h4>
    <p>${escHtml(d.pays)}${s.label ? ` · <span style="color:${c.token};font-weight:600">${escHtml(s.label)}</span>` : ''}</p>
    <div class="popup-meta">
      <span class="popup-tag">💶 ${escHtml(d.budget_min)}–${escHtml(d.budget_max)}€</span>
      ${d.vol_prix ? `<span class="popup-tag">✈️ ${escHtml(d.vol_prix)}</span>` : ''}
    </div>
    <div class="popup-actions">
      <button type="button" class="popup-btn" data-map-dest="${escAttr(d.id)}">📋 Fiche</button>
      <button type="button" class="popup-btn primary" data-map-trip="${escAttr(d.id)}">${hasTrip ? '🧭 Suivi' : '➕ Voyage'}</button>
    </div>
  </div>`;
}

function initMap() {
  if (map || typeof L === 'undefined') return;
  map = L.map('map', { zoomControl: true, worldCopyJump: true, minZoom: 2 }).setView([46, 4], 4);
  map.setMaxBounds([[-85, -200], [85, 200]]);
  tileLayer = L.tileLayer(vmTileUrl(), { attribution: '© OpenStreetMap · © CARTO', maxZoom: 20 }).addTo(map);
  window.map = map;
  mapSetFilter(mapFilterValue, !!pendingRoadtrip);
  // Un itinéraire demandé avant l'initialisation est tracé maintenant :
  // plus de course entre le recadrage du filtre et celui du road trip.
  if (pendingRoadtrip) {
    const p = pendingRoadtrip;
    pendingRoadtrip = null;
    setTimeout(() => drawRoadtrip(p.rt, p.focusStopId), 60);
  }
  setTimeout(() => map.invalidateSize(), 150);
}

function clearMarkers() {
  if (clusterGroup) { map.removeLayer(clusterGroup); clusterGroup = null; }
}

function buildMarkers(list) {
  return list.filter(d => Array.isArray(d.coords) && d.coords.length === 2).map(d => {
    const m = L.marker(d.coords, { icon: makeIcon(statutColor(d.statut).hex, d.emoji) });
    m.bindPopup(popupHTML(d), { maxWidth: 260, closeButton: true });
    return m;
  });
}

function addToCluster(markers) {
  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 45,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    iconCreateFunction(cluster) {
      const count = cluster.getChildCount();
      const size = count < 10 ? 38 : count < 30 ? 46 : 54;
      return L.divIcon({
        html: `<div class="vm-cluster" style="width:${size}px;height:${size}px;font-size:${count < 100 ? 15 : 13}px">${count}</div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: 'vm-marker-wrap',
      });
    },
  });
  markers.forEach(m => clusterGroup.addLayer(m));
  map.addLayer(clusterGroup);
}

function mapSetFilter(v, keepView) {
  mapFilterValue = v;
  $$('.map-controls .filtre-btn').forEach(b => {
    const on = b.dataset.mf === v;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (!map) return;
  clearMarkers();
  const list = activeDests().filter(d => v === 'all' || d.statut === v);
  addToCluster(buildMarkers(list));
  const el = $('#map-count');
  if (el) el.textContent = list.length + ' destination' + (list.length > 1 ? 's' : '');
  // Ne pas recadrer si un itinéraire est affiché : c'est lui qui commande la vue.
  if (keepView || roadtripLayer || pendingRoadtrip) return;
  if (list.length === 1 && list[0].coords) map.setView(list[0].coords, 8);
  else if (list.length && clusterGroup) {
    try { map.fitBounds(clusterGroup.getBounds().pad(0.2)); } catch { /* bounds vides */ }
  }
}

function focusMap(id) {
  const d = destById(id);
  if (!d || !d.coords) return;
  if (!map) { initMap(); setTimeout(() => focusMap(id), 300); return; }
  map.setView(d.coords, 8);
}

// ── Itinéraire de road trip ──────────────────────────────
let pendingRoadtrip = null;   // demande d'affichage arrivée avant l'init de la carte

/** Couleur de tracé par mode de transport. */
const MODE_COLOR = {
  voiture: '#2563eb', location: '#2563eb', camping: '#0891b2', moto: '#7c3aed',
  train: '#16a34a', avion: '#dc2626', bus: '#d97706', ferry: '#0ea5e9',
  velo: '#65a30d', pied: '#78716c', autre: '#64748b',
};

function clearRoadtrip() {
  if (roadtripLayer && map) { map.removeLayer(roadtripLayer); }
  roadtripLayer = null;
  pendingRoadtrip = null;
  const bar = $('#map-rt-bar');
  if (bar) bar.hidden = true;
}

/**
 * Trace un itinéraire complet : point de départ, étapes numérotées,
 * segments colorés par mode de transport, hébergements, retour.
 *
 * Corrige la régression : l'affichage était écrasé par le recadrage
 * automatique du filtre de destinations, qui s'exécutait après.
 */
function drawRoadtrip(rt, focusStopId) {
  if (!rt) return;
  if (!map) { pendingRoadtrip = { rt, focusStopId }; initMap(); return; }

  clearRoadtrip();
  const grp = L.layerGroup();
  const bounds = [];

  // Points de l'itinéraire, dans l'ordre
  const seq = [];
  if (rt.origin && rt.origin.coords) seq.push({ ref: 'origin', nom: rt.origin.nom, coords: rt.origin.coords, kind: 'origin' });
  rt.stops.forEach((s, i) => {
    if (Array.isArray(s.coords) && s.coords.length === 2) {
      seq.push({ ref: s.id, nom: s.nom, coords: s.coords, kind: 'stop', num: i + 1, stop: s });
    }
  });
  const ret = rt.retourIdentique ? rt.origin : rt.retour;
  if (rt.stops.length && ret && ret.coords) seq.push({ ref: 'retour', nom: ret.nom, coords: ret.coords, kind: 'retour' });

  if (seq.length < 1) { showToast('Aucun point géolocalisé à afficher', { tone: 'error' }); return; }

  const sched = rtSchedule(rt);

  // Segments : une polyline par trajet, colorée selon le mode
  for (let i = 0; i < seq.length - 1; i++) {
    const from = seq[i], to = seq[i + 1];
    const seg = rt.segments.find(s => s.fromRef === from.ref && s.toRef === to.ref);
    const mode = seg ? seg.mode : 'voiture';
    const m = rtModeMeta(mode);
    const v = seg ? rtSegmentValues(rt, seg) : {};
    const when = seg && sched.segments[seg.id];
    L.polyline([from.coords, to.coords], {
      color: MODE_COLOR[mode] || '#2563eb',
      weight: mode === 'avion' ? 2 : 3.5,
      opacity: 0.85,
      dashArray: mode === 'avion' ? '3 8' : mode === 'ferry' ? '10 6' : null,
    }).bindPopup(`<div class="popup-content">
        <h4>${m.emoji} ${escHtml(from.nom)} → ${escHtml(to.nom)}</h4>
        <p>${escHtml(m.label)}${when ? ' · ' + escHtml(when.date) : ''}</p>
        <div class="popup-meta">
          ${v.distanceKm != null ? `<span class="popup-tag">${v.distanceKm} km</span>` : ''}
          ${v.dureeH != null ? `<span class="popup-tag">${escHtml(fmtDuration(v.dureeH))}</span>` : ''}
          ${v.cout != null ? `<span class="popup-tag">${v.cout} €</span>` : ''}
        </div>
        ${seg && seg.departTime ? `<p>🕐 ${escHtml(seg.departTime)}${seg.arriveeTime ? ' → ' + escHtml(seg.arriveeTime) : ''}</p>` : ''}
      </div>`).addTo(grp);
  }

  // Marqueurs
  seq.forEach(p => {
    bounds.push(p.coords);
    if (p.kind === 'stop') {
      const sc = sched.stopById[p.stop.id] || {};
      const lg = p.stop.lodging || {};
      L.marker(p.coords, { icon: makeIcon('#1e293b', String(p.num), 32) })
        .bindPopup(`<div class="popup-content">
          <h4>${p.num}. ${escHtml(p.nom)}</h4>
          <p>${escHtml(p.stop.pays || '')} · ${+p.stop.nights || 0} nuit${(+p.stop.nights || 0) > 1 ? 's' : ''}</p>
          <div class="popup-meta">
            ${sc.arrivee ? `<span class="popup-tag">${escHtml(sc.arrivee)} → ${escHtml(sc.depart)}</span>` : ''}
          </div>
          ${lg.nom ? `<p>🏨 ${escHtml(lg.nom)}${lg.adresse ? '<br>' + escHtml(lg.adresse) : ''}</p>` : '<p>🏨 <em>hébergement à choisir</em></p>'}
          ${p.stop.note ? `<p>${escHtml(p.stop.note)}</p>` : ''}
          ${p.stop.destId ? `<div class="popup-actions"><button type="button" class="popup-btn" data-map-dest="${escAttr(p.stop.destId)}">📋 Fiche</button></div>` : ''}
        </div>`).addTo(grp);
    } else {
      L.marker(p.coords, { icon: makeIcon(p.kind === 'origin' ? '#0891b2' : '#7c3aed', p.kind === 'origin' ? '🏁' : '🏠', 30) })
        .bindPopup(`<div class="popup-content"><h4>${escHtml(p.nom)}</h4><p>${p.kind === 'origin' ? 'Point de départ' : 'Retour'}</p></div>`)
        .addTo(grp);
    }
  });

  grp.addTo(map);
  roadtripLayer = grp;

  // Bandeau de contexte au-dessus de la carte
  const bar = $('#map-rt-bar');
  if (bar) {
    const s = rtStats(rt);
    bar.hidden = false;
    bar.innerHTML = `<span class="rt-bar-name">🚗 ${escHtml(rt.nom || 'Road trip')}</span>
      <span class="hint">${s.etapes} étapes · ${s.km} km · ${escHtml(fmtDuration(s.heures))} · ${s.jours} jours</span>
      <span class="rt-bar-legend">${[...new Set(rt.segments.map(x => x.mode))].map(mo =>
        `<span class="rt-legend-item"><i style="background:${MODE_COLOR[mo] || '#2563eb'}"></i>${escHtml(rtModeMeta(mo).label)}</span>`).join('')}</span>
      <button type="button" class="btn btn-outline btn-sm" data-map-rt-close>✕ Retirer l'itinéraire</button>`;
  }

  // Recalculer la taille du conteneur AVANT de cadrer : la page vient
  // d'être affichée, et un fitBounds sur un conteneur de taille nulle
  // produit un cadrage aberrant (c'était la « régression » constatée).
  const frame = () => {
    map.invalidateSize(false);
    const focus = focusStopId && seq.find(p => p.ref === focusStopId);
    if (focus) map.setView(focus.coords, 10);
    else if (bounds.length > 1) { try { map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] }); } catch { /* bounds vides */ } }
    else map.setView(bounds[0], 9);
  };
  frame();
  // Second passage une fois la transition d'affichage de la page terminée
  setTimeout(frame, 260);
}

/** Appelé à chaque entrée sur la page Carte. */
function vmMapEnter() {
  if (!map) { setTimeout(initMap, 120); return; }
  setTimeout(() => {
    map.invalidateSize();
    mapSetFilter(mapFilterValue, !!roadtripLayer);
  }, 80);
}

function init() {
  const page = document.getElementById('page-carte');
  if (!page) return;
  delegate(page, 'click', '[data-mf]', (e, el) => mapSetFilter(el.dataset.mf, !!roadtripLayer));
  delegate(page, 'click', '[data-map-rt-close]', () => { clearRoadtrip(); mapSetFilter(mapFilterValue); });
  // Les popups Leaflet sont hors de la page : on délègue au document
  delegate(document, 'click', '[data-map-dest]', (e, el) => openDest(el.dataset.mapDest));
  delegate(document, 'click', '[data-map-trip]', (e, el) => {
    const t = getTripByDestination(el.dataset.mapTrip);
    if (t && window.openTripModal) openTripModal(t.id);
    else window.createVoyageFromDest && createVoyageFromDest(el.dataset.mapTrip);
  });
  subscribe(() => { if (map && document.getElementById('page-carte').classList.contains('active')) mapSetFilter(mapFilterValue); });
}

Object.assign(window, {
  initMap, mapSetFilter, focusMap, drawRoadtrip, clearRoadtrip, vmMapEnter,
  vmApplyMapTiles, makeIcon, MODE_COLOR, initMapView: init,
});
})();
