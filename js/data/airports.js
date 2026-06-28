// ============================================================
// data/airports.js — principaux aéroports & villes de départ
// (dataset statique, extensible ; sert au calcul d'aéroports proches)
// ============================================================

/** Principaux aéroports français + quelques hubs européens utiles. */
const AIRPORTS = [
  { iata: 'NTE', nom: 'Nantes Atlantique',       ville: 'Nantes',      pays: 'France', coords: [47.1532, -1.6107] },
  { iata: 'CDG', nom: 'Paris Charles-de-Gaulle', ville: 'Paris',       pays: 'France', coords: [49.0097, 2.5479] },
  { iata: 'ORY', nom: 'Paris Orly',              ville: 'Paris',       pays: 'France', coords: [48.7233, 2.3794] },
  { iata: 'LYS', nom: 'Lyon Saint-Exupéry',      ville: 'Lyon',        pays: 'France', coords: [45.7256, 5.0811] },
  { iata: 'MRS', nom: 'Marseille Provence',      ville: 'Marseille',   pays: 'France', coords: [43.4393, 5.2214] },
  { iata: 'TLS', nom: 'Toulouse Blagnac',        ville: 'Toulouse',    pays: 'France', coords: [43.6294, 1.3638] },
  { iata: 'BOD', nom: 'Bordeaux Mérignac',       ville: 'Bordeaux',    pays: 'France', coords: [44.8283, -0.7156] },
  { iata: 'NCE', nom: 'Nice Côte d’Azur',        ville: 'Nice',        pays: 'France', coords: [43.6584, 7.2159] },
  { iata: 'LIL', nom: 'Lille Lesquin',           ville: 'Lille',       pays: 'France', coords: [50.5619, 3.0894] },
  { iata: 'RNS', nom: 'Rennes Saint-Jacques',    ville: 'Rennes',      pays: 'France', coords: [48.0695, -1.7348] },
  { iata: 'BES', nom: 'Brest Bretagne',          ville: 'Brest',       pays: 'France', coords: [48.4479, -4.4185] },
  { iata: 'SXB', nom: 'Strasbourg',              ville: 'Strasbourg',  pays: 'France', coords: [48.5383, 7.6282] },
  { iata: 'MPL', nom: 'Montpellier Méditerranée',ville: 'Montpellier', pays: 'France', coords: [43.5762, 3.9630] },
  { iata: 'BIQ', nom: 'Biarritz Pays Basque',    ville: 'Biarritz',    pays: 'France', coords: [43.4684, -1.5311] },
  { iata: 'GVA', nom: 'Genève',                  ville: 'Genève',      pays: 'Suisse', coords: [46.2381, 6.1089] },
  { iata: 'BRU', nom: 'Bruxelles',               ville: 'Bruxelles',   pays: 'Belgique', coords: [50.9014, 4.4844] },
];

/** Villes de départ courantes (pour la saisie / sélection rapide). */
const FR_CITIES = [
  { nom: 'Nantes',      coords: [47.2184, -1.5536] },
  { nom: 'Paris',       coords: [48.8566, 2.3522] },
  { nom: 'Lyon',        coords: [45.7640, 4.8357] },
  { nom: 'Marseille',   coords: [43.2965, 5.3698] },
  { nom: 'Bordeaux',    coords: [44.8378, -0.5792] },
  { nom: 'Toulouse',    coords: [43.6047, 1.4442] },
  { nom: 'Lille',       coords: [50.6292, 3.0573] },
  { nom: 'Rennes',      coords: [48.1173, -1.6778] },
  { nom: 'Nice',        coords: [43.7102, 7.2620] },
  { nom: 'Strasbourg',  coords: [48.5734, 7.7521] },
  { nom: 'Montpellier', coords: [43.6108, 3.8767] },
  { nom: 'Angers',      coords: [47.4784, -0.5632] },
];
