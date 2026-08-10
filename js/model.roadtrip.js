// ============================================================
// model.roadtrip.js — modèle de données Road Trip
//
// Un road trip est une entité à part entière, composée de trois
// collections qui ont chacune leur identité :
//
//   • stops[]    — les étapes (où l'on dort, ce qu'on visite)
//   • segments[] — les trajets ENTRE les étapes (n+1 segments :
//                  départ → étape 1 … étape N → retour)
//   • checklist[]— la préparation
//
// SOURCE DE VÉRITÉ DES DATES : `date_debut` + le nombre de nuits de
// chaque étape. Toutes les autres dates (arrivée/départ d'étape,
// check-in/check-out d'hébergement, horaires de segment) en sont
// DÉRIVÉES par rtSchedule(). Rien n'est saisi deux fois.
// ============================================================

// ── Statuts ──────────────────────────────────────────────
const RT_STATUS = [
  { key: 'idee',          label: '💡 Idée',           short: 'Idée',        color: 'var(--muted)' },
  { key: 'planification', label: '🗺️ En construction', short: 'Construction', color: 'var(--yellow-text)' },
  { key: 'reserve',       label: '🎫 Réservations en cours', short: 'Réservations', color: 'var(--accent-text)' },
  { key: 'pret',          label: '✅ Prêt à partir',   short: 'Prêt',        color: 'var(--green-text)' },
  { key: 'termine',       label: '🏁 Terminé',         short: 'Terminé',     color: 'var(--purple-text)' },
  { key: 'archive',       label: '📦 Archivé',         short: 'Archivé',     color: 'var(--muted)' },
];
const rtStatusMeta = k => RT_STATUS.find(s => s.key === k) || RT_STATUS[0];

// ── Modes de transport ───────────────────────────────────
/**
 * vitesse  : km/h moyenne porte-à-porte (hors attente aéroport)
 * fixe     : temps incompressible en heures (embarquement, attente…)
 * cout     : € par km et par véhicule/personne selon `parPersonne`
 * routier  : utilise la distance routière (avec facteur de détour)
 */
const RT_MODES = [
  { key: 'voiture',  label: 'Voiture perso',     emoji: '🚗', vitesse: 85,  fixe: 0.25, cout: 0.12, routier: 1, parPersonne: 0 },
  { key: 'location', label: 'Voiture de location', emoji: '🚙', vitesse: 85, fixe: 0.75, cout: 0.14, routier: 1, parPersonne: 0 },
  { key: 'camping',  label: 'Van / camping-car', emoji: '🚐', vitesse: 72,  fixe: 0.25, cout: 0.20, routier: 1, parPersonne: 0 },
  { key: 'moto',     label: 'Moto',              emoji: '🏍️', vitesse: 85,  fixe: 0.25, cout: 0.07, routier: 1, parPersonne: 0 },
  { key: 'train',    label: 'Train',             emoji: '🚆', vitesse: 120, fixe: 0.75, cout: 0.16, routier: 0, parPersonne: 1 },
  { key: 'avion',    label: 'Avion',             emoji: '✈️', vitesse: 750, fixe: 3.5,  cout: 0.10, routier: 0, parPersonne: 1 },
  { key: 'bus',      label: 'Bus / car',         emoji: '🚌', vitesse: 65,  fixe: 0.5,  cout: 0.07, routier: 1, parPersonne: 1 },
  { key: 'ferry',    label: 'Ferry',             emoji: '⛴️', vitesse: 35,  fixe: 1.5,  cout: 0.25, routier: 0, parPersonne: 1 },
  { key: 'velo',     label: 'Vélo',              emoji: '🚲', vitesse: 16,  fixe: 0,    cout: 0,    routier: 1, parPersonne: 0 },
  { key: 'pied',     label: 'À pied',            emoji: '🥾', vitesse: 4,   fixe: 0,    cout: 0,    routier: 1, parPersonne: 0 },
  { key: 'autre',    label: 'Autre',             emoji: '🔀', vitesse: 60,  fixe: 0.5,  cout: 0.10, routier: 1, parPersonne: 0 },
];
const rtModeMeta = k => RT_MODES.find(m => m.key === k) || RT_MODES[0];

// ── Statuts de réservation (transport & hébergement) ─────
const RT_BOOKING_STATUS = [
  { key: 'a_faire',  label: 'À réserver', color: 'var(--muted)' },
  { key: 'en_cours', label: 'En cours',   color: 'var(--yellow-text)' },
  { key: 'reserve',  label: 'Réservé',    color: 'var(--accent-text)' },
  { key: 'paye',     label: 'Payé',       color: 'var(--green-text)' },
];
const rtBookingMeta = k => RT_BOOKING_STATUS.find(s => s.key === k) || RT_BOOKING_STATUS[0];

