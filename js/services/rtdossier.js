// ============================================================
// services/rtdossier.js — dossier de road trip imprimable
//
// Document complet et autonome, pensé pour être emporté en papier :
// page de garde, synthèse, itinéraire détaillé étape par étape,
// récapitulatifs transports et hébergements, carte statique de
// l'itinéraire, et check-list de préparation.
// ============================================================
(function () {

const fmtD = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR',
  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtDShort = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR',
  { day: '2-digit', month: '2-digit' }) : '—';

/** Carte SVG de l'itinéraire, autonome (aucune requête réseau à l'impression). */
function itinerarySVG(rt) {
  const pts = [];
  if (rt.origin.coords) pts.push({ nom: rt.origin.nom, coords: rt.origin.coords, kind: 'origin' });
  rt.stops.forEach((s, i) => { if (s.coords) pts.push({ nom: shortName(s), coords: s.coords, kind: 'stop', num: i + 1 }); });
  const ret = rt.retourIdentique ? rt.origin : rt.retour;
  if (ret && ret.coords && rt.stops.length) pts.push({ nom: ret.nom, coords: ret.coords, kind: 'retour' });
  if (pts.length < 2) return '';

  const lats = pts.map(p => p.coords[0]), lons = pts.map(p => p.coords[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const W = 700, H = 420, PAD = 48;
  const spanLat = Math.max(0.02, maxLat - minLat), spanLon = Math.max(0.02, maxLon - minLon);
  // Projection équirectangulaire corrigée par la latitude moyenne
  const kLon = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
  const scale = Math.min((W - 2 * PAD) / (spanLon * kLon), (H - 2 * PAD) / spanLat);
  const cx = (minLon + maxLon) / 2, cy = (minLat + maxLat) / 2;
  const X = lon => W / 2 + (lon - cx) * kLon * scale;
  const Y = lat => H / 2 - (lat - cy) * scale;

  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.coords[1]).toFixed(1)},${Y(p.coords[0]).toFixed(1)}`).join(' ');
  const markers = pts.map(p => {
    const x = X(p.coords[1]), y = Y(p.coords[0]);
    if (p.kind === 'stop') {
      return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="#1e293b"/>
        <text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="11" fill="#fff" text-anchor="middle" font-weight="700">${p.num}</text>
        <text x="${(x + 15).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="10.5" fill="#1e293b">${escHtml(p.nom)}</text></g>`;
    }
    return `<g><rect x="${(x - 6).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="12" height="12" rx="2" fill="#0891b2"/>
      <text x="${(x + 11).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="10.5" fill="#0891b2" font-weight="600">${escHtml(p.nom)}</text></g>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Carte de l'itinéraire">
    <rect width="${W}" height="${H}" fill="#f8fafc" stroke="#e2e8f0"/>
    <path d="${path}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="7 5"/>
    ${markers}
  </svg>`;
}

