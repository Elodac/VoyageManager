// ============================================================
// services/currency.js — argent : taux, conversion, retrait & change
//
// Source des devises : data/countries.js (référentiel unique).
// Taux réels : Frankfurter (données BCE, gratuit, sans clé).
// En cas d'échec réseau, repli sur les taux figés du référentiel,
// affichés comme tels avec leur date — jamais présentés comme à jour.
// ============================================================

const FX_CACHE_KEY = 'vm_fx_cache';
const FX_TTL = 12 * 3600 * 1000;      // la BCE publie une fois par jour
const FX_FALLBACK_DATE = '2026-01-01';

/** Devises non cotées par la BCE : parité fixe ou repli assumé. */
const FX_NOT_ON_ECB = new Set(['ALL', 'TND', 'MAD', 'XPF', 'BAM', 'MKD', 'RSD', 'BSD', 'RUB']);

let _fxPromise = null;

/**
 * Taux € → devises. Toujours résolu.
 * @returns {Promise<{live:boolean, date:string, rates:Object}>}
 */
function getRates(force) {
  if (_fxPromise && !force) return _fxPromise;

  const fallback = () => {
    const rates = { EUR: 1 };
    Object.values(COUNTRIES).forEach(c => { if (c.fx) rates[c.devise] = c.fx; });
    return { live: false, date: FX_FALLBACK_DATE, rates };
  };

  const cached = lsGet(FX_CACHE_KEY, null);
  if (!force && cached && Date.now() - cached.ts < FX_TTL && cached.rates) {
    _fxPromise = Promise.resolve({ live: true, date: cached.date, rates: cached.rates });
    return _fxPromise;
  }

  const symbols = [...new Set(Object.values(COUNTRIES).map(c => c.devise))]
    .filter(c => c !== 'EUR' && !FX_NOT_ON_ECB.has(c)).join(',');

  _fxPromise = fetch('https://api.frankfurter.app/latest?from=EUR&to=' + symbols)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(d => {
      const rates = Object.assign({ EUR: 1 }, d.rates);
      // Les devises hors BCE gardent leur valeur de repli
      Object.values(COUNTRIES).forEach(c => { if (rates[c.devise] == null && c.fx) rates[c.devise] = c.fx; });
      lsSet(FX_CACHE_KEY, { ts: Date.now(), date: d.date, rates });
      return { live: true, date: d.date, rates };
    })
    .catch(() => (cached && cached.rates)
      ? { live: false, date: cached.date, rates: cached.rates }   // dernier taux connu
      : fallback());
  return _fxPromise;
}

/**
 * Convertit un montant entre deux devises.
 * @returns {Promise<{value:number, rate:number, live:boolean, date:string, approx:boolean}>}
 */
async function convert(amount, from, to) {
  const { live, date, rates } = await getRates();
  const rFrom = from === 'EUR' ? 1 : rates[from];
  const rTo = to === 'EUR' ? 1 : rates[to];
  if (!rFrom || !rTo) return { value: null, rate: null, live: false, date, approx: true };
  const rate = rTo / rFrom;
  const approx = !live || FX_NOT_ON_ECB.has(from) || FX_NOT_ON_ECB.has(to);
  return { value: amount * rate, rate, live: live && !approx, date, approx };
}

/** Taux et métadonnées pour un pays donné (null si zone euro). */
async function rateFor(pays) {
  const c = countryInfo(pays);
  if (c.euro) return null;
  const { live, date, rates } = await getRates();
  const r = rates[c.devise];
  const usable = typeof r === 'number' && isFinite(r) && r > 0;
  const isLive = live && usable && !FX_NOT_ON_ECB.has(c.devise);
  return {
    code: c.devise,
    symbol: c.symbole || c.devise,
    nom: c.nomDevise || c.devise,
    rate: usable ? r : c.fx,
    fixe: !!c.fixe,
    live: isLive,
    date: isLive ? date : FX_FALLBACK_DATE,
  };
}

