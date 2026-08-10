// ============================================================
// views/prefs.js — page Réglages
// Remplace les valeurs codées en dur (ville et aéroport de départ,
// nombre de voyageurs, consommation du véhicule, dates de repli).
// ============================================================
(function () {

function buildPrefs() {
  const mount = $('#prefs-mount');
  if (!mount) return;
  const p = getPrefs();
  const cities = (window.FR_CITIES || []).map(c =>
    `<option value="${escAttr(c.nom)}"${c.nom === p.departCity ? ' selected' : ''}>${escHtml(c.nom)}</option>`).join('');
  const airports = (window.AIRPORTS || []).map(a =>
    `<option value="${escAttr(a.iata)}"${a.iata === p.departIata ? ' selected' : ''}>${escHtml(a.iata + ' · ' + a.nom)}</option>`).join('');

  mount.innerHTML = `
    <div class="grid grid-2 gap-md">
      <section class="card">
        <h2>🧭 Point de départ</h2>
        <p class="hint">Utilisé pour le comparateur Transport et tous les liens de réservation.</p>
        <div class="adv-field">
          <label for="pf-city">Ville de départ</label>
          <select class="valise-select" id="pf-city">${cities}</select>
        </div>
        <div class="adv-field">
          <label for="pf-iata">Aéroport de départ</label>
          <select class="valise-select" id="pf-iata">${airports}</select>
        </div>
      </section>

      <section class="card">
        <h2>👥 Voyageurs</h2>
        <p class="hint">Nombre de personnes par défaut pour les budgets et les réservations.</p>
        <div class="adv-field">
          <label for="pf-travelers">Nombre de voyageurs</label>
          <input class="add-item-input" type="number" id="pf-travelers" min="1" max="12" value="${escAttr(p.travelers)}">
        </div>
        <div class="adv-field">
          <label for="pf-days">Durée par défaut d'un voyage (jours)</label>
          <input class="add-item-input" type="number" id="pf-days" min="1" max="60" value="${escAttr(p.defaultTripDays)}">
        </div>
      </section>

      <section class="card">
        <h2>🚗 Véhicule</h2>
        <p class="hint">Sert au calcul du coût d'un trajet en voiture.</p>
        <div class="adv-filter-row gap-sm">
          <div class="adv-field">
            <label for="pf-conso">Consommation (L/100 km)</label>
            <input class="add-item-input" type="number" id="pf-conso" step="0.1" min="1" value="${escAttr(p.carConso)}">
          </div>
          <div class="adv-field">
            <label for="pf-fuel">Prix du carburant (€/L)</label>
            <input class="add-item-input" type="number" id="pf-fuel" step="0.01" min="0.5" value="${escAttr(p.carFuelPrice)}">
          </div>
          <div class="adv-field">
            <label for="pf-toll">Péage moyen (€/km)</label>
            <input class="add-item-input" type="number" id="pf-toll" step="0.005" min="0" value="${escAttr(p.tollRate)}">
          </div>
        </div>
      </section>

      <section class="card">
        <h2>💾 Données</h2>
        <p class="hint">Espace utilisé : <strong>${lsUsageKo()} Ko</strong> sur ce navigateur.</p>
        <div class="btn-row">
          <button type="button" class="btn btn-outline btn-sm" data-prefs-export>📤 Exporter la sauvegarde</button>
          <label class="btn btn-outline btn-sm file-label">📥 Importer
            <input type="file" id="prefs-import" accept=".json" hidden>
          </label>
          <button type="button" class="btn btn-outline btn-sm" data-prefs-reset>↩ Réinitialiser les réglages</button>
        </div>
        <p class="hint">L'import crée automatiquement une copie de sécurité de tes données actuelles.</p>
      </section>
    </div>

    <div class="btn-row mt-md">
      <button type="button" class="btn btn-success" data-prefs-save>💾 Enregistrer les réglages</button>
      <span id="prefs-saved" class="hint" role="status" aria-live="polite"></span>
    </div>`;
}

function savePrefs() {
  const num = (id, def) => { const v = parseFloat($('#' + id)?.value); return isNaN(v) ? def : v; };
  const p = getPrefs();
  setPrefs({
    departCity: $('#pf-city')?.value || p.departCity,
    departIata: $('#pf-iata')?.value || p.departIata,
    travelers: Math.max(1, Math.round(num('pf-travelers', p.travelers))),
    defaultTripDays: Math.max(1, Math.round(num('pf-days', p.defaultTripDays))),
    carConso: num('pf-conso', p.carConso),
    carFuelPrice: num('pf-fuel', p.carFuelPrice),
    tollRate: num('pf-toll', p.tollRate),
  });
  const el = $('#prefs-saved');
  if (el) { el.textContent = '✓ Réglages enregistrés'; setTimeout(() => { el.textContent = ''; }, 3000); }
  showToast('💾 Réglages enregistrés');
  logHistory('réglages modifiés', '');
}

function init() {
  const page = document.getElementById('page-reglages');
  if (!page) return;
  delegate(page, 'click', '[data-prefs-save]', savePrefs);
  delegate(page, 'click', '[data-prefs-export]', exportBackup);
  delegate(page, 'change', '#prefs-import', (e, el) => {
    const f = el.files[0];
    if (f) importBackup(f).finally(() => { el.value = ''; });
  });
  delegate(page, 'click', '[data-prefs-reset]', async () => {
    const ok = await vmConfirm({
      title: 'Réinitialiser les réglages ?',
      message: 'Tes voyages et tes données ne sont pas touchés — seuls les réglages reviennent aux valeurs par défaut.',
      confirmLabel: 'Réinitialiser',
    });
    if (!ok) return;
    resetPrefs();
    buildPrefs();
    showToast('↩ Réglages réinitialisés');
  });
  // Quand la ville change, propose l'aéroport le plus proche
  delegate(page, 'change', '#pf-city', (e, el) => {
    const city = (window.FR_CITIES || []).find(c => c.nom === el.value);
    if (!city) return;
    const near = nearestAirports(city.coords, 1)[0];
    if (near) $('#pf-iata').value = near.iata;
  });
  buildPrefs();
}

Object.assign(window, { buildPrefs, initPrefs: init });
})();
