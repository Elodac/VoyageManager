// ============================================================
// services/dossier.js — génère le dossier de voyage imprimable
// (Phase 5 — chantier 4). Agrège voyage + catalogue + agenda + valise.
// ============================================================

const pad = n => String(n).padStart(2, '0');
const fmtMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } }

function section(title, inner) {
  if (!inner) return '';
  return `<section class="sec"><h2>${title}</h2>${inner}</section>`;
}

function buildDossierHTML(trip) {
  const dest = (window.DESTINATIONS || []).find(d => d.id === trip.destinationId) || {};
  const FR_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const FR_MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
  const sMeta = tripStatusMeta(trip.status);

  // ── Transport / hébergement / activités (statuts) ──
  const tr = trip.transport || {};
  const hb = trip.hebergement || {};
  const transportRows = `
    <tr><td>Mode</td><td>${esc(tr.label || tr.mode || dest.vol || '—')}</td></tr>
    <tr><td>Statut</td><td>${elStatusMeta('transport', tr.status).label}</td></tr>
    ${dest.vol_prix ? `<tr><td>Prix</td><td>${esc(dest.vol_prix)}</td></tr>` : ''}`;
  const hebRows = `
    <tr><td>Hébergement</td><td>${esc(hb.nom || dest.logement || '—')}</td></tr>
    <tr><td>Statut</td><td>${elStatusMeta('hebergement', hb.status).label}</td></tr>`;
  const actRows = (trip.activites || []).map(a =>
    `<tr><td>${esc(a.nom)}</td><td>${elStatusMeta('activite', a.status).label}</td></tr>`).join('');

  // ── Planning (agenda) ──
  const ag = readJSON('voyagemanager_agenda')[trip.destinationId];
  let planningHTML = '';
  if (ag && (ag.blocks || []).length) {
    const days = {};
    ag.blocks.forEach(b => { (days[b.day] = days[b.day] || []).push(b); });
    planningHTML = Object.keys(days).sort().map(iso => {
      const dt = new Date(iso);
      const blocks = days[iso].sort((a, b) => a.start - b.start);
      return `<div class="day"><h3>${FR_DAYS[dt.getDay()]} ${dt.getDate()} ${FR_MONTHS[dt.getMonth()]}</h3>
        <table>${blocks.map(b => `<tr><td class="t">${fmtMin(b.start)}–${fmtMin(b.start + b.dur)}</td><td>${esc((b.emoji || '') + ' ' + b.label)}</td></tr>`).join('')}</table></div>`;
    }).join('');
  }

  // ── Check-list valise ──
  const valise = readJSON('voyagemanager_valises')[trip.destinationId];
  let valiseHTML = '';
  if (valise) {
    valiseHTML = Object.entries(valise).map(([cat, items]) =>
      `<div class="vcat"><h4>${esc(cat)}</h4><ul>${Object.entries(items).map(([it, done]) =>
        `<li><span class="box ${done ? 'x' : ''}"></span>${esc(it)}</li>`).join('')}</ul></div>`).join('');
  }

  // ── Restaurants / liens / urgences ──
  const restos = (dest.restaurants || []).map(r =>
    `<tr><td>${esc(r.nom)}</td><td>${esc(r.note || '')} ${esc(r.prix || '')}</td><td>${esc(r.tel || '')}</td></tr>`).join('');
  const liens = (dest.liens || []).map(l => `<li>${esc(l.label)} — ${esc(l.url)}</li>`).join('');
  const urgences = (dest.urgences || []).map(u => `<tr><td>${esc(u.service)}</td><td>${esc(u.tel)}</td></tr>`).join('');

  const dates = trip.date_depart ? `${esc(trip.date_depart)} → ${esc(trip.date_retour || '?')}` : 'À définir';
  const participants = (trip.participants || []).map(p => esc(p.nom || p)).join(', ') || 'Clément & Madame';
  const today = new Date().toLocaleDateString('fr-FR');

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Dossier de voyage — ${esc(trip.nom)}</title>
  <style>
    *{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#111;margin:22px;font-size:12px;line-height:1.4}
    header{border-bottom:3px solid #111;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end}
    header h1{font-size:22px;margin:0}.hsub{color:#555;font-size:12px;margin-top:4px}
    .badge{display:inline-block;border:1px solid #888;border-radius:99px;padding:2px 10px;font-size:11px;margin-top:6px}
    .sec{break-inside:avoid;margin-bottom:16px}
    .sec h2{font-size:14px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #999;padding-bottom:4px;margin:0 0 8px}
    table{width:100%;border-collapse:collapse;margin-bottom:6px}
    td{padding:3px 6px;border-bottom:1px solid #eee;vertical-align:top}
    td.t{white-space:nowrap;color:#555;width:96px;font-weight:600}
    .day{break-inside:avoid;margin-bottom:8px}.day h3{font-size:12.5px;margin:0 0 3px;color:#222}
    .cols2{column-count:2;column-gap:22px}
    .vcat{break-inside:avoid;margin-bottom:8px}.vcat h4{font-size:12px;margin:0 0 4px;text-transform:uppercase;color:#444}
    .vcat ul{list-style:none;margin:0;padding:0}.vcat li{display:flex;gap:7px;align-items:center;padding:1px 0}
    .box{width:11px;height:11px;border:1.4px solid #111;border-radius:2px;display:inline-block;flex:0 0 auto}
    .box.x{background:#111;position:relative}
    footer{margin-top:18px;border-top:1px solid #ccc;padding-top:8px;font-size:10px;color:#888;display:flex;justify-content:space-between}
    @media print{body{margin:12mm}.no-print{display:none}}
    button{font-size:13px;padding:8px 16px;border:1px solid #111;background:#111;color:#fff;border-radius:6px;cursor:pointer}
  </style></head><body>
    <div class="no-print" style="margin-bottom:14px"><button onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button></div>
    <header>
      <div>
        <h1>${esc(dest.emoji || '✈️')} Dossier de voyage — ${esc(trip.nom)}</h1>
        <div class="hsub">${esc(dest.pays || '')} · ${dates} · Participants : ${participants}</div>
        <span class="badge">${sMeta.label}</span>
      </div>
      <div style="text-align:right;font-size:11px;color:#555">Édité le ${today}<br>VoyageManager</div>
    </header>

    ${section('🧭 Informations générales', `<table>
      <tr><td class="t">Destination</td><td>${esc(dest.nom || trip.nom)}</td></tr>
      <tr><td class="t">Dates</td><td>${dates}</td></tr>
      <tr><td class="t">Budget estimé</td><td>${trip.budget ? `${trip.budget.min}–${trip.budget.max} €` : '—'}</td></tr>
      ${dest.meteo ? `<tr><td class="t">Météo</td><td>${Object.entries(dest.meteo).map(([k, v]) => `${k} : ${esc(v)}`).join(' · ')}</td></tr>` : ''}
    </table>`)}

    ${section('✈️ Transport', `<table>${transportRows}</table>`)}
    ${section('🏨 Hébergement', `<table>${hebRows}</table>`)}
    ${section('🎫 Réservations & activités', actRows ? `<table><tr><td><strong>Élément</strong></td><td><strong>Statut</strong></td></tr>${actRows}</table>` : '')}
    ${section('📆 Planning', planningHTML ? `<div class="cols2">${planningHTML}</div>` : '<p style="color:#888">Aucun planning généré.</p>')}
    ${section('🍽️ Restaurants', restos ? `<table>${restos}</table>` : '')}
    ${section('🔗 Liens utiles', liens ? `<ul>${liens}</ul>` : '')}
    ${section('🚨 Urgences', urgences ? `<table>${urgences}</table>` : '')}
    ${section('🧳 Check-list valise', valiseHTML ? `<div class="cols2">${valiseHTML}</div>` : '<p style="color:#888">Aucune valise préparée.</p>')}
    ${section('📝 Notes', trip.notes ? `<p>${esc(trip.notes)}</p>` : '<p style="color:#888">—</p>')}

    <footer><span>VoyageManager — Clément &amp; Madame</span><span>Bon voyage ✈️</span></footer>
    <script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script>
  </body></html>`;
}

function openDossier(trip) {
  const html = buildDossierHTML(trip);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
