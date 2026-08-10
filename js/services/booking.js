// ============================================================
// services/booking.js — construction des liens de réservation
//
// SOURCE UNIQUE. Auparavant, cinq endroits fabriquaient leurs propres
// URL avec des paramètres approximatifs (dates figées, aéroport en dur,
// nombre de voyageurs ignoré). Tout passe désormais par ici.
//
// Règle : on ne fabrique un paramètre que si la plateforme le documente
// réellement. Sinon on envoie vers la recherche générique plutôt que
// vers une URL qui ferait semblant de fonctionner.
// ============================================================

/**
 * Contexte de réservation normalisé.
 * @param {object} o {dest, trip, stop, checkin, checkout, travelers, rooms}
 */
function bookingContext(o) {
  const p = getPrefs();
  const dest = o.dest || (o.trip && destById(o.trip.destinationId)) || {};
  const trip = o.trip || null;

  // Les dates viennent TOUJOURS du voyage quand il existe : c'est la source de vérité.
  const checkin = o.checkin || (trip && trip.date_depart) || '';
  const checkout = o.checkout || (trip && trip.date_retour) || '';
  const travelers = o.travelers || (trip && trip.travelers) || p.travelers || 2;
  const rooms = o.rooms || Math.max(1, Math.ceil(travelers / 2));

  return {
    dest,
    ville: o.ville || shortName(dest) || (trip && shortName(trip)) || '',
    villeComplete: o.villeComplete || dest.nom || (trip && trip.nom) || '',
    pays: dest.pays || (trip && trip.pays) || '',
    iata: o.iata || dest.iata || '',
    fromIata: o.fromIata || p.departIata || '',
    checkin, checkout, travelers, rooms,
    hasDates: !!(checkin && checkout),
  };
}

/** Requête de recherche géographique la plus précise possible. */
function _place(ctx) {
  return encodeURIComponent([ctx.villeComplete || ctx.ville, ctx.pays].filter(Boolean).join(', '));
}

// ── HÉBERGEMENT ──────────────────────────────────────────
/**
 * Chaque entrée précise ce qu'elle sait faire :
 *   dates:true      → l'URL transmet réellement les dates
 *   voyageurs:true  → l'URL transmet réellement le nombre de personnes
 * L'interface affiche ces indicateurs : pas de promesse en l'air.
 */
function lodgingLinks(o) {
  const c = bookingContext(o);
  const place = _place(c);
  const d = c.hasDates;
  return [
    {
      label: 'Booking.com', emoji: '🅱️', dates: d, voyageurs: true,
      url: 'https://www.booking.com/searchresults.fr.html?ss=' + place
        + (d ? `&checkin=${c.checkin}&checkout=${c.checkout}` : '')
        + `&group_adults=${c.travelers}&no_rooms=${c.rooms}&group_children=0`,
    },
    {
      label: 'Airbnb', emoji: '🏠', dates: d, voyageurs: true,
      url: `https://www.airbnb.fr/s/${place}/homes?adults=${c.travelers}`
        + (d ? `&checkin=${c.checkin}&checkout=${c.checkout}` : ''),
    },
    {
      label: 'Hotels.com', emoji: '🏨', dates: d, voyageurs: true,
      url: 'https://fr.hotels.com/Hotel-Search?destination=' + place
        + (d ? `&startDate=${c.checkin}&endDate=${c.checkout}` : '')
        + `&adults=${c.travelers}&rooms=${c.rooms}`,
    },
    {
      label: 'Expedia', emoji: '🟡', dates: d, voyageurs: true,
      url: 'https://www.expedia.fr/Hotel-Search?destination=' + place
        + (d ? `&startDate=${c.checkin}&endDate=${c.checkout}` : '')
        + `&adults=${c.travelers}&rooms=${c.rooms}`,
    },
    {
      label: 'Abritel / Vrbo', emoji: '🟧', dates: d, voyageurs: true,
      url: 'https://www.abritel.fr/search?q=' + place
        + (d ? `&startDate=${c.checkin}&endDate=${c.checkout}` : '')
        + `&adults=${c.travelers}`,
    },
    {
      // Google Hotels n'expose pas de paramètre de date documenté et stable :
      // on envoie la recherche, sans prétendre transmettre les dates.
      label: 'Google Hotels', emoji: '🔷', dates: false, voyageurs: false,
      url: 'https://www.google.com/travel/search?q=' + place,
    },
  ];
}