let _rtSeq = 0;
const rtId = (p) => (p || 'rt') + Date.now().toString(36) + (_rtSeq++).toString(36);

// ── Fabriques ────────────────────────────────────────────
function rtNewLodging() {
  return {
    nom: '', adresse: '', lien: '', prix: '', tel: '', email: '',
    reference: '', checkinTime: '15:00', checkoutTime: '11:00',
    status: 'a_faire', notes: '',
  };
}

function rtNewStop(o) {
  return Object.assign({
    id: rtId('st'),
    nom: '', destId: null, coords: null, pays: '',
    nights: 2,
    note: '',
    lodging: rtNewLodging(),
    activites: [],
  }, o || {});
}

function rtNewSegment(o) {
  return Object.assign({
    id: rtId('sg'),
    fromRef: 'origin', toRef: null,
    mode: 'voiture',
    departTime: '', arriveeTime: '',      // HH:MM saisis par l'utilisateur (facultatif)
    distanceKm: null, dureeH: null, cout: null,   // null = valeur calculée automatiquement
    reservation: { reference: '', lien: '', status: 'a_faire' },
    notes: '',
  }, o || {});
}

function rtNewPoint(o) {
  return Object.assign({ nom: '', coords: null, iata: '', type: 'ville' }, o || {});
}

/** Crée un road trip vierge, pré-rempli depuis les préférences. */
function rtNew(overrides) {
  const p = getPrefs();
  const city = (window.FR_CITIES || []).find(c => c.nom === p.departCity);
  const range = defaultDateRange();
  return Object.assign({
    id: rtId(),
    schema: 2,
    nom: '',
    status: 'idee',
    pays: [],
    date_debut: range.start,
    travelers: p.travelers,
    origin: rtNewPoint({ nom: p.departCity, coords: city ? city.coords : null, iata: p.departIata }),
    retourIdentique: true,
    retour: null,
    vehicle: { mode: 'voiture', modele: '', conso: p.carConso, prixCarburant: p.carFuelPrice },
    stops: [],
    segments: [],
    checklist: [],
    budget: { transport: null, hebergement: null, activites: null, autres: null },
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }, overrides || {});
}

// ── Normalisation & migration ────────────────────────────
/**
 * Accepte l'ancien format v1 ({nom, stops:[{nom,destId,coords,nights,note}]})
 * et le met à niveau sans rien perdre.
 */
function rtNormalize(raw) {
  if (!raw) return rtNew();
  const rt = Object.assign(rtNew({ id: raw.id, createdAt: raw.createdAt || Date.now() }), raw);

  rt.schema = 2;
  rt.stops = (raw.stops || []).map(s => rtNewStop({
    id: s.id || rtId('st'),
    nom: s.nom || '',
    destId: s.destId || null,
    coords: Array.isArray(s.coords) ? s.coords : null,
    pays: s.pays || (s.destId && (destById(s.destId) || {}).pays) || '',
    nights: Number.isFinite(+s.nights) ? Math.max(0, +s.nights) : 1,
    note: s.note || '',
    lodging: Object.assign(rtNewLodging(), s.lodging || {}),
    activites: Array.isArray(s.activites) ? s.activites : [],
  }));

  rt.origin = Object.assign(rtNewPoint(), raw.origin || {});
  if (!rt.origin.nom) {
    const p = getPrefs();
    const city = (window.FR_CITIES || []).find(c => c.nom === p.departCity);
    rt.origin = rtNewPoint({ nom: p.departCity, coords: city ? city.coords : null, iata: p.departIata });
  }
  rt.retour = raw.retour ? Object.assign(rtNewPoint(), raw.retour) : null;
  rt.retourIdentique = raw.retourIdentique !== false;
  rt.vehicle = Object.assign({ mode: 'voiture', modele: '', conso: getPrefs().carConso, prixCarburant: getPrefs().carFuelPrice }, raw.vehicle || {});
  rt.budget = Object.assign({ transport: null, hebergement: null, activites: null, autres: null }, raw.budget || {});
  rt.checklist = Array.isArray(raw.checklist) ? raw.checklist : [];
  rt.travelers = +raw.travelers || getPrefs().travelers;
  rt.date_debut = raw.date_debut || defaultDateRange().start;
  rt.status = RT_STATUS.some(s => s.key === raw.status) ? raw.status : 'idee';
  rt.pays = [...new Set(rt.stops.map(s => s.pays).filter(Boolean))];

  rt.segments = rtSyncSegments(rt, raw.segments || []);
  return rt;
}

