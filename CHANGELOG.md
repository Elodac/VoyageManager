# Changelog

Toutes les évolutions notables de VoyageManager.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

---

## [2.1.0] — 2026-08-10

Refonte du module Road Trip, enrichissement du catalogue et unification
des dates et des liens de réservation.

### 🚗 Road Trip — refonte complète

- **L'éditeur devient une PAGE** et non plus une modale. C'est le correctif
  de fond du bug le plus gênant : consulter une fiche destination depuis
  l'éditeur annulait le road trip en cours. Une fiche est maintenant une
  modale qui se superpose ; la fermer ramène à l'éditeur intact.
- **Brouillon autosauvegardé** (`vm_rt_draft`) : changer de page, fermer
  l'onglet ou recharger ne perd plus rien. Un bandeau propose de reprendre.
- **Nouveau modèle de données** (`model.roadtrip.js`) : `stops[]`,
  `segments[]` et `checklist[]` ont chacun leur identité, avec statut,
  point de départ, point de retour, véhicule, budget et horodatage.
- **Un segment de transport entre chaque étape** (n+1 segments, départ →
  étape 1 … étape N → retour) : moyen de transport parmi 11, distance,
  durée, coût, horaires, référence et statut de réservation, remarques.
  Distance, durée et coût sont **estimés automatiquement** et surchargeables.
- **Un hébergement par étape** : nom, adresse, lien, prix, téléphone, email,
  référence, check-in/check-out, statut, notes. Rien n'est pré-rempli.
- **Activités par étape**, reprises en un clic depuis les lieux de la fiche.
- **Aéroports de départ suggérés** avec leur distance, à partir du point
  de départ géolocalisé (§12 du cahier des charges).
- **Dates dérivées** : `date_debut` + les nuits de chaque étape suffisent.
  Arrivées, départs, dates de segment et check-in d'hébergement en découlent.
  Changer la date de départ recalcule tout l'itinéraire.
- **Panneau « Points à vérifier »** : étapes non géolocalisées, hébergement
  manquant, trajet de plus de 8 h, avion sur moins de 300 km, saison
  déconseillée aux dates choisies.
- **Check-list de préparation** générée selon l'itinéraire (hors UE,
  conduite à gauche, véhicule, vignettes…).
- **Dossier de road trip imprimable** : page de garde, synthèse, carte SVG
  autonome de l'itinéraire, détail par étape, récapitulatifs transports et
  hébergements, budget, check-list, points à finaliser.
- **Duplication** d'un road trip et d'une étape.
- **Archivage réversible** : un road trip archivé sort de la liste principale
  et du tableau de bord, mais reste consultable dans un bloc dédié et se
  réactive en un clic. Annulable.
- Les road trips apparaissent sur le **tableau de bord**, synchronisés avec
  le store (création, modification, suppression, duplication, archivage).

### 🗺️ Carte

- Itinéraire complet : départ, étapes numérotées, retour, tracés **colorés
  par mode de transport**, popups détaillés (dates, distance, durée, coût,
  hébergement), bandeau de contexte avec légende.
- **Correction de la régression d'affichage** : `fitBounds` s'exécutait sur
  un conteneur de taille nulle et le recadrage du filtre de destinations
  écrasait celui de l'itinéraire. Les deux causes sont traitées.
- L'itinéraire survit à la navigation entre pages et se retire d'un clic.

### 🌍 Catalogue

- **+26 destinations européennes** : Budapest, Cracovie, Varsovie, Gdańsk,
  Reykjavík, Tallinn, Riga, Vilnius, Ljubljana & Bled, Bratislava,
  Transylvanie, Bucarest, Sofia, Belgrade, Sarajevo & Mostar, Istanbul,
  Cappadoce, Malte, Chypre, Luxembourg, Ohrid, Zurich, Interlaken,
  Copenhague, Saint-Pétersbourg, Bath & Cotswolds. **157 destinations,
  46 pays.**
