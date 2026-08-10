// ============================================================
// core/dom.js — helpers DOM, échappement, délégation, toast
// Chargé en PREMIER : tout le reste en dépend.
// ============================================================

/** Échappe une valeur pour une insertion sûre dans du HTML *texte*. */
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Échappe une valeur destinée à un attribut HTML (guillemets doubles). */
const escAttr = escHtml;

/** Échappe une valeur destinée à une URL. */
const escUrl = s => encodeURIComponent(String(s == null ? '' : s));

/**
 * Filtre une URL fournie par les données : seuls http(s), mailto et tel passent.
 * Bloque `javascript:` et `data:` (vecteurs d'injection via un lien de fiche).
 */
function safeUrl(u) {
  const s = String(u == null ? '' : u).trim();
  if (!s) return '';
  if (/^(https?:|mailto:|tel:)/i.test(s)) return escHtml(s);
  if (/^\/|^\.\//.test(s)) return escHtml(s); // chemin relatif interne
  return '';
}

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function debounce(fn, ms) {
  let timer;
  return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
}

/**
 * Variante indispensable en délégation d'événements : le handler est
 * partagé par tous les éléments correspondants, si bien qu'un debounce
 * global fusionne les saisies faites dans des champs DIFFÉRENTS et ne
 * conserve que la dernière. Ici chaque élément a sa propre minuterie.
 *
 * @param {(e:Event, el:Element)=>void} fn
 * @param {number} ms
 * @param {(el:Element)=>string} [keyOf] identifiant de regroupement
 */
function debouncePerTarget(fn, ms, keyOf) {
  const timers = new Map();
  return function (e, el) {
    const key = keyOf ? keyOf(el) : el;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => { timers.delete(key); fn.call(this, e, el); }, ms));
  };
}

/**
 * Délégation d'événement : remplace les `onclick="..."` inline.
 * Permet une CSP stricte et supprime le besoin de fonctions globales.
 */
function delegate(root, event, selector, handler) {
  const el = typeof root === 'string' ? $(root) : root;
  if (!el) return () => {};
  const fn = e => {
    const target = e.target.closest(selector);
    if (target && el.contains(target)) handler(e, target);
  };
  el.addEventListener(event, fn);
  return () => el.removeEventListener(event, fn);
}

// ── TOAST ────────────────────────────────────────────────
let _toastTimer = null;
/**
 * Affiche un message éphémère.
 * @param {string} msg
 * @param {{action?:string, onAction?:Function, tone?:'ok'|'error'|'info', ms?:number}} [opts]
 */
function showToast(msg, opts) {
  const o = opts || {};
  const t = $('#toast');
  if (!t) return;
  clearTimeout(_toastTimer);
  t.className = 'toast' + (o.tone ? ' ' + o.tone : '');
  t.innerHTML = `<span class="toast-msg">${escHtml(msg)}</span>` +
    (o.action ? `<button type="button" class="toast-action">${escHtml(o.action)}</button>` : '');
  if (o.action && o.onAction) {
    t.querySelector('.toast-action').addEventListener('click', () => {
      t.classList.remove('show');
      o.onAction();
    }, { once: true });
  }
  t.classList.add('show');
  _toastTimer = setTimeout(() => t.classList.remove('show'), o.ms || (o.action ? 6000 : 3000));
}

// ── MODALES : focus trap + restauration + inertisation du fond ──
const _modalStack = [];

function _focusables(root) {
  return $$('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', root)
    .filter(el => !el.disabled && el.offsetParent !== null);
}

function _trapHandler(e) {
  if (e.key !== 'Tab') return;
  const top = _modalStack[_modalStack.length - 1];
  if (!top) return;
  const f = _focusables(top.el);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/** Ouvre un overlay de modale : piège le focus, neutralise le fond, mémorise le retour. */
function openOverlay(overlay) {
  const el = typeof overlay === 'string' ? $(overlay) : overlay;
  if (!el || _modalStack.some(m => m.el === el)) return;
  _modalStack.push({ el, prevFocus: document.activeElement });
  el.classList.remove('hidden');
  el.removeAttribute('aria-hidden');
  document.body.classList.add('has-modal');
  // Le contenu de fond ne doit plus être atteignable (clavier ni lecteur d'écran)
  if (_modalStack.length === 1) {
    ['.sidebar', 'main', '.sidebar-toggle'].forEach(s => { const n = $(s); if (n) n.inert = true; });
  }
  if (_modalStack.length === 1) document.addEventListener('keydown', _trapHandler);
  requestAnimationFrame(() => {
    const f = _focusables(el);
    (f[0] || el).focus();
  });
}

/** Ferme un overlay et rend le focus à l'élément d'origine. */
function closeOverlay(overlay) {
  const el = typeof overlay === 'string' ? $(overlay) : overlay;
  const i = _modalStack.findIndex(m => m.el === el);
  if (i < 0) { if (el) el.classList.add('hidden'); return; }
  const entry = _modalStack.splice(i, 1)[0];
  el.classList.add('hidden');
  el.setAttribute('aria-hidden', 'true');
  if (!_modalStack.length) {
    document.removeEventListener('keydown', _trapHandler);
    document.body.classList.remove('has-modal');
    ['.sidebar', 'main', '.sidebar-toggle'].forEach(s => { const n = $(s); if (n) n.inert = false; });
  }
  if (entry.prevFocus && document.contains(entry.prevFocus)) entry.prevFocus.focus();
}

/** Ferme l'overlay le plus haut de la pile. Renvoie true si quelque chose a été fermé. */
function closeTopOverlay() {
  const top = _modalStack[_modalStack.length - 1];
  if (!top) return false;
  closeOverlay(top.el);
  return true;
}

/** Crée (une seule fois) un overlay de modale et le renvoie. */
function ensureOverlay(id, labelledBy) {
  let ov = document.getElementById(id);
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = id;
  ov.className = 'modal-overlay hidden';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-hidden', 'true');
  if (labelledBy) ov.setAttribute('aria-labelledby', labelledBy);
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) closeOverlay(ov); });
  return ov;
}

