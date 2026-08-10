// ============================================================
// core/profiles.js — portail de profils, rôles, thème clair/sombre
//
// ⚠️ Ce n'est PAS de l'authentification : c'est un sélecteur d'espace
// de travail. Le contrôle d'accès réel se fait en amont (Cloudflare
// Access). Les noms de fonctions le reflètent explicitement.
// ============================================================

function vmProfile(id) { return (window.VM_PROFILES || []).find(p => p.id === id); }
function vmCurrentProfile() { return vmProfile(window.__profile) || (window.VM_PROFILES || [])[0] || {}; }
function isAdmin() { return vmCurrentProfile().role === 'admin'; }
/** Nom affiché du profil courant — utilisé dans les documents imprimés. */
function vmCurrentName() { return vmCurrentProfile().nom || 'Voyageur'; }

const PROFILE_SESSION_KEY = 'vm_profile_session';

// ── Portail ──────────────────────────────────────────────
function pgRenderProfiles() {
  const box = $('#pg-profiles');
  if (!box) return;
  box.innerHTML = (window.VM_PROFILES || []).map(p => `
    <button type="button" class="pg-profile" data-profile="${escAttr(p.id)}">
      <span class="pg-avatar" style="background:${escAttr(p.color)}22;border-color:${escAttr(p.color)}55" aria-hidden="true">${escHtml(p.avatar)}</span>
      <span class="pg-name">${escHtml(p.nom)}</span>
    </button>`).join('');
}

/** Sélectionne un espace de travail (et recharge si on change de profil). */
function vmSelectProfile(id) {
  const p = vmProfile(id);
  if (!p) return;
  sessionStorage.setItem(PROFILE_SESSION_KEY, id);
  logHistory('connexion', p.nom);
  if (id === window.__profile) {
    $('#profile-gate')?.setAttribute('hidden', '');
    applyRole();
    updateProfileIndicator();
    if (window.maybeShowOnboarding) maybeShowOnboarding();
    showToast('👋 Bienvenue ' + p.nom + ' !');
  } else {
    window.__rawLS.set('vm_active_profile', id);
    location.reload();
  }
}

function vmLogout() {
  sessionStorage.removeItem(PROFILE_SESSION_KEY);
  location.reload();
}

// ── Thème ────────────────────────────────────────────────
function vmCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  const btn = $('#theme-toggle');
  if (btn) {
    // L'icône vit dans un <span aria-hidden> : on remplace le span, pas tout
    // le contenu du bouton, sinon l'attribut aria-hidden disparaît et le
    // lecteur d'écran annonce l'emoji en plus du libellé.
    const ico = btn.querySelector('span') || btn;
    ico.textContent = theme === 'dark' ? '☀' : '🌙';
    const label = theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0f1a' : '#eef4fc');
  if (window.vmApplyMapTiles) vmApplyMapTiles();
}

function toggleTheme() {
  const next = vmCurrentTheme() === 'dark' ? 'light' : 'dark';
  try { window.__rawLS.set('vm_theme', next); } catch { /* stockage indisponible */ }
  applyTheme(next);
}

// ── Rôles (cosmétique côté client — cf. avertissement en tête) ──
function applyRole() {
  const p = vmCurrentProfile();
  document.body.classList.toggle('role-admin', p.role === 'admin');
  document.body.classList.toggle('role-user', p.role !== 'admin');
}

function updateProfileIndicator() {
  const p = vmCurrentProfile();
  const av = $('#sp-avatar');
  if (av) { av.textContent = p.avatar || '👤'; av.style.background = (p.color || '#888') + '22'; }
  const nm = $('#sp-name'); if (nm) nm.textContent = p.nom || '';
  const rl = $('#sp-role'); if (rl) rl.textContent = p.role === 'admin' ? 'Administrateur' : 'Voyageur';
}

function vmProfilesBoot() {
  applyTheme(vmCurrentTheme());
  pgRenderProfiles();
  applyRole();
  updateProfileIndicator();
  const gate = $('#profile-gate');
  if (!gate) return;
  if (sessionStorage.getItem(PROFILE_SESSION_KEY) === window.__profile) gate.setAttribute('hidden', '');
  else gate.removeAttribute('hidden');
  delegate(gate, 'click', '[data-profile]', (e, el) => vmSelectProfile(el.dataset.profile));
}

Object.assign(window, {
  vmProfile, vmCurrentProfile, vmCurrentName, isAdmin, PROFILE_SESSION_KEY,
  pgRenderProfiles, vmSelectProfile, vmLogout,
  vmCurrentTheme, applyTheme, toggleTheme, applyRole, updateProfileIndicator, vmProfilesBoot,
});
