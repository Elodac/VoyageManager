// ============================================================
// core/storage.js — accès localStorage unifié et sûr
//
// Le cloisonnement par profil est fait dans le bootstrap inline de
// index.html (il DOIT s'exécuter avant tout accès au stockage).
// Ce module fournit l'API explicite utilisée par tout le reste du code :
// plus personne n'appelle localStorage directement.
// ============================================================

/** Écriture protégée : sérialise, capte le dépassement de quota, prévient. */
function lsSet(key, val) {
  try {
    localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    return true;
  } catch (e) {
    const full = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
    if (window.showToast) {
      showToast(full
        ? '⚠️ Stockage saturé — exporte puis allège tes données (agendas, valises)'
        : '⚠️ Sauvegarde impossible : ' + (e && e.message ? e.message : 'erreur inconnue'), { tone: 'error' });
    }
    console.error('[storage] écriture impossible pour', key, e);
    return false;
  }
}

/** Lecture JSON tolérante : renvoie `fallback` si absent ou illisible. */
function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[storage] valeur illisible pour', key, e);
    return fallback;
  }
}

function lsGetRawString(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function lsRemove(key) {
  try { localStorage.removeItem(key); return true; } catch { return false; }
}

/** Clés du profil courant (préfixe `u:<profil>:` retiré). */
function lsUserKeys() {
  const prefix = 'u:' + (window.__profile || '') + ':';
  return (window.__rawLS ? window.__rawLS.keys() : [])
    .filter(k => k.indexOf(prefix) === 0)
    .map(k => k.slice(prefix.length));
}

/** Taille approximative des données du profil courant, en Ko. */
function lsUsageKo() {
  let bytes = 0;
  (window.__rawLS ? window.__rawLS.keys() : []).forEach(k => {
    const v = window.__rawLS.get(k);
    if (v) bytes += k.length + v.length;
  });
  return Math.round(bytes / 1024);
}

Object.assign(window, { lsSet, lsGet, lsGetRawString, lsRemove, lsUserKeys, lsUsageKo });