/**
 * Aligne la liste des segments sur la liste des étapes.
 * Conserve les segments existants dont les extrémités n'ont pas changé
 * (une réorganisation d'étapes ne doit pas effacer les réservations).
 */
function rtSyncSegments(rt, previous) {
  const prev = previous || rt.segments || [];
  const byPair = new Map();
  prev.forEach(s => byPair.set(s.fromRef + '>' + s.toRef, s));

  const refs = ['origin', ...rt.stops.map(s => s.id)];
  if (rt.stops.length) refs.push('retour');

  const out = [];
  for (let i = 0; i < refs.length - 1; i++) {
    const from = refs[i], to = refs[i + 1];
    const kept = byPair.get(from + '>' + to);
    out.push(kept ? Object.assign(rtNewSegment(), kept, { fromRef: from, toRef: to })
                  : rtNewSegment({ fromRef: from, toRef: to, mode: rt.vehicle.mode || 'voiture' }));
  }
  return out;
}

// ── Résolution des points ────────────────────────────────
/** Résout une référence de segment vers un point nommé et géolocalisé. */
function rtResolvePoint(rt, ref) {
  if (ref === 'origin') return { key: 'origin', nom: rt.origin.nom || 'Départ', coords: rt.origin.coords, iata: rt.origin.iata };
  if (ref === 'retour') {
    const r = rt.retourIdentique || !rt.retour ? rt.origin : rt.retour;
    return { key: 'retour', nom: r.nom || 'Retour', coords: r.coords, iata: r.iata };
  }
  const st = rt.stops.find(s => s.id === ref);
  return st ? { key: st.id, nom: st.nom, coords: st.coords, iata: (destById(st.destId) || {}).iata || '' } : null;
}

// ── Calculs automatiques d'un segment ────────────────────
/** Distance, durée et coût estimés d'un segment (si non saisis à la main). */
function rtSegmentEstimate(rt, seg) {
  const a = rtResolvePoint(rt, seg.fromRef);
  const b = rtResolvePoint(rt, seg.toRef);
  const mode = rtModeMeta(seg.mode);
  if (!a || !b || !a.coords || !b.coords) {
    return { distanceKm: null, dureeH: null, cout: null, estime: true };
  }
  const vol = haversine(a.coords, b.coords);
  const distanceKm = Math.round(mode.routier ? vol * ROAD_DETOUR_FACTOR : vol);
  const dureeH = Math.round((distanceKm / mode.vitesse + mode.fixe) * 100) / 100;

  let cout;
  if (mode.key === 'voiture' || mode.key === 'location' || mode.key === 'camping' || mode.key === 'moto') {
    // Coût réel : carburant + péages, indépendant du nombre de passagers
    const conso = +rt.vehicle.conso || getPrefs().carConso;
    const prix = +rt.vehicle.prixCarburant || getPrefs().carFuelPrice;
    const carburant = distanceKm / 100 * conso * prix;
    const peages = mode.routier ? distanceKm * getPrefs().tollRate : 0;
    cout = Math.round(carburant + peages);
  } else {
    cout = Math.round(distanceKm * mode.cout * (mode.parPersonne ? (rt.travelers || 1) : 1));
  }
  return { distanceKm, dureeH, cout, estime: true };
}

/**
 * Une valeur « saisie » n'est reconnue que si c'est un vrai nombre.
 * Attention : `+null === 0` et `Number.isFinite(0) === true`, donc un
 * champ vide (null) passerait pour un zéro saisi et écraserait
 * l'estimation automatique. D'où le contrôle explicite.
 */
function isSet(v) {
  return v !== null && v !== undefined && v !== '' && Number.isFinite(+v);
}

/** Valeurs effectives d'un segment : saisie manuelle si présente, sinon estimation. */
function rtSegmentValues(rt, seg) {
  const est = rtSegmentEstimate(rt, seg);
  return {
    distanceKm: isSet(seg.distanceKm) ? +seg.distanceKm : est.distanceKm,
    dureeH: isSet(seg.dureeH) ? +seg.dureeH : est.dureeH,
    cout: isSet(seg.cout) ? +seg.cout : est.cout,
    manuel: {
      distanceKm: isSet(seg.distanceKm),
      dureeH: isSet(seg.dureeH),
      cout: isSet(seg.cout),
    },
    estimation: est,
  };
}

