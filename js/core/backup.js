// ============================================================
// core/backup.js — export / import de la sauvegarde JSON
//
// Corrige trois défauts de la version précédente :
//   • vm_global_dests, vm_prefs et le cache météo étaient absents
//     de l'export → perte silencieuse des destinations communes
//   • aucune validation de forme à l'import
//   • aucun filet avant écrasement des données courantes
// ============================================================

const BACKUP_VERSION = 4;

/** Clés du profil courant incluses dans la sauvegarde. */
const BACKUP_KEYS = [
  STORAGE_KEY,      // vm_store_v2 : voyages, catalogue perso, épinglés, archives, road trips
  AGENDA_KEY,
  VALISE_KEY,
  EXPENSE_KEY,
  PREFS_KEY,
];

/** Clés globales (partagées entre profils) incluses dans la sauvegarde. */
const BACKUP_GLOBAL_KEYS = ['vm_global_dests'];

/** Contrôles de forme minimaux, par clé. */
const BACKUP_SHAPES = {
  [STORAGE_KEY]: v => v && typeof v === 'object' && !Array.isArray(v),
  [AGENDA_KEY]: v => v && typeof v === 'object' && !Array.isArray(v),
  [VALISE_KEY]: v => v && typeof v === 'object' && !Array.isArray(v),
  [EXPENSE_KEY]: v => v && typeof v === 'object' && !Array.isArray(v),
  [PREFS_KEY]: v => v && typeof v === 'object' && !Array.isArray(v),
  vm_global_dests: v => Array.isArray(v),
};

function buildSnapshot() {
  const snap = {
    _vmVersion: BACKUP_VERSION,
    _exported: new Date().toISOString(),
    _profile: window.__profile || null,
  };
  BACKUP_KEYS.forEach(k => { const v = lsGet(k, undefined); if (v !== undefined) snap[k] = v; });
  BACKUP_GLOBAL_KEYS.forEach(k => {
    try {
      const raw = window.__rawLS.get(k);
      if (raw != null) snap[k] = JSON.parse(raw);
    } catch { /* clé absente ou illisible : on l'omet */ }
  });
  return snap;
}

function exportBackup() {
  const snap = buildSnapshot();
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `voyagemanager-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  const trips = (snap[STORAGE_KEY] && snap[STORAGE_KEY].trips || []).length;
  showToast(`📤 Sauvegarde exportée (${trips} voyage${trips > 1 ? 's' : ''})`);
  logHistory('sauvegarde exportée', '');
}

/** Valide un fichier importé. Renvoie {ok, keys, errors}. */
function validateSnapshot(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, keys: [], errors: ['Le fichier n\'est pas un objet JSON valide.'] };
  }
  const known = BACKUP_KEYS.concat(BACKUP_GLOBAL_KEYS);
  const keys = [];
  Object.keys(data).forEach(k => {
    if (k.startsWith('_')) return;
    if (!known.includes(k)) return;                    // clé inconnue : ignorée en silence
    const shape = BACKUP_SHAPES[k];
    if (shape && !shape(data[k])) { errors.push(`« ${k} » a une forme inattendue — ignorée.`); return; }
    keys.push(k);
  });
  if (!keys.length) errors.push('Aucune donnée VoyageManager exploitable dans ce fichier.');
  return { ok: keys.length > 0, keys, errors };
}

async function importBackup(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (e) {
    showToast('⚠️ Fichier illisible : ' + e.message, { tone: 'error' });
    return;
  }

  const { ok, keys, errors } = validateSnapshot(data);
  if (!ok) {
    showToast('⚠️ ' + errors[0], { tone: 'error', ms: 6000 });
    return;
  }

  const nbTrips = (data[STORAGE_KEY] && data[STORAGE_KEY].trips || []).length;
  const when = data._exported ? data._exported.slice(0, 10) : 'date inconnue';
  const confirmed = await vmConfirm({
    title: 'Importer cette sauvegarde ?',
    message: `Sauvegarde du ${when} · ${nbTrips} voyage(s) · ${keys.length} bloc(s) de données.\n`
      + 'Tes données actuelles seront remplacées. Une copie de sécurité est créée automatiquement '
      + 'et téléchargée avant l\'import.',
    confirmLabel: 'Importer', danger: true,
  });
  if (!confirmed) return;

  // Filet de sécurité : on exporte l'état courant avant de l'écraser
  try {
    const safety = JSON.stringify(buildSnapshot(), null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([safety], { type: 'application/json' }));
    a.download = `voyagemanager-avant-import-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (e) { console.warn('[backup] copie de sécurité impossible', e); }

  let imported = 0;
  keys.forEach(k => {
    const isGlobal = BACKUP_GLOBAL_KEYS.includes(k);
    const written = isGlobal
      ? (window.__rawLS.set(k, JSON.stringify(data[k])), true)
      : lsSet(k, data[k]);
    if (written) imported++;
  });
  // La migration destId→tripId ne doit pas se rejouer sur des données déjà migrées
  if (data._vmVersion >= 4) lsSet(TRIPDATA_MIGRATED, true); else lsRemove(TRIPDATA_MIGRATED);

  if (errors.length) console.warn('[backup] avertissements à l\'import', errors);
  logHistory('sauvegarde importée', when);
  showToast(`📥 ${imported} bloc(s) importé(s) — rechargement…`);
  setTimeout(() => location.reload(), 1200);
}

function initBackup() {
  $('#btn-export-json')?.addEventListener('click', exportBackup);
  const input = $('#input-import-json');
  if (input) {
    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) importBackup(file).finally(() => { input.value = ''; });
    });
  }
}

Object.assign(window, {
  BACKUP_VERSION, BACKUP_KEYS, BACKUP_GLOBAL_KEYS,
  buildSnapshot, exportBackup, validateSnapshot, importBackup, initBackup,
});