- **`region` et `transport_local` rédigés pour les 157 fiches** : comment se
  déplacer sur place, avec le nom du réseau, le prix du ticket et le
  conseil qui change quelque chose (Oyster à plafond journalier à Londres,
  vaporetto à Venise, navette obligatoire au Mont-Saint-Michel, ferry
  Kamenari-Lepetane au Monténégro, sens de parcours du Ring of Kerry…).
- **Durée de séjour conseillée déduite du type de destination** : un
  « 3-4 jours » uniforme n'avait aucun sens pour une île, un parc national
  ou un long courrier.
- **Nouveau référentiel `data/countries.js`** — source unique pour la devise,
  la langue, le fuseau, le sens de conduite, le type de prise,
  l'appartenance UE/Schengen/zone euro, les numéros d'urgence et le
  continent. Les fiches héritent automatiquement de ces informations.
- Le continent était maintenu dans une seconde table où **19 pays
  manquaient** ; il est désormais dérivé du référentiel.
- Nouvel onglet **Pratique** dans la fiche : 14 informations clés.

### 🗓️ Meilleure période

- **`data/seasons.js`** : note mensuelle de 0 à 3 pour chaque destination,
  via 23 profils climatiques régionaux et des surcharges par destination.
- **Bande visuelle de 12 mois** colorée, avec repère du mois courant,
  meilleure période en clair et explication de la contrainte dominante.
- **Verdict sur les dates choisies** : un voyage ou une étape de road trip
  programmé en mauvaise saison est signalé.

### 💱 Argent

- **Convertisseur de devises** : montant, devise de départ et d'arrivée,
  inversion, repères rapides (10/20/50/100/200), taux BCE du jour avec date
  et source, repli hors ligne clairement daté. Accessible depuis la fiche,
  le budget d'un road trip et n'importe où via `data-open-converter`.
- **Section « Retirer et changer de l'argent »** pour les pays hors euro :
  distributeurs, banques et bureaux de change **géolocalisés autour de la
  destination**, localisateurs officiels Visa et Mastercard, cartes
  multidevises, comparateur de taux, et cinq conseils concrets
  (refus de la conversion dynamique, éviter les aéroports…).
- Les pays de la zone euro affichent une simple ligne au lieu d'un module inutile.

### 🔗 Réservations

- **`services/booking.js`, source unique** : cinq endroits fabriquaient
  auparavant leurs propres URL avec des paramètres approximatifs.
- Les liens exploitent réellement **les dates du voyage, le nombre de
  voyageurs et le nombre de chambres**.
- Chaque lien affiche un badge **`dates`** / **`pers.`** indiquant si la
  plateforme accepte vraiment ces paramètres. Quand ce n'est pas le cas,
  la recherche générique est ouverte — **aucun faux paramètre n'est fabriqué**.
- Nouvelle catégorie « Train, bus, voiture » (Trainline, Omio, FlixBus,
  Rome2Rio, location, ferries).

### 🐛 Corrections

- `+null === 0` et `Number.isFinite(0) === true` : un champ vide passait
  pour un « 0 » saisi et écrasait l'estimation automatique (distances,
  durées et coûts de segment affichaient 0 km / 0 h / 0 €).
- `countryInfo()` héritait `euro: 1` du défaut : le Royaume-Uni était
  traité comme zone euro et tout le module de change était masqué.
  `euro` est désormais dérivé de la devise.
- **`debounce` en délégation d'événements** : le handler étant partagé,
  des saisies rapides dans des champs *différents* fusionnaient et seule
  la dernière était conservée (hébergements des étapes 1 et 2 perdus).
  Nouveau `debouncePerTarget()`.
- Le dépliage d'une étape re-rendait toute la section et **détachait les
  cartes voisines** : les clics et saisies suivants étaient perdus. Les
  actions purement visuelles ne re-rendent plus.
- `saveDraft()` modifiait `updatedAt` **après** la prise d'empreinte : le
  brouillon repassait « non enregistré » aussitôt sauvegardé, et le retour
  à la liste déclenchait une confirmation inutile.