function buildHTML(rt) {
  const s = rtStats(rt);
  const sched = rtSchedule(rt);
  const issues = rtValidate(rt);
  const devises = [...new Set(rt.stops.map(x => currencyOf(x.pays)).filter(c => c && c !== 'EUR'))];

  // ── Étapes détaillées ──
  const etapes = rt.stops.map((stop, i) => {
    const sc = sched.stopById[stop.id] || {};
    const seg = rt.segments.find(x => x.toRef === stop.id);
    const a = seg && rtResolvePoint(rt, seg.fromRef);
    const v = seg ? rtSegmentValues(rt, seg) : null;
    const m = seg ? rtModeMeta(seg.mode) : null;
    const lg = stop.lodging;
    const d = stop.destId && destById(stop.destId);
    const nights = +stop.nights || 0;

    const trajet = seg ? `
      <table class="mini">
        <tbody>
          <tr><td class="t">Trajet</td><td>${escHtml((a ? a.nom : '?') + ' → ' + shortName(stop))}</td></tr>
          <tr><td class="t">Moyen</td><td>${m.emoji} ${escHtml(m.label)}</td></tr>
          ${v.distanceKm != null ? `<tr><td class="t">Distance</td><td>${v.distanceKm} km</td></tr>` : ''}
          ${v.dureeH != null ? `<tr><td class="t">Durée</td><td>${escHtml(fmtDuration(v.dureeH))}</td></tr>` : ''}
          ${seg.departTime ? `<tr><td class="t">Horaires</td><td>${escHtml(seg.departTime)}${seg.arriveeTime ? ' → ' + escHtml(seg.arriveeTime) : ''}</td></tr>` : ''}
          ${seg.reservation.reference ? `<tr><td class="t">Réservation</td><td>${escHtml(seg.reservation.reference)} — ${escHtml(rtBookingMeta(seg.reservation.status).label)}</td></tr>` : ''}
          ${seg.notes ? `<tr><td class="t">Remarques</td><td>${escHtml(seg.notes)}</td></tr>` : ''}
        </tbody>
      </table>` : '';

    const logement = nights === 0 ? '<p class="muted">Étape de passage — pas de nuit sur place.</p>' : `
      <table class="mini">
        <tbody>
          <tr><td class="t">Logement</td><td>${lg.nom ? escHtml(lg.nom) : '<span class="todo">à réserver</span>'}</td></tr>
          ${lg.adresse ? `<tr><td class="t">Adresse</td><td>${escHtml(lg.adresse)}</td></tr>` : ''}
          <tr><td class="t">Arrivée</td><td>${fmtD(sc.arrivee)} ${escHtml(lg.checkinTime || '')}</td></tr>
          <tr><td class="t">Départ</td><td>${fmtD(sc.depart)} ${escHtml(lg.checkoutTime || '')}</td></tr>
          ${lg.prix ? `<tr><td class="t">Prix</td><td>${escHtml(lg.prix)} / nuit</td></tr>` : ''}
          ${lg.tel ? `<tr><td class="t">Téléphone</td><td>${escHtml(lg.tel)}</td></tr>` : ''}
          ${lg.email ? `<tr><td class="t">Email</td><td>${escHtml(lg.email)}</td></tr>` : ''}
          ${lg.reference ? `<tr><td class="t">Référence</td><td>${escHtml(lg.reference)}</td></tr>` : ''}
          <tr><td class="t">Statut</td><td>${escHtml(rtBookingMeta(lg.status).label)}</td></tr>
          ${lg.notes ? `<tr><td class="t">Notes</td><td>${escHtml(lg.notes)}</td></tr>` : ''}
        </tbody>
      </table>`;

    const activites = (stop.activites || []).length
      ? `<ul class="acts">${stop.activites.map(x =>
          `<li><span class="box${x.reserve ? ' x' : ''}"></span>${escHtml(x.nom)}${x.prix ? ' — ' + escHtml(x.prix) : ''}</li>`).join('')}</ul>`
      : '';
    const pois = d && (d.pois || []).length
      ? `<p class="pois"><strong>À voir :</strong> ${escHtml(d.pois.slice(0, 6).map(p => p.nom).join(' · '))}</p>` : '';

    return `<section class="etape">
      <h2><span class="num">${i + 1}</span> ${escHtml(stop.nom)}
        <small>${escHtml(stop.pays || '')} · ${nights} nuit${nights > 1 ? 's' : ''} · ${fmtDShort(sc.arrivee)} → ${fmtDShort(sc.depart)}</small></h2>
      <div class="cols2">
        <div><h3>🚗 Comment y aller</h3>${trajet || '<p class="muted">—</p>'}</div>
        <div><h3>🏨 Hébergement</h3>${logement}</div>
      </div>
      ${activites || pois ? `<h3>🎯 Sur place</h3>${activites}${pois}` : ''}
      ${stop.note ? `<p class="note"><strong>Note :</strong> ${escHtml(stop.note)}</p>` : ''}
    </section>`;
  }).join('');

  // ── Récapitulatif des transports ──
  const transports = rt.segments.map(seg => {
    const a = rtResolvePoint(rt, seg.fromRef), b = rtResolvePoint(rt, seg.toRef);
    const v = rtSegmentValues(rt, seg);
    const m = rtModeMeta(seg.mode);
    const w = sched.segments[seg.id];
    return `<tr>
      <td>${w ? fmtDShort(w.date) : ''}</td>
      <td>${escHtml((a ? a.nom : '?') + ' → ' + (b ? b.nom : '?'))}</td>
      <td>${m.emoji} ${escHtml(m.label)}</td>
      <td>${seg.departTime ? escHtml(seg.departTime + (seg.arriveeTime ? ' → ' + seg.arriveeTime : '')) : '—'}</td>
      <td>${v.distanceKm != null ? v.distanceKm + ' km' : '—'}</td>
      <td>${v.dureeH != null ? escHtml(fmtDuration(v.dureeH)) : '—'}</td>
      <td>${escHtml(seg.reservation.reference || rtBookingMeta(seg.reservation.status).label)}</td>
    </tr>`;
  }).join('');

  // ── Récapitulatif des hébergements ──
  const logements = rt.stops.filter(x => (+x.nights || 0) > 0).map(stop => {
    const sc = sched.stopById[stop.id] || {};
    const lg = stop.lodging;
    return `<tr>
      <td>${escHtml(shortName(stop))}</td>
      <td>${lg.nom ? escHtml(lg.nom) : '<span class="todo">à réserver</span>'}</td>
      <td>${escHtml(lg.adresse || '—')}</td>
      <td>${fmtDShort(sc.arrivee)} → ${fmtDShort(sc.depart)}</td>
      <td>${escHtml((lg.checkinTime || '') + ' / ' + (lg.checkoutTime || ''))}</td>
      <td>${escHtml(lg.tel || '—')}</td>
      <td>${escHtml(lg.reference || rtBookingMeta(lg.status).label)}</td>
    </tr>`;
  }).join('');

  const svg = itinerarySVG(rt);
  const participants = `${rt.travelers} voyageur${rt.travelers > 1 ? 's' : ''}`;

  return `
  <style>
    .cover{text-align:center;padding:40px 0 28px;border-bottom:3px solid #1e293b;margin-bottom:22px}
    .cover h1{font-size:30px;line-height:1.15;margin-bottom:8px}
    .cover .sub{font-size:13px;color:#475569;margin-bottom:4px}
    .cover .route{font-size:12px;color:#64748b;margin-top:14px;line-height:1.7}
    .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:18px 0}
    .kpi{background:#f1f5f9;border-radius:8px;padding:10px 6px;text-align:center}
    .kpi strong{display:block;font-size:17px;color:#1e293b}
    .kpi span{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
    .etape{break-inside:avoid;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:12px}
    .etape h2{font-size:14px;border:0;padding:0;margin-bottom:8px;display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0}
    .etape h2 small{font-weight:400;color:#64748b;font-size:10px}
    .etape h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#475569;margin:8px 0 4px}
    .num{background:#1e293b;color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;
         align-items:center;justify-content:center;font-size:12px;flex:0 0 auto}
    table.mini td{padding:2px 5px;font-size:10.5px;border-bottom:1px solid #f1f5f9}
    table.mini td.t{width:78px;color:#64748b;font-weight:600}
    .acts{list-style:none;font-size:10.5px}
    .acts li{display:flex;gap:6px;align-items:center;padding:1px 0}
    .box{width:10px;height:10px;border:1.3px solid #111;border-radius:2px;display:inline-block;flex:0 0 auto}
    .box.x{background:#111}
    .pois{font-size:10px;color:#475569;margin-top:4px}
    .note{font-size:10.5px;background:#fffbeb;border-left:3px solid #f59e0b;padding:5px 8px;margin-top:6px}
    .muted{color:#94a3b8;font-size:10.5px}
    .todo{color:#c01c1c;font-weight:600}
    .recap th{background:#1e293b;color:#fff;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;padding:5px 6px}
    .recap td{font-size:10px;padding:4px 6px}
    .mapbox{border:1px solid #e2e8f0;border-radius:8px;padding:8px;background:#fff;break-inside:avoid}
    .checklist{column-count:2;column-gap:22px;list-style:none}
    .checklist li{display:flex;gap:7px;align-items:center;padding:2px 0;font-size:11px;break-inside:avoid}
    .alerts{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;font-size:10.5px}
    .alerts li{margin-left:14px;list-style:disc}
    @media print{ .etape{page-break-inside:avoid} }
  </style>

  <div class="cover">
    <h1>🚗 ${escHtml(rt.nom || 'Road trip')}</h1>
    <div class="sub">${escHtml(fmtD(s.debut))} → ${escHtml(fmtD(s.fin))}</div>
    <div class="sub">${escHtml(s.pays.join(' · ') || '—')} · ${escHtml(participants)} · ${escHtml(rtStatusMeta(rt.status).short)}</div>
    <div class="route">${escHtml([rt.origin.nom, ...rt.stops.map(x => shortName(x)),
      (rt.retourIdentique ? rt.origin.nom : (rt.retour || {}).nom || '')].filter(Boolean).join('  →  '))}</div>
  </div>

  <div class="kpis">
    <div class="kpi"><strong>${s.jours}</strong><span>jours</span></div>
    <div class="kpi"><strong>${s.etapes}</strong><span>étapes</span></div>
    <div class="kpi"><strong>${s.nuits}</strong><span>nuits</span></div>
    <div class="kpi"><strong>${s.km}</strong><span>km</span></div>
    <div class="kpi"><strong>${escHtml(fmtDuration(s.heures))}</strong><span>de trajet</span></div>
    <div class="kpi"><strong>${s.total} €</strong><span>budget</span></div>
  </div>

  ${svg ? `<section><h2>🗺️ Itinéraire</h2><div class="mapbox">${svg}</div></section>` : ''}

  <section><h2>📅 Étapes</h2>${etapes || '<p class="muted">Aucune étape.</p>'}</section>

  ${transports ? `<section><h2>🚆 Récapitulatif des transports</h2>
    <table class="recap"><thead><tr><th>Date</th><th>Trajet</th><th>Moyen</th><th>Horaires</th><th>Distance</th><th>Durée</th><th>Réservation</th></tr></thead>
    <tbody>${transports}</tbody></table></section>` : ''}

  ${logements ? `<section><h2>🏨 Récapitulatif des hébergements</h2>
    <table class="recap"><thead><tr><th>Étape</th><th>Logement</th><th>Adresse</th><th>Dates</th><th>Check-in / out</th><th>Téléphone</th><th>Réservation</th></tr></thead>
    <tbody>${logements}</tbody></table></section>` : ''}

  <section><h2>💶 Budget</h2>
    <table class="recap"><tbody>
      <tr><td>Transport</td><td style="text-align:right">${s.coutTransport} €</td></tr>
      <tr><td>Hébergement</td><td style="text-align:right">${s.coutHebergement} €</td></tr>
      <tr><td>Activités</td><td style="text-align:right">${s.coutActivites} €</td></tr>
      ${rt.budget.autres ? `<tr><td>Divers</td><td style="text-align:right">${rt.budget.autres} €</td></tr>` : ''}
      <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${s.total} €</strong></td></tr>
      ${rt.travelers > 1 ? `<tr><td>Par personne</td><td style="text-align:right">${s.parPersonne} €</td></tr>` : ''}
    </tbody></table>
    ${devises.length ? `<p class="muted">Devises à prévoir : ${escHtml(devises.map(currencyLabel).join(' · '))}</p>` : ''}
  </section>

  ${(rt.checklist || []).length ? `<section><h2>✅ Préparation</h2>
    <ul class="checklist">${rt.checklist.map(c =>
      `<li><span class="box${c.fait ? ' x' : ''}"></span>${escHtml(c.texte)}</li>`).join('')}</ul></section>` : ''}

  ${issues.filter(i => i.niveau !== 'info').length ? `<section><h2>⚠️ Points à finaliser</h2>
    <div class="alerts"><ul>${issues.filter(i => i.niveau !== 'info')
      .map(i => `<li>${escHtml(i.texte)}</li>`).join('')}</ul></div></section>` : ''}

  ${rt.notes ? `<section><h2>📝 Notes</h2><p>${escHtml(rt.notes)}</p></section>` : ''}`;
}

function openRoadtripDossier(rt) {
  if (!rt) return;
  const norm = rtNormalize(rt);
  if (!norm.stops.length) { showToast('Ajoute au moins une étape avant de générer le dossier', { tone: 'error' }); return; }
  vmOpenPrintable(`Road trip — ${norm.nom || 'sans nom'}`, buildHTML(norm),
    { footer: 'Dossier de road trip · ' + vmCurrentName() });
}

Object.assign(window, { openRoadtripDossier, buildRoadtripDossierHTML: buildHTML });
})();
