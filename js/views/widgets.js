// ============================================================
// views/widgets.js — composants réutilisables transverses
//   • bande saisonnière (12 mois) : « quand y aller ? »
//   • convertisseur de devises
//   • section « retirer et changer de l'argent »
// Utilisés par la fiche destination, la préparation de voyage
// et le module road trip — un seul rendu pour tous.
// ============================================================
(function () {

// ══════════════════════════════════════════════════════════
//  BANDE SAISONNIÈRE
// ══════════════════════════════════════════════════════════
/**
 * Bande de 12 cases colorées + légende. Lisible d'un coup d'œil,
 * et accessible : chaque mois porte son libellé complet.
 * @param {object} dest
 * @param {{highlight?:number[], compact?:boolean}} [opts] mois à souligner (1-12)
 */
function seasonStripHTML(dest, opts) {
  const p = seasonProfileFor(dest);
  if (!p) return '';
  const o = opts || {};
  const hl = new Set(o.highlight || []);
  const now = new Date().getMonth() + 1;

  const cells = p.months.map((score, i) => {
    const m = seasonMeta(score);
    const month = i + 1;
    return `<div class="season-cell s${score}${hl.has(month) ? ' is-target' : ''}${month === now ? ' is-now' : ''}"
      title="${escAttr(MONTHS_FULL[i] + ' — ' + m.label)}">
      <span class="season-m" aria-hidden="true">${MONTHS_SHORT[i]}</span>
      <span class="visually-hidden">${escHtml(MONTHS_FULL[i])} : ${escHtml(m.label)}</span>
    </div>`;
  }).join('');

  const legend = SEASON_LABELS.slice().reverse().map(l =>
    `<span class="season-key"><i class="s${l.key}"></i>${escHtml(l.short)}</span>`).join('');

  return `<div class="season-block">
    <div class="season-head">
      <strong>🗓️ Meilleure période : ${escHtml(bestMonthsLabel(dest))}</strong>
    </div>
    <div class="season-strip" role="img"
         aria-label="Qualité de la période mois par mois pour ${escAttr(shortName(dest))}">${cells}</div>
    <div class="season-legend">${legend}</div>
    ${o.compact ? '' : `<p class="hint">${escHtml(p.why)}</p>
      ${p.avoid ? `<p class="hint txt-yellow">À éviter : ${escHtml(p.avoid)}</p>` : ''}
      ${dest.periode_eviter ? `<p class="hint txt-yellow">${escHtml(dest.periode_eviter)}</p>` : ''}`}
  </div>`;
}

/** Encart d'alerte quand les dates choisies tombent en mauvaise saison. */
function seasonVerdictHTML(dest, start, end) {
  const ev = evaluatePeriod(dest, start, end);
  if (!ev) return '';
  const cls = ev.worst === 0 ? 'danger' : ev.worst === 1 ? 'warning' : 'success';
  return `<div class="info-box ${cls}">
    <strong>${escHtml(seasonMeta(ev.worst).label)}</strong> pour ${escHtml(ev.label)} — ${escHtml(ev.advice)}
  </div>`;
}

// ══════════════════════════════════════════════════════════
//  CONVERTISSEUR DE DEVISES
// ══════════════════════════════════════════════════════════
const conv = { from: 'EUR', to: 'GBP', amount: 100 };

function currencyOptions(selected) {
  const codes = [...new Set(Object.values(COUNTRIES).map(c => c.devise))].sort();
  if (!codes.includes('EUR')) codes.unshift('EUR');
  return codes.map(c => `<option value="${escAttr(c)}"${c === selected ? ' selected' : ''}>${escHtml(currencyLabel(c))}</option>`).join('');
}

/**
 * Ouvre le convertisseur. `pays` pré-sélectionne la devise d'arrivée.
 */
function openConverter(pays) {
  if (pays) {
    const code = currencyOf(pays);
    if (code && code !== 'EUR') conv.to = code;
  }
  const ov = ensureOverlay('converter-overlay', 'conv-title');
  ov.innerHTML = `
    <div class="modal modal-narrow" role="document">
      <div class="modal-header">
        <span class="modal-emoji" aria-hidden="true">💱</span>
        <div class="modal-title">
          <h2 id="conv-title">Convertisseur de devises</h2>
          <p class="modal-sub" id="conv-source">Chargement des taux…</p>
        </div>
        <button type="button" class="modal-close" data-conv-close aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <div class="conv-row">
          <div class="adv-field">
            <label for="conv-amount">Montant</label>
            <input type="number" id="conv-amount" min="0" step="any" value="${escAttr(conv.amount)}">
          </div>
          <div class="adv-field flex-2">
            <label for="conv-from">Devise de départ</label>
            <select id="conv-from">${currencyOptions(conv.from)}</select>
          </div>
        </div>
        <div class="conv-swap-row">
          <button type="button" class="btn btn-outline btn-sm" data-conv-swap aria-label="Inverser les devises">⇅ Inverser</button>
        </div>
        <div class="conv-row">
          <div class="adv-field flex-2">
            <label for="conv-to">Devise d'arrivée</label>
            <select id="conv-to">${currencyOptions(conv.to)}</select>
          </div>
        </div>
        <output class="conv-result" id="conv-result" aria-live="polite">…</output>
        <div class="conv-quick" id="conv-quick"></div>
        <p class="hint" id="conv-note"></p>
      </div>
    </div>`;

  ov.querySelector('[data-conv-close]').addEventListener('click', () => closeOverlay(ov));
  delegate(ov, 'input', '#conv-amount', debounce(() => refreshConverter(), 250));
  delegate(ov, 'change', '#conv-from,#conv-to', () => refreshConverter());
  delegate(ov, 'click', '[data-conv-swap]', () => {
    const f = $('#conv-from'), t = $('#conv-to');
    const tmp = f.value; f.value = t.value; t.value = tmp;
    refreshConverter();
  });
  openOverlay(ov);
  refreshConverter();
}

async function refreshConverter() {
  const amountEl = $('#conv-amount'), fromEl = $('#conv-from'), toEl = $('#conv-to');
  if (!amountEl) return;
  conv.amount = parseFloat(amountEl.value);
  conv.from = fromEl.value;
  conv.to = toEl.value;
  const out = $('#conv-result');
  if (!isFinite(conv.amount)) { out.textContent = '—'; return; }

  const r = await convert(conv.amount, conv.from, conv.to);
  if (r.value == null) { out.textContent = 'Taux indisponible pour ce couple de devises.'; return; }

  out.innerHTML = `<span class="conv-in">${escHtml(fmtMoney(conv.amount, conv.from))}</span>
    <span class="conv-arrow" aria-hidden="true">=</span>
    <span class="conv-out">${escHtml(fmtMoney(r.value, conv.to))}</span>`;

  const src = $('#conv-source');
  if (src) {
    src.textContent = r.live
      ? `Taux BCE du ${r.date}`
      : `Taux indicatif figé au ${r.date} — pas de connexion aux taux du jour`;
    src.className = 'modal-sub' + (r.live ? '' : ' txt-yellow');
  }
  const note = $('#conv-note');
  if (note) note.textContent = `1 ${conv.from} = ${r.rate.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} ${conv.to}`;

  // Repères rapides : combien vaut un billet courant
  const quick = $('#conv-quick');
  if (quick) {
    const steps = [10, 20, 50, 100, 200];
    const rows = await Promise.all(steps.map(async v => {
      const c = await convert(v, conv.from, conv.to);
      return `<div class="conv-chip"><span>${escHtml(fmtMoney(v, conv.from))}</span><strong>${escHtml(fmtMoney(c.value, conv.to))}</strong></div>`;
    }));
    quick.innerHTML = rows.join('');
  }
}

// ══════════════════════════════════════════════════════════
//  ARGENT SUR PLACE
// ══════════════════════════════════════════════════════════
/** Section « retirer et changer de l'argent », vide si zone euro. */
function moneySectionHTML(dest) {
  const c = countryInfo(dest.pays);
  if (c.euro) {
    return `<div class="info-box success">💶 <strong>Zone euro</strong> — aucune conversion ni retrait de devise à prévoir.</div>`;
  }
  const res = cashResources(dest);
  const link = l => `<a class="money-link" href="${safeUrl(l.url)}" target="_blank" rel="noopener noreferrer">
      <span class="money-link-label">${escHtml(l.label)}</span>
      <span class="money-link-aide">${escHtml(l.aide)}</span>
    </a>`;
  return `
    <div class="money-head">
      <div>
        <strong>${escHtml(c.nomDevise || c.devise)} (${escHtml(c.devise)})</strong>
        <span class="hint" id="money-rate-${escAttr(dest.id)}">…</span>
      </div>
      <button type="button" class="btn btn-primary btn-sm" data-open-converter="${escAttr(dest.pays)}">💱 Convertisseur</button>
    </div>
    <h4 class="section-title">🏧 Sur place — ${escHtml(shortName(dest))}</h4>
    <div class="money-links">${res.surPlace.map(link).join('')}</div>
    <h4 class="section-title">💳 Avant de partir</h4>
    <div class="money-links">${res.avantDepart.map(link).join('')}</div>
    <h4 class="section-title">💡 À savoir</h4>
    <ul class="dot-list dot-yellow">${res.conseils.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>`;
}

/** Complète le taux affiché dans l'en-tête de la section argent. */
async function fillMoneyRate(dest) {
  const el = document.getElementById('money-rate-' + dest.id);
  if (!el) return;
  const r = await rateFor(dest.pays);
  if (!r) { el.textContent = ''; return; }
  el.textContent = `· 1 € ≈ ${r.rate.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} ${r.code} · `
    + (r.fixe ? 'parité fixe' : r.live ? `taux BCE du ${r.date}` : `taux figé au ${r.date}`);
  el.className = 'hint' + (r.live || r.fixe ? '' : ' txt-yellow');
}

// Le convertisseur est accessible depuis n'importe où
delegate(document, 'click', '[data-open-converter]', (e, el) => openConverter(el.dataset.openConverter));

Object.assign(window, {
  seasonStripHTML, seasonVerdictHTML, openConverter, moneySectionHTML, fillMoneyRate,
});
})();
