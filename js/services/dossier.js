// ============================================================
// services/dossier.js — dossier de voyage imprimable
// Agrège voyage + catalogue + agenda + valise + dépenses.
// Les participants viennent du voyage (plus de nom en dur).
// ============================================================
(function () {

const pad = n => String(n).padStart(2, '0');
const fmtMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const FR_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const FR_MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

function section(title, inner) {
  if (!inner) return '';
  return `<section><h2>${title}</h2>${inner}</section>`;
}

function buildDossierHTML(trip) {
  const dest = destById(trip.destinationId) || {};
  const sMeta = tripStatusMeta(trip.status);
  const tr = trip.transport || {};
  const hb = trip.hebergement || {};

  const transportRows = `
    <tr><td class="t">Mode</td><td>${escHtml(tr.label || tr.mode || dest.vol || '—')}</td></tr>
    <tr><td class="t">Statut</td><td>${escHtml(elStatusMeta('transport', tr.status).label)}</td></tr>
    ${dest.vol_prix ? `<tr><td class="t">Prix indicatif</td><td>${escHtml(dest.vol_prix)}</td></tr>` : ''}`;

  const hebRows = `
    <tr><td class="t">Hébergement</td><td>${escHtml(hb.nom || '—')}</td></tr>
    ${hb.adresse ? `<tr><td class="t">Adresse</td><td>${escHtml(hb.adresse)}</td></tr>` : ''}
    ${hb.prix ? `<tr><td class="t">Prix</td><td>${escHtml(hb.prix)}</td></tr>` : ''}
    ${hb.checkinDate ? `<tr><td class="t">Arrivée</td><td>${escHtml(hb.checkinDate + ' ' + (hb.checkinTime || ''))}</td></tr>` : ''}
    ${hb.checkoutDate ? `<tr><td class="t">Départ</td><td>${escHtml(hb.checkoutDate + ' ' + (hb.checkoutTime || ''))}</td></tr>` : ''}
    ${hb.tel ? `<tr><td class="t">Téléphone</td><td>${escHtml(hb.tel)}</td></tr>` : ''}
    ${hb.email ? `<tr><td class="t">Email</td><td>${escHtml(hb.email)}</td></tr>` : ''}
    ${hb.lien ? `<tr><td class="t">Lien</td><td>${escHtml(hb.lien)}</td></tr>` : ''}
    ${hb.notes ? `<tr><td class="t">Notes</td><td>${escHtml(hb.notes)}</td></tr>` : ''}
    <tr><td class="t">Statut</td><td>${escHtml(elStatusMeta('hebergement', hb.status).label)}</td></tr>`;

  const actRows = (trip.activites || []).map(a =>
    `<tr><td>${escHtml(a.nom)}</td><td>${escHtml(elStatusMeta('activite', a.status).label)}</td></tr>`).join('');

  // Planning
  const ag = getAgenda(trip.id);
  let planningHTML = '';
  if (ag && (ag.blocks || []).length) {
    const days = {};
    ag.blocks.forEach(b => { (days[b.day] = days[b.day] || []).push(b); });
    planningHTML = Object.keys(days).sort().map(iso => {
      const dt = new Date(iso + 'T12:00:00');
      const blocks = days[iso].sort((a, b) => a.start - b.start);
      return `<div class="day"><h3>${FR_DAYS[dt.getDay()]} ${dt.getDate()} ${FR_MONTHS[dt.getMonth()]}</h3>
        <table><tbody>${blocks.map(b =>
          `<tr><td class="t">${fmtMin(b.start)}–${fmtMin(b.start + b.dur)}</td>
               <td>${escHtml((b.emoji || '') + ' ' + b.label)}</td></tr>`).join('')}</tbody></table></div>`;
    }).join('');
  }

  // Valise
  const valise = getValise(trip.id);
  const valiseHTML = valise ? Object.entries(valise).map(([cat, items]) =>
    `<div class="vcat"><h4>${escHtml(cat)}</h4><ul>${Object.entries(items).map(([it, done]) =>
      `<li><span class="box ${done ? 'x' : ''}"></span>${escHtml(it)}</li>`).join('')}</ul></div>`).join('') : '';

  // Dépenses
  const expenses = getExpenses(trip.id);
  const expTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const expHTML = expenses.length
    ? `<table><tbody>${expenses.map(e =>
        `<tr><td class="t">${escHtml(e.date || '')}</td><td>${escHtml(e.cat)} — ${escHtml(e.label)}</td>
             <td style="text-align:right">${Number(e.amount).toFixed(2)} €</td></tr>`).join('')}
        <tr><td></td><td><strong>Total</strong></td><td style="text-align:right"><strong>${expTotal.toFixed(2)} €</strong></td></tr>
      </tbody></table>` : '';

  const restos = (dest.restaurants || []).map(r =>
    `<tr><td>${escHtml(r.nom)}</td><td>${escHtml((r.note || '') + ' ' + (r.prix || ''))}</td><td>${escHtml(r.tel || '')}</td></tr>`).join('');
  const liens = (dest.liens || []).map(l => `<li>${escHtml(l.label)} — ${escHtml(l.url)}</li>`).join('');
  const urgences = (dest.urgences || []).map(u =>
    `<tr><td>${escHtml(u.service)}</td><td>${escHtml(u.tel)}</td></tr>`).join('');

  const dates = trip.date_depart ? `${escHtml(trip.date_depart)} → ${escHtml(trip.date_retour || '?')}` : 'À définir';
  const participants = (trip.participants || []).map(p => escHtml(p.nom || p)).join(', ')
    || `${trip.travelers || pref('travelers')} voyageur(s)`;

  return `
    <style>
      .day{break-inside:avoid;margin-bottom:8px}.day h3{font-size:12.5px;margin:0 0 3px;color:#222}
      .vcat{break-inside:avoid;margin-bottom:8px}
      .vcat h4{font-size:12px;margin:0 0 4px;text-transform:uppercase;color:#444}
      .vcat li{display:flex;gap:7px;align-items:center;padding:1px 0}
      .box{width:11px;height:11px;border:1.4px solid #111;border-radius:2px;display:inline-block;flex:0 0 auto}
      .box.x{background:#111}
      .badge{display:inline-block;border:1px solid #888;border-radius:99px;padding:2px 10px;font-size:11px;margin-top:6px}
    </style>
    <header>
      <div>
        <h1>${escHtml((dest.emoji || '✈️') + ' Dossier de voyage — ' + trip.nom)}</h1>
        <div class="sub">${escHtml(dest.pays || trip.pays || '')} · ${dates} · ${participants}</div>
        <span class="badge">${escHtml(sMeta.label)}</span>
      </div>
      <div class="right">Édité le ${escHtml(new Date().toLocaleDateString('fr-FR'))}<br>VoyageManager</div>
    </header>

    ${section('🧭 Informations générales', `<table><tbody>
      <tr><td class="t">Destination</td><td>${escHtml(dest.nom || trip.nom)}</td></tr>
      <tr><td class="t">Dates</td><td>${dates}</td></tr>
      <tr><td class="t">Budget estimé</td><td>${trip.budget ? escHtml(trip.budget.min + '–' + trip.budget.max + ' €') : '—'}</td></tr>
      <tr><td class="t">Avancement</td><td>${computeTripProgress(trip)} %</td></tr>
    </tbody></table>`)}

    ${section('✈️ Transport', `<table><tbody>${transportRows}</tbody></table>`)}
    ${section('🏨 Hébergement', `<table><tbody>${hebRows}</tbody></table>`)}
    ${section('🎫 Activités', actRows ? `<table><tbody><tr><th>Élément</th><th>Statut</th></tr>${actRows}</tbody></table>` : '')}
    ${section('📆 Planning', planningHTML ? `<div class="cols2">${planningHTML}</div>` : '<p>Aucun planning généré.</p>')}
    ${section('💶 Dépenses', expHTML)}
    ${section('🍽️ Restaurants', restos ? `<table><tbody>${restos}</tbody></table>` : '')}
    ${section('🔗 Liens utiles', liens ? `<ul>${liens}</ul>` : '')}
    ${section('🚨 Urgences', urgences ? `<table><tbody>${urgences}</tbody></table>` : '')}
    ${section('🧳 Check-list valise', valiseHTML ? `<div class="cols2">${valiseHTML}</div>` : '<p>Aucune valise préparée.</p>')}
    ${section('📝 Notes', trip.notes ? `<p>${escHtml(trip.notes)}</p>` : '')}`;
}

function openDossier(trip) {
  if (!trip) return;
  vmOpenPrintable(`Dossier de voyage — ${trip.nom}`, buildDossierHTML(trip),
    { footer: 'Dossier de voyage · ' + vmCurrentName() });
}

Object.assign(window, { openDossier, buildDossierHTML });
})();