- Supprimer un voyage laissait la destination **épinglée et « confirmée »**
  alors qu'aucun voyage n'existait plus. Le nettoyage est fait à la source
  et l'annulation restaure tout.
- La modale de voyage perdait les **dates saisies** si on fermait par la
  croix. Dates, voyageurs et notes sont désormais persistés à la saisie.
- Les liens de réservation d'une modale de voyage se mettent à jour dès
  que les dates changent, sans rouvrir la fiche.
- Le convertisseur s'ouvrant **depuis** la fiche destination passait sous
  elle (z-index inférieur) : on ne le voyait qu'en bas de page.
- Un clic sur une action d'une carte de road trip déclenchait **aussi**
  l'ouverture de l'éditeur : le garde énumérait les boutons un par un et
  chaque nouvelle action oubliée réintroduisait le défaut. Il porte
  désormais sur la barre d'actions entière.

### 🎛️ Interface

- **Les actions globales** (raccourcis, thème, profil) passent du pied de la
  barre latérale à une **barre d'outils en haut à droite**, avec des cibles
  de 46 px. Dans une colonne de 240 px, elles ne laissaient qu'une
  quarantaine de pixels au prénom, qui était tronqué et chevauché.

---

## [2.0.0] — 2026-08-08

Refonte complète issue de l'audit du projet : sécurité, architecture,
accessibilité, performance et fonctionnalités.

### 🔒 Sécurité & confidentialité

- **Injection HTML corrigée.** Toutes les interpolations passent désormais par
  `escHtml()` / `escAttr()`. Un nom de destination contenant du HTML était
  auparavant exécuté (vérifié : `<img onerror>` déclenché).
- **URLs filtrées** par `safeUrl()` : `javascript:` et `data:` sont bloqués dans
  les liens issus des données.
- **Suppression des `onclick` inline** (389 → 0), remplacés par de la délégation
  d'événements et des attributs `data-*`. L'application est prête pour une CSP stricte.
- **Données personnelles retirées** du dépôt : réservation nominative, montants
  payés, itinéraire privé (`AGENDA_PRESETS`), pieds de page nominatifs des
  documents imprimés — remplacés par le nom du profil actif.
- **Import de sauvegarde validé** (forme de chaque bloc) et **copie de sécurité
  téléchargée automatiquement** avant tout écrasement.
- Le sélecteur de profils est renommé sans ambiguïté (`vmSelectProfile`) :
  ce n'est pas de l'authentification, le contrôle d'accès reste en amont.

### 🏗️ Architecture

- **Unification Destination / Voyage.** La destination redevient un pur
  référentiel ; le **voyage** porte tout l'état. Les 8 statuts de `TRIP_STATUS`
  sont enfin éditables (ils étaient masqués derrière un sélecteur de catégorie),
  et la catégorie du catalogue en est désormais dérivée automatiquement.
- **Agenda, valise et dépenses rattachés au voyage** (et non plus à la
  destination) : deux voyages vers la même ville ne partagent plus leurs données.
  Migration automatique `destId → tripId`.
- **`index.html` réduit de 4 073 à ~560 lignes** : les ~3 480 lignes de JavaScript
  inline sont réparties en 30 modules (`js/core/`, `js/services/`, `js/views/`).
- **Store unique** : `vm_pinned`, `vm_archived`, `vm_statut_override`,
  `vm_roadtrips`, `vm_hidden_planif` sont absorbés par `vm_store_v2` (schéma v4,
  avec chaîne de migrations réelle — la version était déclarée mais jamais utilisée).
- **Toutes les écritures** de stockage passent par `lsSet()`, qui gère le
  dépassement de quota (six emplacements ne le faisaient pas, dont le store lui-même).
- **Annulation généralisée** (`core/undo.js`) : suppression de voyage, de
  destination, de road trip, d'activité, de dépense, vidage de planning.

### ♿ Accessibilité

- `<h1>` sur toutes les pages (le tableau de bord démarrait en `<h2>`).
- **25 champs de formulaire** reçoivent une étiquette associée (`label for`).
- Onglets de fiche conformes ARIA (`tablist` / `tab` / `tabpanel`) avec
  navigation aux flèches, `Home` et `End`.