// ── SOURCE DE VÉRITÉ DES DATES ───────────────────────────
/**
 * Calcule le calendrier complet à partir de `date_debut` et des nuits.
 * Renvoie, pour chaque étape : date d'arrivée, date de départ, jours J+n.
 * Et pour chaque segment : la date à laquelle il a lieu.
 *
 * Un seul endroit produit ces dates — hébergements, dossier imprimable,
 * carte et tableau de bord les consomment sans jamais les recalculer.
 */
function rtSchedule(rt) {
  const start = rt.date_debut || defaultDateRange().start;
  const stops = [];
  const segments = {};
  let cursor = start;

  const refs = ['origin', ...rt.stops.map(s => s.id)];
  if (rt.stops.length) refs.push('retour');

  for (let i = 0; i < refs.length - 1; i++) {
    const seg = rt.segments.find(s => s.fromRef === refs[i] && s.toRef === refs[i + 1]);
    if (seg) segments[seg.id] = { date: cursor, jour: daysBetween(start, cursor) + 1 };

    const toRef = refs[i + 1];
    if (toRef === 'retour') break;
    const stop = rt.stops.find(s => s.id === toRef);
    if (!stop) continue;
    const arrivee = cursor;
    const nights = Math.max(0, +stop.nights || 0);
    const depart = addDaysISO(arrivee, nights);
    stops.push({
      id: stop.id, arrivee, depart, nights,
      jourArrivee: daysBetween(start, arrivee) + 1,
      jourDepart: daysBetween(start, depart) + 1,
    });
    cursor = depart;
  }

  const fin = cursor;
  return {
    debut: start,
    fin,
    jours: daysBetween(start, fin) + 1,
    stops,
    stopById: Object.fromEntries(stops.map(s => [s.id, s])),
    segments,
  };
}

function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
}

// ── Statistiques ─────────────────────────────────────────
function rtStats(rt) {
  const sched = rtSchedule(rt);
  let km = 0, heures = 0, coutTransport = 0;
  const parMode = {};
  rt.segments.forEach(seg => {
    const v = rtSegmentValues(rt, seg);
    if (v.distanceKm) km += v.distanceKm;
    if (v.dureeH) heures += v.dureeH;
    if (v.cout) coutTransport += v.cout;
    parMode[seg.mode] = (parMode[seg.mode] || 0) + (v.distanceKm || 0);
  });

  let coutHebergement = 0;
  rt.stops.forEach(s => {
    const prix = parseFloat(String(s.lodging.prix).replace(',', '.').replace(/[^\d.]/g, ''));
    if (isFinite(prix)) coutHebergement += prix * Math.max(1, +s.nights || 0);
  });

  let coutActivites = 0;
  rt.stops.forEach(s => (s.activites || []).forEach(a => {
    const p = parseFloat(String(a.prix).replace(',', '.').replace(/[^\d.]/g, ''));
    if (isFinite(p)) coutActivites += p;
  }));

  const b = rt.budget || {};
  const total = (isSet(b.transport) ? +b.transport : coutTransport)
    + (isSet(b.hebergement) ? +b.hebergement : coutHebergement)
    + (isSet(b.activites) ? +b.activites : coutActivites)
    + (isSet(b.autres) ? +b.autres : 0);

  return {
    etapes: rt.stops.length,
    nuits: rt.stops.reduce((s, x) => s + Math.max(0, +x.nights || 0), 0),
    jours: sched.jours,
    km: Math.round(km),
    heures: Math.round(heures * 10) / 10,
    coutTransport: Math.round(coutTransport),
    coutHebergement: Math.round(coutHebergement),
    coutActivites: Math.round(coutActivites),
    total: Math.round(total),
    parPersonne: rt.travelers ? Math.round(total / rt.travelers) : null,
    parMode,
    debut: sched.debut,
    fin: sched.fin,
    pays: [...new Set(rt.stops.map(s => s.pays).filter(Boolean))],
  };
}

// ── Validation & cohérence ───────────────────────────────
/**
 * Liste les incohérences et les manques. Alimente le panneau
 * « Points à vérifier » de l'éditeur et le dossier imprimable.
 */
