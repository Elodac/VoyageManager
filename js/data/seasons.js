// ============================================================
// data/seasons.js — « quelle est la meilleure période pour y aller ? »
//
// Modèle : une note mensuelle de 0 à 3 pour chaque destination.
//   3 = idéale · 2 = bonne · 1 = acceptable · 0 = à éviter
//
// Les notes viennent de PROFILS climatiques régionaux (une trentaine
// suffit à couvrir tout le catalogue), qu'on peut surcharger
// destination par destination quand un cas particulier le justifie
// (festival, mousson locale, station de ski, saison des baleines…).
//
// C'est une indication de planification, pas une prévision : la météo
// réelle est fournie séparément par services/weather.js.
// ============================================================

const SEASON_LABELS = [
  { key: 0, label: 'À éviter', short: 'Éviter', color: 'var(--red)', text: 'var(--red-text)' },
  { key: 1, label: 'Acceptable', short: 'Correct', color: 'var(--yellow)', text: 'var(--yellow-text)' },
  { key: 2, label: 'Bonne période', short: 'Bonne', color: 'var(--accent)', text: 'var(--accent-text)' },
  { key: 3, label: 'Période idéale', short: 'Idéale', color: 'var(--green)', text: 'var(--green-text)' },
];

const MONTHS_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTHS_FULL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * Profils climatiques. Ordre des mois : janvier → décembre.
 * `why` explique la contrainte dominante — affiché dans la fiche.
 */