- **Piège de focus, restauration du focus et `inert` sur l'arrière-plan** pour
  toutes les modales (une seule sur cinq en bénéficiait).
- Cartes de destination, de voyage et de road trip atteignables au clavier
  (`role="button"`, `tabindex`, `Enter` / `Espace`).
- Lien d'évitement vers le contenu principal.
- **Contraste AA rétabli** : variantes `--*-text` distinctes des couleurs de
  surface. Vert 2,98 → 6,19 · orange 2,88 → 5,93 · accent en thème sombre 3,45 → 6,25.

### ⚡ Performance

- **Cache réactivé** : `?v=Date.now()` (qui interdisait toute mise en cache)
  remplacé par un versionnement par contenu ; `no-store` remplacé par `no-cache`
  sur le HTML et `immutable` sur les ressources versionnées.
- `document.write()` supprimé au profit de `<script defer>`.
- `MutationObserver` permanent sur tout le `body` supprimé (les liens portent
  directement `rel="noopener noreferrer"`).
- **1 096 → ~140 attributs `style=""`**, remplacés par des classes utilitaires.

### ✨ Nouveautés

- **Page Réglages** : ville et aéroport de départ, nombre de voyageurs,
  consommation et prix du carburant, péage, durée par défaut. Remplace toutes les
  valeurs codées en dur (`Nantes`, `NTE`, `2 personnes`, `2026-07-06`).
- **Météo réelle** (Open-Meteo) : prévisions à 7 jours pour un départ proche,
  normales saisonnières sinon.
- **Taux de change réels** (Frankfurter / BCE), avec repli hors ligne clairement
  daté et étiqueté.
- **Recherche globale** (`Ctrl/⌘ + K` ou `/`) sur les voyages, destinations, lieux,
  road trips, pages et actions.
- **Mode hors ligne (PWA)** : manifeste, icône, service worker (coquille en
  cache-first, tuiles plafonnées, API en réseau-d'abord). Désactivé en local pour
  ne pas servir de code périmé pendant le développement.
- **Onglet Programme fonctionnel** pour les 106 destinations : il s'appuie sur le
  générateur réel au lieu d'un cas particulier codé en dur pour une seule fiche.
- Dépenses **modifiables et datées**.
- Dialogues `confirm()` / `prompt()` natifs remplacés par des modales cohérentes.

### 🐛 Corrections

- Les `<select>` Valises / Recherche / Agenda **ne se dupliquent plus** à chaque
  ajout de destination (107 → 213 options constaté).
- Bordures **noires** du tableau Budget en thème clair (`var(--border2)` n'existait pas).
- Destinations archivées **exclues** du tableau Budget et de la carte.
- Catalogue vide : plus de `NaN` sur les barres de budget.
- Facteur de détour routier **unifié** (1,25 côté Transport / 1,3 côté road trips).
- URL Skyscanner **valide** même sans code IATA connu.
- Déduplication des lieux par nom **et** position (deux homonymes coexistent).
- Géocodage Nominatim **sérialisé** (1 req/s) et mis en cache : plus de 429.
- CSS mort supprimé : `var(--sloth)`, doublons de barre de défilement,
  de `prefers-reduced-motion` et de `.add-item-input`.
- Code mort supprimé : `poiMarkers`, `grp` dans `mapFilter`, `FLIGHTS_PROVIDER`.

### 🧰 Outillage & documentation

- `package.json`, ESLint 9 (config plate documentant l'API globale du projet),
  Prettier, scripts `serve` / `lint` / `format` / `check`.
- `LICENSE` (MIT) — le badge du README pointait vers un fichier inexistant.
- `CHANGELOG.md`, README réécrit.

---

## [1.0.0] — 2026-06-29

Première version publique : tableau de bord, destinations, carte Leaflet, agenda
glisser-déposer, road trips, programmes automatiques, comparateur de transport,
valises, budget, archives, profils multiples.