// ── DIALOGUES (remplacent confirm() / prompt() natifs) ──
/**
 * Confirmation stylée. Renvoie une Promise<boolean>.
 * @param {{title:string, message?:string, confirmLabel?:string, cancelLabel?:string, danger?:boolean}} o
 */
function vmConfirm(o) {
  return new Promise(resolve => {
    const ov = ensureOverlay('vm-confirm-overlay');
    ov.innerHTML = `
      <div class="modal modal-narrow" role="document">
        <div class="modal-body">
          <h2 class="dlg-title">${escHtml(o.title)}</h2>
          ${o.message ? `<p class="dlg-msg">${escHtml(o.message)}</p>` : ''}
          <div class="dlg-actions">
            <button type="button" class="btn ${o.danger ? 'btn-danger' : 'btn-success'}" data-ok>${escHtml(o.confirmLabel || 'Confirmer')}</button>
            <button type="button" class="btn btn-outline" data-cancel>${escHtml(o.cancelLabel || 'Annuler')}</button>
          </div>
        </div>
      </div>`;
    const done = v => { closeOverlay(ov); resolve(v); };
    ov.querySelector('[data-ok]').addEventListener('click', () => done(true));
    ov.querySelector('[data-cancel]').addEventListener('click', () => done(false));
    ov.addEventListener('vm:dismiss', () => resolve(false), { once: true });
    openOverlay(ov);
  });
}

/**
 * Saisie de texte stylée. Renvoie une Promise<string|null>.
 * @param {{title:string, label?:string, value?:string, placeholder?:string, confirmLabel?:string}} o
 */
function vmPrompt(o) {
  return new Promise(resolve => {
    const ov = ensureOverlay('vm-prompt-overlay');
    const inputId = 'vm-prompt-input';
    ov.innerHTML = `
      <div class="modal modal-narrow" role="document">
        <div class="modal-body">
          <h2 class="dlg-title">${escHtml(o.title)}</h2>
          <div class="adv-field">
            <label for="${inputId}">${escHtml(o.label || 'Valeur')}</label>
            <input id="${inputId}" class="add-item-input" type="text"
                   value="${escAttr(o.value || '')}" placeholder="${escAttr(o.placeholder || '')}">
          </div>
          <div class="dlg-actions">
            <button type="button" class="btn btn-success" data-ok>${escHtml(o.confirmLabel || 'Valider')}</button>
            <button type="button" class="btn btn-outline" data-cancel>Annuler</button>
          </div>
        </div>
      </div>`;
    const input = ov.querySelector('#' + inputId);
    const done = v => { closeOverlay(ov); resolve(v); };
    ov.querySelector('[data-ok]').addEventListener('click', () => done(input.value.trim() || null));
    ov.querySelector('[data-cancel]').addEventListener('click', () => done(null));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); done(input.value.trim() || null); }
    });
    ov.addEventListener('vm:dismiss', () => resolve(null), { once: true });
    openOverlay(ov);
    requestAnimationFrame(() => { input.focus(); input.select(); });
  });
}

// Échap ferme l'overlay le plus haut (et notifie les dialogues en attente)
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const top = _modalStack[_modalStack.length - 1];
  if (!top) return;
  e.preventDefault();
  top.el.dispatchEvent(new CustomEvent('vm:dismiss'));
  closeTopOverlay();
});

Object.assign(window, {
  escHtml, escAttr, escUrl, safeUrl, $, $$, debounce, debouncePerTarget, delegate, showToast,
  openOverlay, closeOverlay, closeTopOverlay, ensureOverlay, vmConfirm, vmPrompt,
});
