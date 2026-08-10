// ============================================================
// views/archives.js — voyages archivés
// ============================================================
(function () {

function buildArchives() {
  const mount = $('#archives-mount');
  if (!mount) return;
  const dests = getArchivedIds().map(destById).filter(Boolean);
  const cnt = $('#archives-count');
  if (cnt) {
    cnt.textContent = dests.length
      ? `${dests.length} voyage${dests.length > 1 ? 's' : ''} archivé${dests.length > 1 ? 's' : ''}` : '';
  }
  if (!dests.length) {
    mount.className = '';
    mount.innerHTML = `<div class="pin-empty">Aucun voyage archivé pour l'instant.
      Depuis une fiche ou une carte à la une, clique sur 🗄️ pour archiver un voyage terminé.</div>`;
    return;
  }
  mount.className = 'grid grid-3';
  mount.innerHTML = dests.map(d => {
    const s = statutMeta(d.statut);
    const trip = getTripByDestination(d.id);
    return `<article class="dest-card archive-card" data-arch-dest="${escAttr(d.id)}" tabindex="0" role="button"
                     aria-label="Ouvrir la fiche ${escAttr(d.nom)}">
      <button type="button" class="planif-dismiss" data-unarchive="${escAttr(d.id)}"
              title="Réactiver ce voyage" aria-label="Réactiver ${escAttr(d.nom)}">📤</button>
      <div class="dest-emoji" aria-hidden="true">${escHtml(d.emoji)}</div>
      <h3 class="dest-name">${escHtml(d.nom)}</h3>
      <p class="dest-pays">${escHtml(d.pays)}${trip && trip.date_depart ? ' · ' + escHtml(trip.date_depart) : (d.dates ? ' · ' + escHtml(d.dates) : '')}</p>
      <span class="badge badge-${escAttr(s.cls)}">${escHtml(s.label)}</span>
      <p class="dest-budget">💶 ${escHtml(d.budget_min)}–${escHtml(d.budget_max)}€</p>
      <p class="hint">📋 Ouvrir pour relire les bons plans</p>
    </article>`;
  }).join('');
}

function init() {
  const page = document.getElementById('page-archives');
  if (!page) return;
  delegate(page, 'click', '[data-unarchive]', (e, el) => {
    e.stopPropagation();
    const id = el.dataset.unarchive;
    unarchiveDest(id);
    buildArchives();
    ['buildPinned', 'buildDashboard', 'buildBudget', 'renderDestGrid'].forEach(f => window[f] && window[f]());
    showToast('📤 Voyage réactivé');
  });
  delegate(page, 'click', '[data-arch-dest]', (e, el) => { if (!e.target.closest('button')) openDest(el.dataset.archDest); });
  delegate(page, 'keydown', '[data-arch-dest]', (e, el) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDest(el.dataset.archDest); }
  });
  subscribe(() => { if (document.getElementById('page-archives').classList.contains('active')) buildArchives(); });
}

Object.assign(window, { buildArchives, initArchives: init });
})();
