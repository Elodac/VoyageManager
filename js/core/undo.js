// ============================================================
// core/undo.js — annulation générique
// Le pattern de l'agenda (pile de snapshots) généralisé à toute
// action destructrice : suppression de voyage, de destination,
// de road trip, vidage d'agenda, etc.
// ============================================================

const UNDO_MAX = 40;
const _undoStack = [];

/**
 * Enregistre une action annulable et propose l'annulation dans un toast.
 * @param {string} label   ex. "Voyage « Porto » supprimé"
 * @param {Function} undo  restaure l'état d'avant
 * @param {{silent?:boolean}} [opts]
 */
function pushUndo(label, undo, opts) {
  _undoStack.push({ label, undo, ts: Date.now() });
  if (_undoStack.length > UNDO_MAX) _undoStack.shift();
  if (!(opts && opts.silent)) {
    showToast(label, { action: '↩ Annuler', onAction: () => popUndo() });
  }
}

/** Annule la dernière action enregistrée. */
function popUndo() {
  const entry = _undoStack.pop();
  if (!entry) { showToast('⚠️ Rien à annuler'); return false; }
  try {
    entry.undo();
    showToast('↩️ Annulé : ' + entry.label);
    return true;
  } catch (e) {
    console.error('[undo]', e);
    showToast('⚠️ Annulation impossible', { tone: 'error' });
    return false;
  }
}

function canUndo() { return _undoStack.length > 0; }
function clearUndo() { _undoStack.length = 0; }

// Ctrl/Cmd+Z global — sauf si un champ de saisie a le focus (l'undo natif prime)
// et sauf sur la page Agenda qui gère sa propre pile.
document.addEventListener('keydown', e => {
  if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey)) return;
  const ae = document.activeElement;
  if (ae && (/^(INPUT|TEXTAREA)$/.test(ae.tagName) || ae.isContentEditable)) return;
  if (document.getElementById('page-agenda')?.classList.contains('active')) return; // agenda : pile dédiée
  if (!_undoStack.length) return;
  e.preventDefault();
  popUndo();
});

Object.assign(window, { pushUndo, popUndo, canUndo, clearUndo });
