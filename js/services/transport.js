// ============================================================
// services/transport.js — comparateur voiture / avion (estimation)
// Estimations paramétrables, prêtes à être remplacées par des API.
// ============================================================

const DEFAULTS = {
  conso: 6.5,        // L/100km
  prix: 1.85,        // €/L
  tollRate: 0.075,   // €/km sur autoroute
  speedToll: 105,    // km/h moyenne avec autoroute
  speedNoToll: 72,   // km/h moyenne sans péage
  cruiseSpeed: 750,  // km/h vitesse de croisière avion
};

/** Les n aéroports les plus proches d'un point [lat, lon]. */
function nearestAirports(coords, n = 3) {
  return AIRPORTS
    .map(a => ({ ...a, dist: Math.round(haversine(coords, a.coords)) }))
    .sort((x, y) => x.dist - y.dist)
    .filter((a, i, arr) => arr.findIndex(b => b.iata === a.iata) === i) // dédoublonne par IATA
    .slice(0, n);
}

/** Comparatif voiture entre deux points, avec/sans péages. */
function compareCar(from, to, opt = {}) {
  const o = { ...DEFAULTS, ...opt };
  const km = roadDistance(from, to);
  const fuel = km / 100 * o.conso * o.prix;
  const tolls = km * o.tollRate;
  const timeToll = km / o.speedToll;
  const timeNoToll = km / o.speedNoToll;
  return {
    km: Math.round(km),
    fuel: Math.round(fuel),
    tolls: Math.round(tolls),
    totalToll: Math.round(fuel + tolls),
    totalNoToll: Math.round(fuel),
    timeToll, timeNoToll,
    dTime: timeNoToll - timeToll,   // temps perdu sans péage
    economy: Math.round(tolls),     // € économisés sans péage
  };
}

/** Comparatif avion : aéroport de départ → coordonnées d'arrivée. */
function comparePlane(from, to, opt = {}) {
  const o = { ...DEFAULTS, ...opt };
  const dep = opt.depAirport || nearestAirports(from, 1)[0];
  const km = haversine(dep.coords, to);
  const flightTime = km / o.cruiseSpeed + 0.6;        // vol + roulage/montée
  const toAirport = 0.75, wait = 2, fromArrival = 1;  // trajets + attente
  return {
    dep,
    km: Math.round(km),
    flightTime,
    toAirport, wait, fromArrival,
    globalTime: toAirport + wait + flightTime + fromArrival,
  };
}

/** Recommandation simple selon distance routière et pays. */
function recommend(dest, car) {
  const inFrance = /France/i.test(dest.pays || '');
  if (inFrance && car.km <= 800) return 'voiture';
  return 'avion';
}
