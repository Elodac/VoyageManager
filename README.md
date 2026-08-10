<div align="center">

# ✈️ VoyageManager

### Planifiez, organisez et centralisez tous vos voyages depuis une seule application.

![Version](https://img.shields.io/badge/Version-2.1-3b82f6?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)

</div>

---

## 📖 Sommaire

- [Présentation](#-présentation)
- [Fonctionnalités](#-fonctionnalités)
- [Installation](#-installation)
- [Architecture](#-architecture)
- [Modèle de données](#-modèle-de-données)
- [Personnalisation](#-personnalisation)
- [Développement](#-développement)
- [Vie privée & données](#-vie-privée--données)
- [Roadmap](#-roadmap)
- [Licence](#-licence)

---

## 🌍 Présentation

VoyageManager regroupe **toute la préparation d'un voyage** dans une seule
interface, pour remplacer la dizaine d'onglets habituellement ouverts (Booking,
Google Maps, Skyscanner, Tripadvisor, Routard, tableurs, notes…).

L'application est écrite en **HTML / CSS / JavaScript sans framework ni build**,
et fonctionne **entièrement côté client** : aucune donnée ne quitte le navigateur.

---

## ✨ Fonctionnalités

| Module | Ce qu'il fait |
|---|---|
| 🏠 **Tableau de bord** | Voyages à la une (réordonnables), avancement, check-list contextuelle, programme du prochain départ, compte à rebours |
| 🗺️ **Destinations** | 157 fiches sur 46 pays : budgets, lieux, gastronomie, Routard, bons plans, risques, urgences, **informations pratiques** (langue, devise, fuseau, conduite, prises, formalités). Filtres par statut, type, pays, dates et budget ± tolérance |
| 📍 **Carte** | Leaflet + clustering, marqueurs par statut, fond adapté au thème, tracé des road trips |
| 🧳 **Voyages** | Statut global (8 états), avancement par élément (transport / hébergement / activités), choix du logement, notes, dossier imprimable |
| 📆 **Agenda** | Grille jours × heures, glisser-déposer, redimensionnement, accroche 15 min, journées « détente », annulation, impression |
| 🧠 **Programmes** | Génération 3/5/7/10 jours par thème à partir des lieux de la destination, chargeable dans l'agenda |
| 🚗 **Road trips** | Module complet : point de départ et aéroports suggérés, étapes ordonnées, **un transport et un hébergement par étape**, dates dérivées, activités, budget, check-list, contrôle de cohérence, carte et **dossier imprimable** |
| 🚆 **Transport** | Comparateur voiture / avion : carburant, péages, temps porte-à-porte, aéroports proches |
| 🧳 **Valises** | Check-lists par modèle, catégories et éléments personnalisables, glisser-déposer, impression |
| 💶 **Budget** | Comparateur de destinations + suivi des dépenses réelles par catégorie |
| 🔍 **Réserver** | Liens pré-remplis (dates, voyageurs, aéroport) vers les grands sites |
| 🗓️ **Meilleure période** | Bande visuelle de 12 mois par destination, verdict sur les dates choisies |
| 💱 **Argent** | Convertisseur de devises (taux BCE), où retirer et changer sur place, conseils anti-frais |
| ⚙️ **Réglages** | Point de départ, voyageurs, véhicule, durée par défaut |
| 🔎 **Recherche globale** | `Ctrl/⌘ + K` — voyages, destinations, lieux, road trips, pages, actions |

**Aussi :** thème clair / sombre, profils multiples avec données cloisonnées,
export / import JSON, mode hors ligne (PWA), historique d'activité.

---

## 🚀 Installation

```bash
git clone https://github.com/Elodac/VoyageManager.git
```

```bash
cd VoyageManager
```

```bash
npm run serve
```

Puis ouvrir <http://localhost:8400>.

> `npm run serve` utilise `serve.json`, qui envoie les bons en-têtes de cache.
> Avec `python -m http.server`, pensez à recharger en vidant le cache après
> avoir modifié un fichier (le navigateur applique sinon une fraîcheur heuristique).

L'application a besoin d'un serveur HTTP : elle appelle des API distantes
(météo, taux de change, géocodage) qui ne fonctionnent pas en `file://`.

---

## 📂 Architecture

```
VoyageManager
├── index.html              Structure HTML uniquement (~560 lignes)
├── data.js                 Référentiel des destinations (lecture seule)
├── sw.js                   Service worker (hors ligne)
├── manifest.webmanifest
│
├── styles/
│   ├── tokens.css          Design system : couleurs, échelles, thèmes
│   └── main.css            Composants
│
└── js/
    ├── app.js              Amorçage & orchestration
    ├── model.js            Modèle Voyage, statuts, progression
    ├── store.js            État applicatif + persistance + pub/sub
    │
    ├── model.roadtrip.js   Modèle Road Trip (étapes, segments, calendrier)
    │
    ├── core/               Socle transverse
    │   ├── dom.js          Échappement, délégation, modales, dialogues
    │   ├── storage.js      Accès localStorage protégé (quota)
    │   ├── prefs.js        Préférences utilisateur
    │   ├── catalog.js      Lecture du référentiel destinations
    │   ├── tripdata.js     Agenda / valise / dépenses par voyage
    │   ├── backup.js       Export & import JSON
    │   ├── undo.js         Annulation générique
    │   ├── print.js        Documents imprimables
    │   ├── profiles.js     Profils, rôles, thème
    │   ├── history.js      Journal d'activité
    │   └── router.js       Navigation
    │
    ├── services/           Logique métier, sans DOM
    │   ├── booking.js      URL de réservation (source unique)
    │   ├── rtdossier.js    Dossier de road trip imprimable
    │   ├── geo.js          Distances (Haversine, détour routier)
    │   ├── geocode.js      Nominatim (file d'attente + cache)
    │   ├── weather.js      Open-Meteo (prévisions + normales)
    │   ├── currency.js     Frankfurter / BCE (+ repli hors ligne)
    │   ├── transport.js    Comparateur voiture / avion
    │   ├── programs.js     Génération d'itinéraires
    │   ├── flights.js      Interface « fournisseur de vols » (stub)
    │   ├── routard.js      Liens Guide du Routard
    │   └── dossier.js      Dossier de voyage imprimable
    │
    ├── views/              Une vue par page
    │   ├── widgets.js      Saisons, convertisseur, argent (transverses)
    │   ├── dashboard.js  destinations.js  destModal.js  map.js
    │   ├── agenda.js     valises.js       budget.js     roadtrips.js
    │   ├── archives.js   search.js        prefs.js      palette.js
    │   └── trips.js      transport.js     programs.js   forms.js
    │
    └── data/
        ├── airports.js     Aéroports & villes de départ
        ├── countries.js    Référentiel PAYS (devise, langue, fuseau, UE…)
        └── seasons.js      Profils saisonniers (meilleure période)
```

**Conventions**

- Scripts classiques (pas d'ES modules) : les modules communiquent par des
  globals publiés via `Object.assign(window, …)` en fin de fichier.
  `eslint.config.js` liste cette API — un nom absent est signalé.
- Aucun `onclick` inline : délégation d'événements et attributs `data-*`.
- Toute chaîne insérée dans du HTML passe par `escHtml()` / `escAttr()` ;
  toute URL issue des données passe par `safeUrl()`.
- Les services ne touchent jamais au DOM ; les vues ne font jamais de calcul métier.

---

## 🧩 Modèle de données

Deux objets, deux responsabilités :

### Destination et Voyage

| | **Destination** (`data.js`) | **Voyage** (`store.js`) |
|---|---|---|
| Nature | Référentiel, lecture seule | État de l'utilisateur |
| Contient | Coordonnées, lieux, budgets indicatifs, infos pays | Dates, statut, transport, hébergement, activités, notes, voyageurs |
| Identifiant | `id` (slug) | `id` (généré) + `destinationId` |

Un voyage fait autorité : son statut (`TRIP_STATUS`, 8 états) est projeté sur la
catégorie de la destination (`TRIP_TO_CATALOG_STATUS`), utilisée uniquement pour
filtrer le catalogue. L'agenda, la valise et les dépenses sont rattachés au
**voyage**, jamais à la destination.

### Road Trip

Un road trip est une entité indépendante composée de trois collections :

| Collection | Rôle |
|---|---|
| `stops[]` | Les étapes : où l'on dort, ce qu'on visite, l'hébergement retenu |
| `segments[]` | Les trajets **entre** les étapes — `n+1` segments : départ → étape 1 … étape N → retour |
| `checklist[]` | La préparation |

**Source de vérité des dates** : `date_debut` + le nombre de nuits de chaque
étape. Arrivées, départs, dates de segment et check-in d'hébergement en sont
tous **dérivés** par `rtSchedule()`. Rien n'est saisi deux fois, et modifier la
date de départ recalcule l'itinéraire entier.

Distance, durée et coût d'un segment sont **estimés automatiquement** à partir
des coordonnées et du mode de transport ; toute valeur saisie à la main prend
le dessus et est signalée comme telle dans l'interface.

**Clés de stockage** (préfixées `u:<profil>:` sauf mention contraire) :

| Clé | Contenu |
|---|---|
| `vm_store_v2` | Voyages, catalogue personnel, épinglés, archives, road trips (schéma v4) |
| `voyagemanager_agenda` | Plannings par voyage |
| `voyagemanager_valises` | Check-lists par voyage |
| `vm_expenses_v1` | Dépenses par voyage |
| `vm_prefs` | Préférences |
| `vm_rt_draft` | Brouillon de road trip en cours d'édition |
| `vm_fx_cache`, `vm_weather_cache` | Caches API (taux de change, météo) |
| `vm_global_dests` | Destinations communes *(global, partagé)* |
| `vm_history` | Journal d'activité *(global, partagé)* |
| `vm_theme`, `vm_active_profile` | *(globaux)* |

---

## 🎨 Personnalisation

- **Destinations** → `data.js` (ou l'onglet *Ajouter* dans l'application).
- **Thème et couleurs** → `styles/tokens.css`.
  Règle : les tokens bruts (`--green`, `--yellow`…) servent aux **surfaces** ;
  dès qu'une couleur porte du **texte**, utiliser la variante `--*-text`,
  calibrée pour un contraste AA dans les deux thèmes.
- **Composants** → `styles/main.css`.
- **Version des ressources** → suffixe `?v=` dans `index.html` et `VERSION` dans
  `sw.js`, à incrémenter à chaque release.

---

## 🛠️ Développement

```bash
npm install
```

```bash
npm run check
```

| Script | Rôle |
|---|---|
| `npm run serve` | Serveur local sur le port 8400 |
| `npm run lint` | ESLint (dont `no-undef` sur l'API globale du projet) |
| `npm run format` | Prettier |
| `npm run check` | Lint + vérification de formatage |

`data.js` est exclu du formatage : c'est un fichier de données aligné à la main.

---

## 🔐 Vie privée & données

- **Tout reste dans le navigateur.** Aucun serveur, aucun compte, aucun suivi.
- Trois API externes sont appelées, sans identifiant et sans donnée personnelle :
  Open-Meteo (météo), Frankfurter (taux BCE), Nominatim (géocodage).
  Chacune dispose d'un repli hors ligne explicite.
- Les **profils cloisonnent** les données par préfixe de clé. Ce n'est **pas** un
  mécanisme d'authentification : le contrôle d'accès doit être assuré en amont
  (proxy, Cloudflare Access…).
- Pensez à exporter régulièrement votre sauvegarde JSON : vider les données du
  site efface tout.

---

## 🛣️ Roadmap

### Livré en v2

- [x] Réglages utilisateur · [x] Météo réelle · [x] Taux de change réels
- [x] PWA & mode hors ligne · [x] Recherche globale · [x] Annulation généralisée
- [x] Accessibilité AA · [x] Modularisation complète

### Livré en v2.1

- [x] Module Road Trip complet · [x] +26 destinations européennes
- [x] Meilleure période visuelle · [x] Convertisseur et retrait de devises
- [x] Liens de réservation paramétrés · [x] Dossier de road trip imprimable

### À venir

- [ ] Pièces jointes (billets, QR codes) en IndexedDB
- [ ] Export PDF natif (sans passer par l'impression)
- [ ] Vue calendrier annuelle
- [ ] Partage d'un voyage entre profils
- [ ] Synchronisation multi-appareils (nécessite un backend)
- [ ] API de prix de vols (l'interface `services/flights.js` est prête)

---

## 🤝 Contribution

1. Fork
2. Nouvelle branche
3. `npm run check` avant de commiter
4. Pull Request

---

## 📄 Licence

Distribué sous licence [MIT](LICENSE).

<div align="center">

Développé avec ❤️ pour simplifier l'organisation des voyages.

</div>
