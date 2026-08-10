// ============================================================
// services/transport.js — comparateur voiture / avion (estimation)
// Les paramètres viennent des préférences utilisateur (core/prefs.js),
// plus aucune valeur de véhicule ou de ville codée en dur ici.
// ============================================================

/** Constantes physiques du modèle (indépendantes de l'utilisateur). */
const TRANSPORT_MODEL = {
  speedToll: 105,    // km/h moyenne avec autoroute
  speedNoToll: 72,   // km/h moyenne sans péage
  cruiseSpeed: 750,  // km/h vitesse de croisière avion
  taxiTime: 0.6,     // h — roulage, montée, descente
  toAirport: 0.75,   // h — trajet vers l'aéroport
  wait: 2,           // h — enregistrement + attente
  fromArrival: 1,    // h — sortie d'aéroport + trajet vers l'hébergement
};

/** Paramètres issus des préférences, surchargeables ponctuellement. */
function transportDefaults(opt) {
  const p = getPrefs();
  return Object.assign({
    conso: p.carConso,
    prix: p.carFuelPrice,
    tollRate: p.tollRate,
  }, TRANSPORT_MODEL, opt || {});
}

/** Les n aéroports les plus proches d'un point [lat, lon]. */
function nearestAirports(coords, n = 3) {
  const seen = new Set();
  return AIRPORTS
    .map(a => ({ ...a, dist: Math.round(haversine(coords, a.coords)) }))
    .sort((x, y) => x.dist - y.dist)
    .filter(a => { if (seen.has(a.iata)) return false; seen.add(a.iata); return true; })
    .slice(0, n);
}

/** Comparatif voiture entre deux points, avec/sans péages. */
function compareCar(from, to, opt) {
  const o = transportDefaults(opt);
  const km = roadDistance(from, to);
  const fuel = km / 100 * o.conso * o.prix;
  const tolls = km * o.tollRate;
  return {
    km: Math.round(km),
    fuel: Math.round(fuel),
    tolls: Math.round(tolls),
    totalToll: Math.round(fuel + tolls),
    totalNoToll: Math.round(fuel),
    timeToll: km / o.speedToll,
    timeNoToll: km / o.speedNoToll,
    dTime: km / o.speedNoToll - km / o.speedToll,
    economy: Math.round(tolls),
  };
}

/** Comparatif avion : aéroport de départ → coordonnées d'arrivée. */
function comparePlane(from, to, opt) {
  const o = transportDefaults(opt);
  const dep = (opt && opt.depAirport) || nearestAirports(from, 1)[0];
  const km = haversine(dep.coords, to);
  const flightTime = km / o.cruiseSpeed + o.taxiTime;
  return {
    dep,
    km: Math.round(km),
    flightTime,
    toAirport: o.toAirport, wait: o.wait, fromArrival: o.fromArrival,
    globalTime: o.toAirport + o.wait + flightTime + o.fromArrival,
  };
}

/**
 * Recommandation : la voiture l'emporte tant que le temps porte-à-porte
 * reste comparable et que la distance reste raisonnable.
 */
function recommend(dest, car, plane) {
  if (car.km <= 400) return 'voiture';
  if (car.km > 1500) return 'avion';
  if (plane && car.timeToll <= plane.globalTime + 1.5) return 'voiture';
  return 'avion';
}

Object.assign(window, {
  TRANSPORT_MODEL, transportDefaults, nearestAirports, compareCar, comparePlane, recommend,
});
