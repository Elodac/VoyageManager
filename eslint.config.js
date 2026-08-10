// ============================================================
// eslint.config.js — configuration « flat » (ESLint 9)
//
// L'application est en scripts classiques : les modules communiquent
// par des globals publiés sur `window`. La liste ci-dessous documente
// donc l'API globale du projet — si un nom n'y figure pas, `no-undef`
// le signale, ce qui empêche les fautes de frappe silencieuses.
// ============================================================

const globals = require('globals');

/** Globals publiés par l'application (fichier → exports). */
const VM_GLOBALS = {
  // core/dom.js
  escHtml: 'readonly', escAttr: 'readonly', escUrl: 'readonly', safeUrl: 'readonly',
  $: 'readonly', $$: 'readonly', debounce: 'readonly', delegate: 'readonly', showToast: 'readonly',
  openOverlay: 'readonly', closeOverlay: 'readonly', closeTopOverlay: 'readonly',
  ensureOverlay: 'readonly', vmConfirm: 'readonly', vmPrompt: 'readonly',
  // core/storage.js
  lsSet: 'readonly', lsGet: 'readonly', lsGetRawString: 'readonly', lsRemove: 'readonly',
  lsUserKeys: 'readonly', lsUsageKo: 'readonly',
  // core/prefs.js
  PREFS_KEY: 'readonly', DEFAULT_PREFS: 'readonly', getPrefs: 'readonly', pref: 'readonly',
  setPrefs: 'readonly', resetPrefs: 'readonly', todayISO: 'readonly', addDaysISO: 'readonly',
  defaultDateRange: 'readonly',
  // core/undo.js
  pushUndo: 'readonly', popUndo: 'readonly', canUndo: 'readonly', clearUndo: 'readonly',
  // core/print.js
  vmOpenPrintable: 'readonly', PRINT_BASE_CSS: 'readonly',
  // core/profiles.js
  vmProfile: 'readonly', vmCurrentProfile: 'readonly', vmCurrentName: 'readonly', isAdmin: 'readonly',
  PROFILE_SESSION_KEY: 'readonly', pgRenderProfiles: 'readonly', vmSelectProfile: 'readonly',
  vmLogout: 'readonly', vmCurrentTheme: 'readonly', applyTheme: 'readonly', toggleTheme: 'readonly',
  applyRole: 'readonly', updateProfileIndicator: 'readonly', vmProfilesBoot: 'readonly',
  // core/history.js
  HIST_KEY: 'readonly', getHistory: 'readonly', logHistory: 'readonly',
  clearHistory: 'readonly', buildHistorique: 'readonly',
  // core/catalog.js
  CONTINENT_MAP: 'readonly', CONTINENT_ORDER: 'readonly', CONTINENT_EMOJI: 'readonly',
  continentOf: 'readonly', STATUT_COLOR: 'readonly', statutColor: 'readonly', statutMeta: 'readonly',
  allDests: 'readonly', destById: 'readonly', activeDests: 'readonly', shortName: 'readonly',
  nightsOf: 'readonly', mapsLink: 'readonly', applyUserActivities: 'readonly',
  GLOBAL_DESTS_KEY: 'readonly', getGlobalDests: 'readonly', setGlobalDests: 'readonly',
  applyGlobalDests: 'readonly',
  // core/tripdata.js
  AGENDA_KEY: 'readonly', VALISE_KEY: 'readonly', EXPENSE_KEY: 'readonly', TRIPDATA_MIGRATED: 'readonly',
  loadTripData: 'readonly', adoptLegacyForTrip: 'readonly', dropTripData: 'readonly',
  restoreTripData: 'readonly', getAgendaAll: 'readonly', getAgenda: 'readonly', setAgenda: 'readonly',
  saveAgendaAll: 'readonly', getValisesAll: 'readonly', getValise: 'readonly', setValise: 'readonly',
  saveValisesAll: 'readonly', getExpensesAll: 'readonly', getExpenses: 'readonly',
  setExpenses: 'readonly', saveExpensesAll: 'readonly',
  // core/backup.js
  BACKUP_VERSION: 'readonly', BACKUP_KEYS: 'readonly', BACKUP_GLOBAL_KEYS: 'readonly',
  buildSnapshot: 'readonly', exportBackup: 'readonly', validateSnapshot: 'readonly',
  importBackup: 'readonly', initBackup: 'readonly',
  // core/router.js
  currentPage: 'writable', ADMIN_PAGES: 'readonly', showPage: 'readonly', toggleNav: 'readonly',
  vmGoTo: 'readonly', initRouter: 'readonly',
  // model.js
  TRIP_STATUS: 'readonly', ELEMENT_STATUS: 'readonly', tripStatusMeta: 'readonly',
  elStatusMeta: 'readonly', nextElStatus: 'readonly', nextTripStatus: 'readonly',
  computeTripProgress: 'readonly', CATALOG_TO_TRIP_STATUS: 'readonly',
  TRIP_TO_CATALOG_STATUS: 'readonly', newId: 'readonly', tripFromDestination: 'readonly',
  tripLabel: 'readonly',
  // store.js
  STORAGE_KEY: 'readonly', STORE_SCHEMA_VERSION: 'readonly', storeState: 'readonly',
  subscribe: 'readonly', loadStore: 'readonly', getTrips: 'readonly', getTrip: 'readonly',
  getTripByDestination: 'readonly', progress: 'readonly', addTrip: 'readonly', updateTrip: 'readonly',
  removeTrip: 'readonly', restoreTrip: 'readonly', applyStatutOverrides: 'readonly',
  setDestStatutRaw: 'readonly', getPinnedIds: 'readonly', setPinnedIds: 'readonly',
  isPinned: 'readonly', pinDest: 'readonly', unpinDest: 'readonly', getArchivedIds: 'readonly',
  isArchived: 'readonly', archiveDest: 'readonly', unarchiveDest: 'readonly',
  getHiddenPlanif: 'readonly', hidePlanif: 'readonly', resetHiddenPlanif: 'readonly',
  getRoadtrips: 'readonly', getRoadtrip: 'readonly', saveRoadtrip: 'readonly',
  removeRoadtrip: 'readonly', restoreRoadtrip: 'readonly', getUserDestinations: 'readonly',
  getUserActivities: 'readonly', addUserDestination: 'readonly', addUserActivity: 'readonly',
  removeUserDestination: 'readonly', updateUserDestination: 'readonly',
  // services
  haversine: 'readonly', roadDistance: 'readonly', fmtDuration: 'readonly',
  ROAD_DETOUR_FACTOR: 'readonly', geocode: 'readonly',
  getForecast: 'readonly', getClimate: 'readonly', wmoMeta: 'readonly', FR_MONTH_NAMES: 'readonly',
  searchFlights: 'readonly', comparatorLinks: 'readonly',
  TRANSPORT_MODEL: 'readonly', transportDefaults: 'readonly', nearestAirports: 'readonly',
  compareCar: 'readonly', comparePlane: 'readonly', recommend: 'readonly',
  THEMES: 'readonly', DURATIONS: 'readonly', generateProgram: 'readonly',
  routardUrl: 'readonly', hasRoutard: 'readonly',
  openDossier: 'readonly', buildDossierHTML: 'readonly',
  // views
  buildPinned: 'readonly', buildDashboard: 'readonly', buildCatalogPanel: 'readonly',
  refreshCountdowns: 'readonly', openCreateVoyage: 'readonly', createVoyageFromDest: 'readonly',
  deleteTrip: 'readonly', getPrimaryTrip: 'readonly', pinTrip: 'readonly', unpinTrip: 'readonly',
  initDashboard: 'readonly',
  buildDestGrid: 'readonly', renderDestGrid: 'readonly', destCardHTML: 'readonly',
  sortDests: 'readonly', matchAdvFilter: 'readonly', setFiltre: 'readonly', setSort: 'readonly',
  setViewMode: 'readonly', setCountryFilter: 'readonly', resetAdvFilter: 'readonly',
  applyAdvFilter: 'readonly', buildCountryFilter: 'readonly', restoreFilters: 'readonly',
  initDestinations: 'readonly',
  openDest: 'readonly', closeDestModal: 'readonly', showTab: 'readonly', setDestStatut: 'readonly',
  syncModalButtons: 'readonly', editDestination: 'readonly', deleteDestination: 'readonly',
  initDestModal: 'readonly',
  initMap: 'readonly', mapSetFilter: 'readonly', focusMap: 'readonly', drawRoadtrip: 'readonly',
  vmMapEnter: 'readonly', vmApplyMapTiles: 'readonly', makeIcon: 'readonly', initMapView: 'readonly',
  buildAgendaSelect: 'readonly', agOnDestChange: 'readonly', agRebuild: 'readonly',
  agRender: 'readonly', agPrint: 'readonly', agExport: 'readonly', agClear: 'readonly',
  agUndo: 'readonly', agSelectTrip: 'readonly', agLoadProgram: 'readonly', AG_COLORS: 'readonly',
  AG_PALETTE: 'readonly', initAgenda: 'readonly',
  buildValiseSelect: 'readonly', loadValise: 'readonly', valiseSelectTrip: 'readonly',
  renderValise: 'readonly', exportValise: 'readonly', printValise: 'readonly',
  uncheckAll: 'readonly', initValises: 'readonly',
  buildBudget: 'readonly', trackerBuildSelect: 'readonly', trackerLoad: 'readonly',
  trackerRender: 'readonly', initBudget: 'readonly',
  buildRoadtrips: 'readonly', openRoadtripEditor: 'readonly', rtQuickAdd: 'readonly',
  rtFromCountry: 'readonly', rtComputeStats: 'readonly', initRoadtrips: 'readonly', setRoadtripStatus: 'readonly',
  buildArchives: 'readonly', initArchives: 'readonly',
  buildSearchSelect: 'readonly', updateSearchLinks: 'readonly', searchSelectDest: 'readonly',
  initSearch: 'readonly',
  buildPrefs: 'readonly', initPrefs: 'readonly',
  openPalette: 'readonly', showShortcutsHelp: 'readonly', initPalette: 'readonly',
  openTripModal: 'readonly', vmCreateTrip: 'readonly',
  transportSelect: 'readonly', initTransport: 'readonly',
  programsSelect: 'readonly', initPrograms: 'readonly',
  initForms: 'readonly',
  maybeShowOnboarding: 'readonly', closeOnboarding: 'readonly', updateNavBadge: 'readonly',
  // data.js
  DESTINATIONS: 'writable', VALISE_TEMPLATES: 'readonly', STATUT_CONFIG: 'readonly',
  TYPE_ICONS: 'readonly', AIRPORTS: 'readonly', FR_CITIES: 'readonly',
  // data/countries.js
  COUNTRIES: 'readonly', countryInfo: 'readonly', usesEuro: 'readonly', currencyOf: 'readonly',
  catalogCurrencies: 'readonly', currencyLabel: 'readonly', currencySymbol: 'readonly',
  applyCountryDefaults: 'readonly', defaultStayLength: 'readonly',
  // data/seasons.js
  SEASON_LABELS: 'readonly', SEASON_PROFILES: 'readonly', COUNTRY_SEASON: 'readonly',
  SEASON_OVERRIDES: 'readonly', MONTHS_SHORT: 'readonly', MONTHS_FULL: 'readonly',
  seasonProfileFor: 'readonly', seasonScore: 'readonly', seasonMeta: 'readonly',
  bestMonthsLabel: 'readonly', isBadSeason: 'readonly', evaluatePeriod: 'readonly',
  // model.roadtrip.js
  RT_STATUS: 'readonly', rtStatusMeta: 'readonly', RT_MODES: 'readonly', rtModeMeta: 'readonly',
  RT_BOOKING_STATUS: 'readonly', rtBookingMeta: 'readonly', rtId: 'readonly', rtNew: 'readonly',
  rtNewStop: 'readonly', rtNewSegment: 'readonly', rtNewLodging: 'readonly', rtNewPoint: 'readonly',
  rtNormalize: 'readonly', rtSyncSegments: 'readonly', rtResolvePoint: 'readonly',
  rtSegmentEstimate: 'readonly', rtSegmentValues: 'readonly', isSet: 'readonly',
  rtSchedule: 'readonly', rtStats: 'readonly', rtValidate: 'readonly',
  rtDefaultChecklist: 'readonly', daysBetween: 'readonly',
  // services/currency.js
  FX_FALLBACK_DATE: 'readonly', FX_NOT_ON_ECB: 'readonly', getRates: 'readonly',
  convert: 'readonly', rateFor: 'readonly', fmtMoney: 'readonly', cashResources: 'readonly',
  // services/booking.js
  bookingContext: 'readonly', lodgingLinks: 'readonly', flightLinks: 'readonly',
  groundLinks: 'readonly', activityLinks: 'readonly', bookingLinksHTML: 'readonly',
  // services/rtdossier.js
  openRoadtripDossier: 'readonly', buildRoadtripDossierHTML: 'readonly',
  // views/widgets.js
  seasonStripHTML: 'readonly', seasonVerdictHTML: 'readonly', openConverter: 'readonly',
  moneySectionHTML: 'readonly', fillMoneyRate: 'readonly',
  // divers v2.1
  debouncePerTarget: 'readonly', clearRoadtrip: 'readonly', MODE_COLOR: 'readonly',
  rtCurrentDraft: 'readonly', buildDashRoadtrips: 'readonly',
  // dépendance externe
  L: 'readonly',
};

module.exports = [
  {
    ignores: ['node_modules/**', 'sw.js'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...VM_GLOBALS },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-implicit-globals': 'off',   // volontaire : c'est le mode de liaison du projet
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn',
      'no-var': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-script-url': 'error',
      curly: ['warn', 'multi-line'],
    },
  },
  {
    // Le service worker tourne dans un contexte différent
    files: ['sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