const SEASON_PROFILES = {
  // ── Europe ─────────────────────────────────────────────
  mediterranee_plage: {
    label: 'Méditerranée balnéaire',
    months: [0, 0, 1, 2, 3, 3, 2, 2, 3, 2, 1, 0],
    why: 'Mer chaude et journées longues de mai à octobre ; juillet-août sont brûlants et bondés, mai-juin et septembre offrent le meilleur compromis.',
    avoid: 'Novembre à mars : beaucoup de structures touristiques ferment.',
  },
  mediterranee_ville: {
    label: 'Ville méditerranéenne',
    months: [1, 1, 2, 3, 3, 2, 1, 1, 3, 3, 2, 1],
    why: 'Le printemps et le début de l\'automne évitent à la fois la canicule estivale et l\'affluence.',
    avoid: 'Juillet-août : plus de 35 °C en journée dans les villes intérieures.',
  },
  europe_ouest_ville: {
    label: 'Europe de l\'Ouest — ville',
    months: [1, 1, 2, 3, 3, 3, 2, 2, 3, 2, 1, 2],
    why: 'Mai-juin et septembre : températures douces, journées longues, affluence raisonnable.',
    avoid: 'Novembre-février, gris et pluvieux — sauf pour les marchés de Noël en décembre.',
  },
  europe_ouest_nature: {
    label: 'Europe de l\'Ouest — nature',
    months: [0, 1, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
    why: 'Sentiers praticables et journées longues de mai à septembre.',
    avoid: 'L\'hiver : jours courts, chemins boueux, refuges fermés.',
  },
  europe_centrale: {
    label: 'Europe centrale',
    months: [1, 1, 2, 3, 3, 3, 2, 2, 3, 3, 1, 2],
    why: 'Printemps et automne sont les plus agréables ; décembre vaut le détour pour les marchés de Noël.',
    avoid: 'Janvier-février : froid sec et journées très courtes.',
  },
  scandinavie: {
    label: 'Scandinavie',
    months: [1, 1, 1, 2, 3, 3, 3, 3, 2, 1, 0, 1],
    why: 'Mai à août : soleil de minuit, nature accessible, tout est ouvert.',
    avoid: 'Novembre : nuit quasi permanente au nord et peu de neige encore.',
  },
  aurores_boreales: {
    label: 'Aurores boréales',
    months: [3, 3, 3, 1, 0, 0, 0, 0, 1, 2, 3, 3],
    why: 'Ciel noir de fin septembre à mars — indispensable pour voir les aurores.',
    avoid: 'Mai à juillet : le soleil de minuit rend les aurores invisibles.',
  },
  iles_britanniques: {
    label: 'Îles britanniques',
    months: [1, 1, 1, 2, 3, 3, 3, 3, 3, 2, 1, 1],
    why: 'Mai à septembre : le plus de lumière et le moins de pluie (tout est relatif).',
    avoid: 'Novembre-février : jours très courts et météo instable.',
  },
  balkans: {
    label: 'Balkans',
    months: [1, 1, 2, 3, 3, 3, 2, 2, 3, 3, 2, 1],
    why: 'Mai-juin et septembre-octobre : chaud sans excès, tarifs bas, sites peu fréquentés.',
    avoid: 'Août sur la côte : affluence et prix au maximum.',
  },
  baltes: {
    label: 'Pays baltes',
    months: [1, 1, 1, 2, 3, 3, 3, 3, 3, 2, 1, 2],
    why: 'Mai à septembre : longues journées et terrasses. Décembre pour les marchés de Noël.',
    avoid: 'Janvier-mars : −10 °C fréquents et peu d\'heures de jour.',
  },
  alpes_ete: {
    label: 'Alpes — été',
    months: [1, 1, 1, 1, 2, 3, 3, 3, 3, 2, 0, 1],
    why: 'Juin à septembre : cols ouverts, refuges en service, randonnée à son meilleur.',
    avoid: 'Novembre : intersaison, remontées et refuges fermés.',
  },
  alpes_hiver: {
    label: 'Alpes — hiver',
    months: [3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 1, 3],
    why: 'Décembre à mars : enneigement fiable et stations en pleine activité.',
    avoid: 'Avril à novembre : hors saison de ski.',
  },
  islande: {
    label: 'Islande',
    months: [1, 1, 2, 2, 3, 3, 3, 3, 3, 2, 1, 1],
    why: 'Juin à août : routes intérieures ouvertes, nuit blanche. Septembre-mars pour les aurores.',
    avoid: 'Décembre-février : 4 h de jour et pistes du centre fermées.',
  },
  russie_ville: {
    label: 'Russie — ville',
    months: [1, 1, 1, 2, 3, 3, 3, 3, 3, 2, 1, 2],
    why: 'Mai à septembre : climat clément et nuits blanches en juin à Saint-Pétersbourg.',
    avoid: 'Janvier-mars : −15 °C fréquents.',
  },
  turquie: {
    label: 'Turquie',
    months: [1, 1, 2, 3, 3, 2, 1, 1, 3, 3, 2, 1],
    why: 'Avril-mai et septembre-octobre : chaleur supportable et lumière superbe.',
    avoid: 'Juillet-août : plus de 35 °C à Istanbul comme en Cappadoce.',
  },
  // ── Hors Europe ────────────────────────────────────────
  maghreb: {
    label: 'Maghreb',
    months: [2, 2, 3, 3, 3, 2, 1, 1, 2, 3, 3, 2],
    why: 'Mars-mai et octobre-novembre : chaleur douce, idéale pour les médinas et le désert.',
    avoid: 'Juillet-août : plus de 40 °C à l\'intérieur des terres.',
  },
  asie_mousson: {
    label: 'Asie du Sud-Est',
    months: [3, 3, 2, 1, 1, 0, 0, 0, 1, 2, 3, 3],
    why: 'Novembre à mars : saison sèche, humidité supportable.',
    avoid: 'Juin à septembre : mousson, fortes pluies quotidiennes.',
  },
  japon: {
    label: 'Japon',
    months: [1, 1, 3, 3, 2, 1, 1, 1, 2, 3, 3, 1],
    why: 'Fin mars-avril pour les cerisiers, octobre-novembre pour les érables : les deux temps forts.',
    avoid: 'Juin-juillet : saison des pluies puis chaleur moite.',
  },
  amerique_nord_est: {
    label: 'Amérique du Nord — Est',
    months: [1, 1, 1, 2, 3, 3, 2, 2, 3, 3, 1, 1],
    why: 'Mai-juin et septembre-octobre : températures agréables, couleurs d\'automne spectaculaires.',
    avoid: 'Janvier-février : froid vif et tempêtes de neige.',
  },
  caraibes: {
    label: 'Caraïbes',
    months: [3, 3, 3, 3, 2, 1, 1, 0, 0, 1, 2, 3],
    why: 'Décembre à avril : saison sèche, mer calme.',
    avoid: 'Août-octobre : saison cyclonique.',
  },
  tropical_sud: {
    label: 'Tropiques — hémisphère sud',
    months: [2, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 2],
    why: 'Mai à octobre : saison sèche et températures modérées.',
    avoid: 'Janvier-mars : chaleur humide et risque cyclonique.',
  },
  oceanie: {
    label: 'Océanie',
    months: [2, 2, 3, 3, 2, 1, 1, 1, 2, 3, 3, 2],
    why: 'Le printemps (sept.-nov.) et l\'automne austral (mars-mai) évitent les extrêmes.',
    avoid: 'Juin-août : hiver austral au sud, saison humide au nord.',
  },
  toute_annee: {
    label: 'Toute l\'année',
    months: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    why: 'Destination praticable en toute saison.',
    avoid: '',
  },
};

/** Profil par défaut selon le pays. */
const COUNTRY_SEASON = {
  'France': 'europe_ouest_ville',
  'France (DOM)': 'caraibes',
  'France (COM)': 'tropical_sud',
  'Espagne': 'mediterranee_ville',
  'Portugal': 'mediterranee_ville',
  'Italie': 'mediterranee_ville',
  'Grèce': 'mediterranee_plage',
  'Croatie': 'mediterranee_plage',
  'Monténégro': 'balkans',
  'Albanie': 'balkans',
  'Serbie': 'balkans',
  'Bosnie-Herzégovine': 'balkans',
  'Macédoine du Nord': 'balkans',
  'Bulgarie': 'balkans',
  'Roumanie': 'europe_centrale',
  'Slovénie': 'europe_centrale',
  'Slovaquie': 'europe_centrale',
  'Hongrie': 'europe_centrale',
  'Pologne': 'europe_centrale',
  'République Tchèque': 'europe_centrale',
  'Autriche': 'europe_centrale',
  'Allemagne': 'europe_ouest_ville',
  'Pays-Bas': 'europe_ouest_ville',
  'Belgique': 'europe_ouest_ville',
  'Luxembourg': 'europe_ouest_ville',
  'Suisse': 'alpes_ete',
  'Andorre': 'alpes_ete',
  'Royaume-Uni': 'iles_britanniques',
  'Écosse': 'iles_britanniques',
  'Irlande': 'iles_britanniques',
  'Danemark': 'scandinavie',
  'Suède': 'scandinavie',
  'Norvège': 'scandinavie',
  'Finlande': 'scandinavie',
  'Islande': 'islande',
  'Estonie': 'baltes',
  'Lettonie': 'baltes',
  'Lituanie': 'baltes',
  'Russie': 'russie_ville',
  'Turquie': 'turquie',
  'Chypre': 'mediterranee_plage',
  'Malte': 'mediterranee_plage',
  'Maroc': 'maghreb',
  'Tunisie': 'maghreb',
  'Japon': 'japon',
  'Thaïlande': 'asie_mousson',
  'Vietnam': 'asie_mousson',
  'États-Unis': 'amerique_nord_est',
  'Canada': 'amerique_nord_est',
  'Bahamas': 'caraibes',
  'Australie': 'oceanie',
};

/** Surcharges par destination (id → profil ou notes mensuelles explicites). */
const SEASON_OVERRIDES = {
  // Stations de montagne : la saison utile est l'hiver
  'chamonix': 'alpes_hiver',
  'grandvalira': 'alpes_hiver',
  // Grand Nord : aurores boréales
  'tromso': 'aurores_boreales',
  'rovaniemi': 'aurores_boreales',
  'abisko': 'aurores_boreales',
  // Randonnée et nature en Europe de l'Ouest
  'connemara': 'europe_ouest_nature',
  'killarney': 'europe_ouest_nature',
  'donegal': 'europe_ouest_nature',
  'sligo': 'europe_ouest_nature',
  'ecosse-highlands': 'europe_ouest_nature',
  'skye': 'europe_ouest_nature',
  // Cas particuliers
  'islande-sud': 'islande',
  'reykjavik': 'islande',
  'laponie': 'aurores_boreales',
};

// ── API ──────────────────────────────────────────────────

/** Résout le profil saisonnier d'une destination. */
function seasonProfileFor(dest) {
  if (!dest) return null;
  if (dest.saison && Array.isArray(dest.saison.months)) return dest.saison;   // notes explicites dans data.js
  const key = SEASON_OVERRIDES[dest.id] || (dest.saison && typeof dest.saison === 'string' && dest.saison)
    || COUNTRY_SEASON[dest.pays] || 'toute_annee';
  return SEASON_PROFILES[key] || SEASON_PROFILES.toute_annee;
}

/** Note (0-3) d'un mois donné (1-12) pour une destination. */
function seasonScore(dest, month) {
  const p = seasonProfileFor(dest);
  if (!p) return null;
  return p.months[Math.max(0, Math.min(11, month - 1))];
}

/** Libellé et couleur d'une note. */
const seasonMeta = score => SEASON_LABELS[Math.max(0, Math.min(3, score | 0))];

/** Liste lisible des meilleurs mois : « mai à juin · septembre ». */
function bestMonthsLabel(dest) {
  const p = seasonProfileFor(dest);
  if (!p) return '';
  const best = [];
  p.months.forEach((s, i) => { if (s === 3) best.push(i); });
  if (!best.length) p.months.forEach((s, i) => { if (s === 2) best.push(i); });
  if (!best.length) return 'Toute l\'année';
  // Regroupe les mois consécutifs (en tenant compte du passage décembre → janvier)
  const groups = [];
  let run = [best[0]];
  for (let i = 1; i < best.length; i++) {
    if (best[i] === best[i - 1] + 1) run.push(best[i]);
    else { groups.push(run); run = [best[i]]; }
  }
  groups.push(run);
  if (groups.length > 1 && groups[0][0] === 0 && groups[groups.length - 1].slice(-1)[0] === 11) {
    groups[0] = groups.pop().concat(groups[0]);   // fusionne décembre-janvier
  }
  return groups.map(g => g.length === 1
    ? MONTHS_FULL[g[0]]
    : `${MONTHS_FULL[g[0]]} à ${MONTHS_FULL[g[g.length - 1]]}`).join(' · ');
}

/** Vrai si le mois donné est déconseillé (note 0). */
function isBadSeason(dest, month) { return seasonScore(dest, month) === 0; }

/**
 * Évalue une fenêtre de dates : renvoie la note la plus basse rencontrée
 * et un message si la période pose problème.
 */
function evaluatePeriod(dest, startISO, endISO) {
  if (!dest || !startISO) return null;
  const p = seasonProfileFor(dest);
  if (!p) return null;
  const start = new Date(startISO + 'T12:00:00');
  const end = new Date((endISO || startISO) + 'T12:00:00');
  const months = new Set();
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 400) { months.add(cur.getMonth() + 1); cur.setDate(cur.getDate() + 1); guard++; }
  if (!months.size) months.add(start.getMonth() + 1);
  const scores = [...months].map(m => p.months[m - 1]);
  const worst = Math.min(...scores);
  const best = Math.max(...scores);
  return {
    worst, best,
    meta: seasonMeta(worst),
    months: [...months],
    label: [...months].map(m => MONTHS_FULL[m - 1]).join(', '),
    advice: worst === 0
      ? `Période déconseillée pour ${shortName(dest)}. ${p.avoid || ''} Meilleure période : ${bestMonthsLabel(dest)}.`
      : worst === 1
        ? `Période acceptable sans plus. Meilleure période : ${bestMonthsLabel(dest)}.`
        : worst >= 3 ? 'Excellente période 👌' : 'Bonne période.',
  };
}

Object.assign(window, {
  SEASON_LABELS, SEASON_PROFILES, COUNTRY_SEASON, SEASON_OVERRIDES,
  MONTHS_SHORT, MONTHS_FULL,
  seasonProfileFor, seasonScore, seasonMeta, bestMonthsLabel, isBadSeason, evaluatePeriod,
});
