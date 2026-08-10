// ============================================================
// core/history.js — journal d'activité (partagé entre profils)
// ============================================================

const HIST_KEY = 'vm_history';
const HIST_MAX = 500;

function getHistory() {
  try { return JSON.parse(window.__rawLS.get(HIST_KEY) || '[]'); } catch { return []; }
}

function logHistory(action, target) {
  try {
    const cp = (window.vmCurrentProfile && vmCurrentProfile()) || {};
    const h = getHistory();
    h.unshift({ user: cp.nom || '?', role: cp.role || '', action, target: target || '', ts: Date.now() });
    if (h.length > HIST_MAX) h.length = HIST_MAX;
    window.__rawLS.set(HIST_KEY, JSON.stringify(h));
    if (window.currentPage === 'historique') buildHistorique();
  } catch (e) { console.warn('[history]', e); }
}

async function clearHistory() {
  const ok = await vmConfirm({
    title: 'Vider l\'historique ?',
    message: 'Toutes les entrées du journal d\'activité seront supprimées. Cette action est définitive.',
    confirmLabel: 'Vider', danger: true,
  });
  if (!ok) return;
  window.__rawLS.set(HIST_KEY, '[]');
  buildHistorique();
  showToast('🧹 Historique vidé');
}

function buildHistorique() {
  const mount = $('#historique-mount');
  if (!mount) return;
  const h = getHistory();
  const cnt = $('#historique-count');
  if (cnt) cnt.textContent = h.length + ' entrée' + (h.length > 1 ? 's' : '');
  if (!h.length) {
    mount.innerHTML = '<div class="pin-empty">Aucune activité enregistrée pour le moment.</div>';
    return;
  }
  const fmt = ts => {
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR') + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  mount.innerHTML = h.slice(0, 300).map(e => `
    <div class="hist-item">
      <span class="hist-ico" aria-hidden="true">${e.role === 'admin' ? '🧭' : '👤'}</span>
      <div class="hist-main"><span class="hist-who">${escHtml(e.user)}</span> — ${escHtml(e.action)}${e.target ? ' : <strong>' + escHtml(e.target) + '</strong>' : ''}</div>
      <span class="hist-when">${escHtml(fmt(e.ts))}</span>
    </div>`).join('');
}

Object.assign(window, { HIST_KEY, getHistory, logHistory, clearHistory, buildHistorique });
