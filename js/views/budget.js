// ============================================================
// views/budget.js — comparateur de budgets + suivi des dépenses
//
// Corrigés : les destinations archivées sont exclues (elles étaient
// listées ici seules parmi toutes les vues), le catalogue vide ne
// produit plus de NaN, et les dépenses sont éditables et datées.
// ============================================================
(function () {

let trackerTrip = null;

const CATS = {
  Transport: '✈️', Hébergement: '🏨', Restauration: '🍽️',
  Activités: '🎯', Shopping: '🛍️', Divers: '📦',
};

// ── Tableau comparatif ───────────────────────────────────
function buildBudget() {
  const tbody = $('#budget-tbody');
  if (!tbody) return;
  const list = activeDests();
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="hint">Aucune destination à comparer.</td></tr>';
    return;
  }
  const maxB = Math.max(1, ...list.map(d => d.budget_max || 0));
  tbody.innerHTML = list.map(d => {
    const s = statutMeta(d.statut);
    const pct = Math.round((d.budget_min || 0) / maxB * 100);
    let perDay = '—';
    if (d.date_depart && d.date_retour) {
      const nb = Math.round((new Date(d.date_retour) - new Date(d.date_depart)) / 86400000);
      if (nb > 0) perDay = Math.round((d.budget_max || 0) / nb) + '€/j';
    }
    const barColor = pct < 50 ? 'var(--green)' : pct < 75 ? 'var(--yellow)' : 'var(--red)';
    return `<tr data-budget-dest="${escAttr(d.id)}" tabindex="0" role="button"
                aria-label="Ouvrir la fiche ${escAttr(d.nom)}">
      <td><strong>${escHtml((d.emoji || '') + ' ' + d.nom)}</strong><br><span class="hint">${escHtml(d.pays)}</span></td>
      <td><span class="badge badge-${escAttr(s.cls)}">${escHtml(s.label)}</span></td>
      <td>${escHtml(d.vol_prix || '—')}</td>
      <td class="txt-green num">${escHtml(d.budget_min || 0)}€</td>
      <td class="txt-yellow num">${escHtml(d.budget_max || 0)}€</td>
      <td>
        <div class="txt-accent bold">${escHtml(perDay)}</div>
        <div class="budget-bar"><div class="budget-bar-inner" style="width:${pct}%;background:${barColor}"></div></div>
      </td>
    </tr>`;
  }).join('');
}

// ── Suivi des dépenses ───────────────────────────────────
function trackerBuildSelect() {
  const sel = $('#tracker-dest-select');
  if (!sel) return;
  const trips = getTrips().filter(t => t.status !== 'archive');
  sel.innerHTML = '<option value="">— Sélectionner un voyage —</option>'
    + trips.map(t => `<option value="${escAttr(t.id)}">${escHtml(tripLabel(t))}</option>`).join('');
  if (trackerTrip && trips.some(t => t.id === trackerTrip)) sel.value = trackerTrip;
}

function trackerLoad() {
  const sel = $('#tracker-dest-select');
  const content = $('#tracker-content');
  const label = $('#tracker-budget-label');
  if (!sel || !content) return;
  const id = sel.value;
  trackerTrip = id || null;
  if (!id) { content.hidden = true; if (label) label.textContent = ''; return; }
  const t = getTrip(id);
  if (label) {
    label.textContent = (t && t.budget && t.budget.max)
      ? `Budget estimé : ${t.budget.min}€ – ${t.budget.max}€` : '';
  }
  content.hidden = false;
  trackerRender();
}

function trackerRender() {
  if (!trackerTrip) return;
  const expenses = getExpenses(trackerTrip).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const list = $('#expense-list');
  const summary = $('#budget-summary');

  list.innerHTML = expenses.length ? expenses.map(e => `
    <div class="expense-item" data-exp="${escAttr(e.id)}">
      <span class="exp-cat">${escHtml(CATS[e.cat] || '📦')} ${escHtml(e.cat)}</span>
      <span class="exp-label">${escHtml(e.label)}</span>
      <span class="exp-date">${escHtml(e.date || '')}</span>
      <span class="exp-amount">${escHtml(Number(e.amount).toFixed(2))} €</span>
      <button type="button" class="exp-edit" data-edit-exp="${escAttr(e.id)}"
              aria-label="Modifier ${escAttr(e.label)}">✏</button>
      <button type="button" class="exp-del" data-del-exp="${escAttr(e.id)}"
              aria-label="Supprimer ${escAttr(e.label)}">✕</button>
    </div>`).join('')
    : '<p class="hint">Aucune dépense enregistrée.</p>';

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const byCat = {};
  expenses.forEach(e => { byCat[e.cat] = (byCat[e.cat] || 0) + Number(e.amount || 0); });
  const t = getTrip(trackerTrip);
  const budgetMax = (t && t.budget && t.budget.max) || null;
  const over = budgetMax && total > budgetMax;

  summary.innerHTML = `
    <div class="budget-summary-card">
      <div class="bsc-val ${over ? 'budget-over' : 'budget-ok'}">${total.toFixed(0)} €</div>
      <div class="bsc-label">Total dépensé</div>
    </div>
    ${budgetMax ? `<div class="budget-summary-card">
      <div class="bsc-val ${over ? 'budget-over' : 'budget-ok'}">${Math.abs(budgetMax - total).toFixed(0)} €</div>
      <div class="bsc-label">${over ? 'Dépassement' : 'Restant'}</div>
    </div>` : ''}
    ${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => `
      <div class="budget-summary-card">
        <div class="bsc-val bsc-small">${amt.toFixed(0)} €</div>
        <div class="bsc-label">${escHtml(CATS[cat] || '')} ${escHtml(cat)}</div>
      </div>`).join('')}`;
}

function trackerAdd() {
  if (!trackerTrip) return;
  const cat = $('#exp-cat').value;
  const label = $('#exp-label').value.trim();
  const amount = parseFloat($('#exp-amount').value);
  const date = $('#exp-date').value || todayISO();
  if (!label || isNaN(amount) || amount <= 0) {
    showToast('⚠️ Renseigne une description et un montant positif', { tone: 'error' });
    return;
  }
  const list = getExpenses(trackerTrip).slice();
  list.push({ id: 'e' + Date.now().toString(36), cat, label, amount, date });
  setExpenses(trackerTrip, list);
  $('#exp-label').value = '';
  $('#exp-amount').value = '';
  trackerRender();
  showToast('✓ Dépense ajoutée');
}

function trackerDelete(id) {
  const list = getExpenses(trackerTrip);
  const item = list.find(e => e.id === id);
  setExpenses(trackerTrip, list.filter(e => e.id !== id));
  trackerRender();
  if (item) {
    pushUndo(`Dépense « ${item.label} » supprimée`, () => {
      setExpenses(trackerTrip, getExpenses(trackerTrip).concat([item]));
      trackerRender();
    });
  }
}

async function trackerEdit(id) {
  const list = getExpenses(trackerTrip).slice();
  const item = list.find(e => e.id === id);
  if (!item) return;
  const label = await vmPrompt({ title: 'Modifier la dépense', label: 'Description', value: item.label });
  if (label == null) return;
  const amountStr = await vmPrompt({ title: 'Modifier la dépense', label: 'Montant (€)', value: String(item.amount) });
  if (amountStr == null) return;
  const amount = parseFloat(amountStr.replace(',', '.'));
  if (isNaN(amount) || amount <= 0) { showToast('⚠️ Montant invalide', { tone: 'error' }); return; }
  item.label = label;
  item.amount = amount;
  setExpenses(trackerTrip, list);
  trackerRender();
  showToast('✅ Dépense modifiée');
}

// ── Câblage ──────────────────────────────────────────────
function init() {
  const page = document.getElementById('page-budget');
  if (!page) return;
  delegate(page, 'click', '[data-budget-dest]', (e, el) => openDest(el.dataset.budgetDest));
  delegate(page, 'keydown', '[data-budget-dest]', (e, el) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDest(el.dataset.budgetDest); }
  });
  delegate(page, 'change', '#tracker-dest-select', trackerLoad);
  delegate(page, 'click', '[data-add-exp]', trackerAdd);
  delegate(page, 'keydown', '#exp-label,#exp-amount', e => { if (e.key === 'Enter') { e.preventDefault(); trackerAdd(); } });
  delegate(page, 'click', '[data-del-exp]', (e, el) => trackerDelete(el.dataset.delExp));
  delegate(page, 'click', '[data-edit-exp]', (e, el) => trackerEdit(el.dataset.editExp));

  const dateInput = $('#exp-date');
  if (dateInput) dateInput.value = todayISO();

  buildBudget();
  trackerBuildSelect();
  subscribe(() => { buildBudget(); trackerBuildSelect(); });
}

Object.assign(window, {
  buildBudget, trackerBuildSelect, trackerLoad, trackerRender, initBudget: init,
});
})();