/** Formate un montant dans sa devise, avec une précision adaptée à l'ordre de grandeur. */
function fmtMoney(value, code) {
  if (value == null || !isFinite(value)) return '—';
  const sym = currencySymbol(code);
  const digits = Math.abs(value) >= 1000 ? 0 : Math.abs(value) >= 10 ? 2 : 2;
  const n = value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n} ${sym}`;
}

// ── Retirer et changer de l'argent ───────────────────────
/**
 * Ressources réellement utiles pour obtenir la monnaie locale sur place.
 * Toutes les URL sont contextualisées avec la position de la destination
 * (recherche cartographique) ou sont des outils génériques vérifiables.
 */
function cashResources(dest) {
  const c = countryInfo(dest.pays);
  const ville = shortName(dest);
  const near = Array.isArray(dest.coords) && dest.coords.length === 2
    ? `${dest.coords[0]},${dest.coords[1]}` : '';
  const mapSearch = q => near
    ? `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${near},14z`
    : `https://www.google.com/maps/search/${encodeURIComponent(q + ' ' + ville)}`;

  return {
    devise: c,
    surPlace: [
      { label: '🏧 Distributeurs (ATM) à proximité', url: mapSearch('distributeur automatique de billets'), aide: 'Le meilleur taux, à condition de refuser la conversion proposée par l\'appareil.' },
      { label: '🏦 Banques à proximité', url: mapSearch('banque'), aide: 'Retrait au guichet possible, souvent avec commission.' },
      { label: '💱 Bureaux de change', url: mapSearch('bureau de change'), aide: 'Comparer plusieurs bureaux ; éviter ceux des aéroports et gares.' },
      { label: '🗺️ Distributeurs Visa (localisateur officiel)', url: 'https://www.visa.fr/payer-avec-visa/trouver-un-distributeur.html', aide: 'Localisateur officiel Visa, filtre par réseau.' },
      { label: '🗺️ Distributeurs Mastercard', url: 'https://www.mastercard.fr/fr-fr/consommateurs/trouver-un-distributeur.html', aide: 'Localisateur officiel Mastercard.' },
    ],
    avantDepart: [
      { label: '💳 Wise — carte multidevise', url: 'https://wise.com/fr/', aide: 'Taux interbancaire réel, frais annoncés à l\'avance.' },
      { label: '💳 Revolut', url: 'https://www.revolut.com/fr-FR/', aide: 'Change gratuit jusqu\'à un plafond mensuel, week-ends majorés.' },
      { label: '📊 Comparer les taux du jour (XE)', url: `https://www.xe.com/currencyconverter/convert/?From=EUR&To=${c.devise}`, aide: 'Référence pour vérifier qu\'un bureau ne surfacture pas.' },
    ],
    conseils: [
      c.fixe
        ? `Le ${c.nomDevise || c.devise} est en parité fixe avec l'euro : le taux ne bouge pas, seuls les frais varient.`
        : 'Le taux fluctue : vérifier le taux du jour avant de changer une grosse somme.',
      'Toujours refuser la « conversion dynamique » (payer en euros) proposée par les terminaux et distributeurs locaux : le taux appliqué est systématiquement défavorable.',
      'Éviter les bureaux de change des aéroports et des gares : ce sont les moins avantageux.',
      'Retirer une grosse somme en une fois plutôt que plusieurs petites : les frais fixes par retrait s\'additionnent.',
      'Prévenir sa banque du voyage pour éviter un blocage de la carte.',
    ].concat(c.devise === 'RUB' ? ['Les cartes Visa et Mastercard émises en Europe ne fonctionnent pas en Russie : prévoir des espèces en amont.'] : []),
  };
}

Object.assign(window, {
  FX_FALLBACK_DATE, FX_NOT_ON_ECB, getRates, convert, rateFor, fmtMoney, cashResources,
});