function rtValidate(rt) {
  const issues = [];
  const sched = rtSchedule(rt);
  const add = (niveau, texte, cible) => issues.push({ niveau, texte, cible });

  if (!rt.nom || !rt.nom.trim()) add('warn', 'Le road trip n\'a pas encore de nom.', 'nom');
  if (!rt.date_debut) add('error', 'Aucune date de départ définie.', 'dates');
  if (!rt.stops.length) add('error', 'Aucune étape : ajoute au moins une destination.', 'stops');
  if (!rt.origin || !rt.origin.nom) add('warn', 'Point de départ non renseigné.', 'origin');
  if (rt.origin && !rt.origin.coords) add('warn', 'Le point de départ n\'est pas géolocalisé : distances et carte incomplètes.', 'origin');

  rt.stops.forEach((s, i) => {
    if (!s.coords) add('warn', `Étape ${i + 1} (${s.nom}) n'est pas géolocalisée : elle n'apparaîtra pas sur la carte.`, 'stop:' + s.id);
    if ((+s.nights || 0) === 0) add('info', `Étape ${i + 1} (${s.nom}) est une simple traversée (0 nuit).`, 'stop:' + s.id);
    else if (!s.lodging.nom) add('info', `Aucun hébergement enregistré pour l'étape ${i + 1} (${s.nom}).`, 'stop:' + s.id);
  });

  rt.segments.forEach(seg => {
    const a = rtResolvePoint(rt, seg.fromRef);
    const b = rtResolvePoint(rt, seg.toRef);
    if (!a || !b) return;
    const v = rtSegmentValues(rt, seg);
    if (v.distanceKm == null) add('warn', `Trajet ${a.nom} → ${b.nom} : distance inconnue (points non géolocalisés).`, 'seg:' + seg.id);
    if (v.dureeH != null && v.dureeH > 8 && rtModeMeta(seg.mode).routier) {
      add('warn', `Trajet ${a.nom} → ${b.nom} : ${fmtDuration(v.dureeH)} de route en une journée, envisager une étape intermédiaire.`, 'seg:' + seg.id);
    }
    if (seg.mode === 'avion' && v.distanceKm != null && v.distanceKm < 300) {
      add('info', `Trajet ${a.nom} → ${b.nom} : l'avion est peu pertinent sur ${v.distanceKm} km.`, 'seg:' + seg.id);
    }
  });

  // Saison : la période choisie est-elle adaptée à chaque étape ?
  if (rt.date_debut && window.evaluatePeriod) {
    rt.stops.forEach(s => {
      const d = s.destId && destById(s.destId);
      if (!d) return;
      const sc = sched.stopById[s.id];
      const ev = evaluatePeriod(d, sc ? sc.arrivee : rt.date_debut, sc ? sc.depart : rt.date_debut);
      if (ev && ev.worst === 0) add('warn', `${s.nom} : période déconseillée à ces dates. ${ev.advice}`, 'stop:' + s.id);
    });
  }

  return issues;
}

// ── Checklist par défaut ─────────────────────────────────
function rtDefaultChecklist(rt) {
  const horsUE = rt.stops.some(s => s.pays && !countryInfo(s.pays).eu);
  const conduit = rt.segments.some(s => ['voiture', 'location', 'camping', 'moto'].includes(s.mode));
  const gauche = rt.stops.some(s => s.pays && countryInfo(s.pays).conduite === 'gauche');
  const items = [
    'Pièces d\'identité en cours de validité',
    'Réservations imprimées ou hors ligne',
    'Assurance voyage / assistance',
    'Cartes hors ligne téléchargées',
    'Adaptateurs de prise',
    'Trousse de secours',
  ];
  if (conduit) items.push('Permis de conduire', 'Carte grise et attestation d\'assurance', 'Gilet et triangle', 'Vignettes autoroutières des pays traversés');
  if (gauche) items.push('⚠️ Conduite à gauche sur une partie du parcours');
  if (horsUE) items.push('Vérifier la validité du passeport (6 mois après le retour)', 'Devises locales ou carte multidevise');
  else items.push('Carte européenne d\'assurance maladie (CEAM)');
  return items.map(t => ({ id: rtId('ck'), texte: t, fait: false }));
}

Object.assign(window, {
  RT_STATUS, rtStatusMeta, RT_MODES, rtModeMeta, RT_BOOKING_STATUS, rtBookingMeta,
  rtId, rtNew, rtNewStop, rtNewSegment, rtNewLodging, rtNewPoint, rtNormalize, rtSyncSegments,
  rtResolvePoint, rtSegmentEstimate, rtSegmentValues, isSet, rtSchedule, rtStats, rtValidate,
  rtDefaultChecklist, daysBetween,
});
