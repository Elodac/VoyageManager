// ============================================================
// data/countries.js — référentiel PAYS (source unique)
//
// Devise, langue, fuseau, sens de conduite, type de prise,
// appartenance UE / Schengen / zone euro, numéros d'urgence.
//
// Avant, ces informations étaient dispersées : CURRENCIES dans un
// service, des mentions en texte libre dans chaque fiche, et rien
// pour le reste. Tout module qui a besoin d'un fait « pays » lit ici.
// ============================================================

/**
 * eu       : membre de l'Union européenne
 * schengen : espace Schengen (contrôles aux frontières)
 * euro     : zone euro (aucune conversion nécessaire)
 * fx       : taux de repli 1 € = N unités, figé au 2026-01-01
 */
const COUNTRIES = {
  'France':              { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Français', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/E', urgence: '112', continent: 'Europe' },
  'France (DOM)':        { devise: 'EUR', euro: 1, eu: 1, schengen: 0, langue: 'Français', fuseau: 'UTC−4', conduite: 'droite', prise: 'C/E', urgence: '112', continent: 'Europe (DOM-TOM)' },
  'France (COM)':        { devise: 'XPF', fx: 119.33, symbole: 'F', nomDevise: 'Franc Pacifique', eu: 0, schengen: 0, langue: 'Français', fuseau: 'UTC+11', conduite: 'droite', prise: 'C/E', urgence: '112', fixe: 1, continent: 'Océanie' },
  'Espagne':             { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Espagnol', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Portugal':            { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Portugais', fuseau: 'UTC+0', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Italie':              { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Italien', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F/L', urgence: '112', continent: 'Europe' },
  'Grèce':               { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Grec', fuseau: 'UTC+2', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Allemagne':           { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Allemand', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Pays-Bas':            { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Néerlandais', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Belgique':            { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Français / néerlandais', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/E', urgence: '112', continent: 'Europe' },
  'Luxembourg':          { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Luxembourgeois / français', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Autriche':            { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Allemand', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Irlande':             { devise: 'EUR', euro: 1, eu: 1, schengen: 0, langue: 'Anglais', fuseau: 'UTC+0', conduite: 'gauche', prise: 'G', urgence: '112 / 999', continent: 'Europe' },
  'Finlande':            { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Finnois / suédois', fuseau: 'UTC+2', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Estonie':             { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Estonien', fuseau: 'UTC+2', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Lettonie':            { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Letton', fuseau: 'UTC+2', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Lituanie':            { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Lituanien', fuseau: 'UTC+2', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Slovénie':            { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Slovène', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Slovaquie':           { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Slovaque', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/E', urgence: '112', continent: 'Europe' },
  'Croatie':             { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Croate', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Monténégro':          { devise: 'EUR', euro: 1, eu: 0, schengen: 0, langue: 'Monténégrin', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Andorre':             { devise: 'EUR', euro: 1, eu: 0, schengen: 0, langue: 'Catalan / français', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Malte':               { devise: 'EUR', euro: 1, eu: 1, schengen: 1, langue: 'Maltais / anglais', fuseau: 'UTC+1', conduite: 'gauche', prise: 'G', urgence: '112', continent: 'Europe' },
  'Chypre':              { devise: 'EUR', euro: 1, eu: 1, schengen: 0, langue: 'Grec / turc', fuseau: 'UTC+2', conduite: 'gauche', prise: 'G', urgence: '112', continent: 'Europe' },

  'Royaume-Uni':         { devise: 'GBP', fx: 0.845, symbole: '£', nomDevise: 'Livre sterling', eu: 0, schengen: 0, langue: 'Anglais', fuseau: 'UTC+0', conduite: 'gauche', prise: 'G', urgence: '999 / 112', continent: 'Europe' },
  'Écosse':              { devise: 'GBP', fx: 0.845, symbole: '£', nomDevise: 'Livre sterling', eu: 0, schengen: 0, langue: 'Anglais', fuseau: 'UTC+0', conduite: 'gauche', prise: 'G', urgence: '999 / 112', continent: 'Europe' },
  'Suisse':              { devise: 'CHF', fx: 0.94, symbole: 'CHF', nomDevise: 'Franc suisse', eu: 0, schengen: 1, langue: 'Allemand / français / italien', fuseau: 'UTC+1', conduite: 'droite', prise: 'J', urgence: '112', continent: 'Europe' },
  'Danemark':            { devise: 'DKK', fx: 7.46, symbole: 'kr', nomDevise: 'Couronne danoise', eu: 1, schengen: 1, langue: 'Danois', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/K', urgence: '112', continent: 'Europe' },
  'Suède':               { devise: 'SEK', fx: 11.2, symbole: 'kr', nomDevise: 'Couronne suédoise', eu: 1, schengen: 1, langue: 'Suédois', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Norvège':             { devise: 'NOK', fx: 11.5, symbole: 'kr', nomDevise: 'Couronne norvégienne', eu: 0, schengen: 1, langue: 'Norvégien', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Islande':             { devise: 'ISK', fx: 150, symbole: 'kr', nomDevise: 'Couronne islandaise', eu: 0, schengen: 1, langue: 'Islandais', fuseau: 'UTC+0', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Pologne':             { devise: 'PLN', fx: 4.28, symbole: 'zł', nomDevise: 'Zloty polonais', eu: 1, schengen: 1, langue: 'Polonais', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/E', urgence: '112', continent: 'Europe' },
  'République Tchèque':  { devise: 'CZK', fx: 25.3, symbole: 'Kč', nomDevise: 'Couronne tchèque', eu: 1, schengen: 1, langue: 'Tchèque', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/E', urgence: '112', continent: 'Europe' },
  'Hongrie':             { devise: 'HUF', fx: 395, symbole: 'Ft', nomDevise: 'Forint hongrois', eu: 1, schengen: 1, langue: 'Hongrois', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Roumanie':            { devise: 'RON', fx: 4.97, symbole: 'lei', nomDevise: 'Leu roumain', eu: 1, schengen: 1, langue: 'Roumain', fuseau: 'UTC+2', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Bulgarie':            { devise: 'BGN', fx: 1.9558, symbole: 'лв', nomDevise: 'Lev bulgare', eu: 1, schengen: 1, langue: 'Bulgare', fuseau: 'UTC+2', conduite: 'droite', prise: 'C/F', urgence: '112', fixe: 1, continent: 'Europe' },
  'Serbie':              { devise: 'RSD', fx: 117, symbole: 'дин', nomDevise: 'Dinar serbe', eu: 0, schengen: 0, langue: 'Serbe', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Bosnie-Herzégovine':  { devise: 'BAM', fx: 1.9558, symbole: 'KM', nomDevise: 'Mark convertible', eu: 0, schengen: 0, langue: 'Bosnien', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', fixe: 1, continent: 'Europe' },
  'Macédoine du Nord':   { devise: 'MKD', fx: 61.5, symbole: 'ден', nomDevise: 'Denar macédonien', eu: 0, schengen: 0, langue: 'Macédonien', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Albanie':             { devise: 'ALL', fx: 98, symbole: 'L', nomDevise: 'Lek albanais', eu: 0, schengen: 0, langue: 'Albanais', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Turquie':             { devise: 'TRY', fx: 38, symbole: '₺', nomDevise: 'Livre turque', eu: 0, schengen: 0, langue: 'Turc', fuseau: 'UTC+3', conduite: 'droite', prise: 'C/F', urgence: '112', continent: 'Europe' },
  'Russie':              { devise: 'RUB', fx: 100, symbole: '₽', nomDevise: 'Rouble russe', eu: 0, schengen: 0, langue: 'Russe', fuseau: 'UTC+3', conduite: 'droite', prise: 'C/F', urgence: '112', visa: 1, alerte: 'Consulter les recommandations de France Diplomatie avant tout projet.', continent: 'Europe' },

  'Maroc':               { devise: 'MAD', fx: 10.7, symbole: 'DH', nomDevise: 'Dirham marocain', eu: 0, schengen: 0, langue: 'Arabe / français', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/E', urgence: '19 / 15', continent: 'Afrique' },
  'Tunisie':             { devise: 'TND', fx: 3.4, symbole: 'DT', nomDevise: 'Dinar tunisien', eu: 0, schengen: 0, langue: 'Arabe / français', fuseau: 'UTC+1', conduite: 'droite', prise: 'C/E', urgence: '197 / 190', continent: 'Afrique' },
  'Japon':               { devise: 'JPY', fx: 163, symbole: '¥', nomDevise: 'Yen japonais', eu: 0, schengen: 0, langue: 'Japonais', fuseau: 'UTC+9', conduite: 'gauche', prise: 'A/B', urgence: '110 / 119', continent: 'Asie' },
  'Thaïlande':           { devise: 'THB', fx: 37, symbole: '฿', nomDevise: 'Baht thaïlandais', eu: 0, schengen: 0, langue: 'Thaï', fuseau: 'UTC+7', conduite: 'gauche', prise: 'A/B/C', urgence: '191 / 1669', continent: 'Asie' },
  'Vietnam':             { devise: 'VND', fx: 27200, symbole: '₫', nomDevise: 'Dong vietnamien', eu: 0, schengen: 0, langue: 'Vietnamien', fuseau: 'UTC+7', conduite: 'droite', prise: 'A/C', urgence: '113 / 115', continent: 'Asie' },
  'États-Unis':          { devise: 'USD', fx: 1.08, symbole: '$', nomDevise: 'Dollar américain', eu: 0, schengen: 0, langue: 'Anglais', fuseau: 'UTC−5 à −8', conduite: 'droite', prise: 'A/B', urgence: '911', visa: 'ESTA', continent: 'Amériques' },
  'Canada':              { devise: 'CAD', fx: 1.47, symbole: 'CA$', nomDevise: 'Dollar canadien', eu: 0, schengen: 0, langue: 'Anglais / français', fuseau: 'UTC−4 à −8', conduite: 'droite', prise: 'A/B', urgence: '911', visa: 'AVE', continent: 'Amériques' },
  'Bahamas':            { devise: 'BSD', fx: 1.08, symbole: 'B$', nomDevise: 'Dollar bahaméen', eu: 0, schengen: 0, langue: 'Anglais', fuseau: 'UTC−5', conduite: 'gauche', prise: 'A/B', urgence: '911', fixe: 1, continent: 'Amériques' },
  'Australie':           { devise: 'AUD', fx: 1.64, symbole: 'A$', nomDevise: 'Dollar australien', eu: 0, schengen: 0, langue: 'Anglais', fuseau: 'UTC+8 à +11', conduite: 'gauche', prise: 'I', urgence: '000', visa: 'eVisitor', continent: 'Océanie' },
};

const DEFAULT_COUNTRY = {
  devise: 'EUR', eu: 0, schengen: 0,
  langue: '', fuseau: '', conduite: 'droite', prise: 'C/E', urgence: '112',
};

/**
 * Informations pays, jamais nulles.
 * `euro` est TOUJOURS dérivé de la devise : le déduire d'une valeur par
 * défaut faisait passer le Royaume-Uni (qui ne déclare pas la clé) pour
 * un pays de la zone euro, et masquait tout le module de change.
 */
function countryInfo(pays) {
  const c = Object.assign({ pays }, DEFAULT_COUNTRY, COUNTRIES[pays] || {});
  c.euro = c.devise === 'EUR' ? 1 : 0;
  return c;
}

/** Vrai si le pays utilise l'euro (aucune conversion à prévoir). */
const usesEuro = pays => !!countryInfo(pays).euro;

/** Code devise d'un pays. */
const currencyOf = pays => countryInfo(pays).devise;

/** Liste des devises distinctes présentes dans le catalogue. */
function catalogCurrencies() {
  const set = new Set(['EUR']);
  (window.DESTINATIONS || []).forEach(d => set.add(currencyOf(d.pays)));
  return [...set];
}

/** Libellé lisible d'une devise : « Livre sterling (GBP) ». */
function currencyLabel(code) {
  const c = Object.values(COUNTRIES).find(x => x.devise === code);
  if (code === 'EUR') return 'Euro (EUR)';
  return c && c.nomDevise ? `${c.nomDevise} (${code})` : code;
}
const currencySymbol = code => {
  if (code === 'EUR') return '€';
  const c = Object.values(COUNTRIES).find(x => x.devise === code);
  return (c && c.symbole) || code;
};

/**
 * Complète les fiches destination avec les faits « pays » manquants.
 * Appelé une fois au démarrage : aucune fiche n'a besoin de répéter
 * la langue, le fuseau ou la devise de son pays.
 */
/**
 * Durée de séjour par défaut, déduite du type de destination et de
 * l'éloignement. Un « 3-4 jours » uniforme n'avait aucun sens pour une
 * île, un parc national ou un long courrier.
 */
function defaultStayLength(d) {
  const t = new Set(d.type || []);
  const lointain = (COUNTRIES[d.pays] || {}).continent
    && !['Europe', 'Europe (DOM-TOM)'].includes(COUNTRIES[d.pays].continent);
  if (lointain) return t.has('ville') ? '4-6 jours' : '10-14 jours';
  if (t.has('ile')) return '7 jours';
  if (t.has('randonnee') || t.has('volcan') || t.has('fjords')) return '5-7 jours';
  if (t.has('nature') || t.has('plage')) return '5-7 jours';
  if (t.has('ville')) return '2-4 jours';
  return '3-4 jours';
}

function applyCountryDefaults() {
  const info = {};
  (window.DESTINATIONS || []).forEach(d => {
    const c = info[d.pays] || (info[d.pays] = countryInfo(d.pays));
    if (!d.langue && c.langue) d.langue = c.langue;
    if (!d.fuseau && c.fuseau) d.fuseau = c.fuseau;
    if (!d.devise) d.devise = c.devise;
    if (!d.duree_conseillee) d.duree_conseillee = defaultStayLength(d);
    if (!Array.isArray(d.urgences) || !d.urgences.length) {
      d.urgences = [{ service: 'Urgences', tel: c.urgence }];
    }
  });
}

Object.assign(window, {
  COUNTRIES, countryInfo, usesEuro, currencyOf, catalogCurrencies,
  currencyLabel, currencySymbol, applyCountryDefaults, defaultStayLength,
});