// ── VOLS ─────────────────────────────────────────────────
function flightLinks(o) {
  const c = bookingContext(o);
  const from = (c.fromIata || '').toUpperCase();
  const to = (c.iata || '').split('/')[0].trim().toUpperCase();   // certaines fiches listent plusieurs aéroports
  const ok = /^[A-Z]{3}$/.test(from) && /^[A-Z]{3}$/.test(to);
  const links = [];

  if (ok && c.checkin) {
    links.push({
      label: `Google Flights ${from} → ${to}`, emoji: '🔷', dates: true, voyageurs: true,
      url: `https://www.google.com/travel/flights?q=${encodeURIComponent(
        `Flights from ${from} to ${to} on ${c.checkin}${c.checkout ? ' through ' + c.checkout : ''} for ${c.travelers} adults`)}`,
    });
    links.push({
      label: `Skyscanner ${from} → ${to}`, emoji: '🔶', dates: true, voyageurs: true,
      url: `https://www.skyscanner.fr/transport/vols/${from.toLowerCase()}/${to.toLowerCase()}/`
        + `${c.checkin.replace(/-/g, '').slice(2)}/${c.checkout ? c.checkout.replace(/-/g, '').slice(2) + '/' : ''}`
        + `?adults=${c.travelers}`,
    });
    links.push({
      label: `Kayak ${from} → ${to}`, emoji: '🟦', dates: true, voyageurs: true,
      url: `https://www.kayak.fr/flights/${from}-${to}/${c.checkin}${c.checkout ? '/' + c.checkout : ''}/${c.travelers}adults`,
    });
  } else if (ok) {
    links.push({ label: `Google Flights ${from} → ${to}`, emoji: '🔷', dates: false, voyageurs: false,
      url: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${from} to ${to}`)}` });
    links.push({ label: `Skyscanner ${from} → ${to}`, emoji: '🔶', dates: false, voyageurs: false,
      url: `https://www.skyscanner.fr/transport/vols/${from.toLowerCase()}/${to.toLowerCase()}/` });
    links.push({ label: `Kayak ${from} → ${to}`, emoji: '🟦', dates: false, voyageurs: false,
      url: `https://www.kayak.fr/flights/${from}-${to}` });
  } else {
    // Pas de code IATA fiable : on n'invente pas d'URL, on envoie vers la recherche
    links.push({ label: 'Google Flights', emoji: '🔷', dates: false, voyageurs: false, url: 'https://www.google.com/travel/flights' });
    links.push({ label: 'Skyscanner', emoji: '🔶', dates: false, voyageurs: false, url: 'https://www.skyscanner.fr/transport/vols/' });
    links.push({ label: 'Kayak', emoji: '🟦', dates: false, voyageurs: false, url: 'https://www.kayak.fr/flights' });
  }
  return links;
}

// ── TRAIN, BUS, LOCATION, FERRY ──────────────────────────
function groundLinks(o) {
  const c = bookingContext(o);
  const place = _place(c);
  const d = c.hasDates;
  return [
    { label: 'Trainline (train & bus)', emoji: '🚆', dates: false, voyageurs: false, url: 'https://www.thetrainline.com/fr' },
    { label: 'SNCF Connect', emoji: '🚄', dates: false, voyageurs: false, url: 'https://www.sncf-connect.com' },
    { label: 'Omio (multimodal)', emoji: '🔀', dates: false, voyageurs: false, url: 'https://www.omio.fr' },
    { label: 'FlixBus', emoji: '🚌', dates: false, voyageurs: false, url: 'https://www.flixbus.fr' },
    { label: 'Rome2Rio — comment y aller', emoji: '🧭', dates: false, voyageurs: false,
      url: `https://www.rome2rio.com/fr/s/${encodeURIComponent(c.fromIata || 'Paris')}/${place}` },
    { label: 'Location de voiture (Discover Cars)', emoji: '🚗', dates: d, voyageurs: false,
      url: 'https://www.discovercars.com/fr' },
    { label: 'Direct Ferries', emoji: '⛴️', dates: false, voyageurs: false, url: 'https://www.directferries.fr' },
  ];
}

// ── ACTIVITÉS ────────────────────────────────────────────
function activityLinks(o) {
  const c = bookingContext(o);
  const q = encodeURIComponent(c.ville);
  const place = _place(c);
  return [
    { label: 'GetYourGuide', emoji: '🟠', dates: false, voyageurs: false, url: `https://www.getyourguide.fr/s/?q=${q}` },
    { label: 'Viator', emoji: '🎟️', dates: false, voyageurs: false, url: `https://www.viator.com/fr-FR/search/?q=${q}` },
    { label: 'TripAdvisor', emoji: '🟢', dates: false, voyageurs: false, url: `https://www.tripadvisor.fr/Search?q=${q}` },
    { label: 'Google Maps — à voir', emoji: '🗺️', dates: false, voyageurs: false, url: `https://www.google.com/maps/search/${place}+à+voir` },
    { label: 'Google Maps — restaurants', emoji: '🍽️', dates: false, voyageurs: false, url: `https://www.google.com/maps/search/${place}+restaurants` },
  ];
}

/** Rendu HTML d'une liste de liens, avec les indicateurs de paramétrage. */
function bookingLinksHTML(links, ctx) {
  return links.map(l => {
    const u = safeUrl(l.url);
    if (!u) return '';
    const tags = [];
    if (l.dates && ctx && ctx.hasDates) tags.push('<span class="bk-tag">dates</span>');
    if (l.voyageurs) tags.push('<span class="bk-tag">' + escHtml(ctx ? ctx.travelers : '') + ' pers.</span>');
    return `<a class="search-link-btn" href="${u}" target="_blank" rel="noopener noreferrer">
      <span class="bk-emoji" aria-hidden="true">${escHtml(l.emoji || '🔗')}</span>
      <span class="bk-label">${escHtml(l.label)}</span>
      ${tags.join('')}
    </a>`;
  }).join('');
}

Object.assign(window, {
  bookingContext, lodgingLinks, flightLinks, groundLinks, activityLinks, bookingLinksHTML,
});
