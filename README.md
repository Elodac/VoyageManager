# ✈️ VoyageManager

> Une application web moderne permettant de centraliser l'organisation complète de ses voyages : préparation, budget, itinéraire, transport, activités, checklists et suivi.

![Version](https://img.shields.io/badge/version-1.0-blue)
![HTML](https://img.shields.io/badge/HTML-5-orange)
![CSS](https://img.shields.io/badge/CSS-3-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![License](https://img.shields.io/badge/license-MIT-green)

---

# Présentation

VoyageManager est une application web développée en HTML, CSS et JavaScript permettant de préparer un voyage de A à Z.

Contrairement à un simple planificateur, l'application centralise toutes les informations utiles dans une interface unique :

* destinations
* itinéraires
* budgets
* hébergements
* transports
* activités
* restaurants
* checklists
* agenda
* cartes interactives

L'objectif est d'éviter d'avoir des dizaines d'onglets ouverts ou plusieurs applications différentes pour préparer un voyage.

---

# Aperçu des fonctionnalités

## 🏠 Dashboard

* vue d'ensemble des voyages
* compte à rebours avant le départ
* progression des préparatifs
* tâches prioritaires
* statistiques
* planning du voyage confirmé

---

## 🗺️ Gestion des destinations

* catalogue de destinations
* filtres avancés
* recherche instantanée
* budgets
* types de voyage
* statut des projets

Chaque destination possède une fiche complète contenant :

* informations générales
* météo
* budget
* transport
* hébergement
* lieux d'intérêt
* gastronomie
* liens utiles
* programme
* recherches rapides

---

## 📍 Carte interactive

* affichage de toutes les destinations
* regroupement automatique des marqueurs
* points d'intérêt
* filtrage par catégorie
* recentrage automatique

---

## 📆 Agenda

Création d'un planning visuel comprenant :

* journées
* horaires
* activités
* glisser-déposer
* redimensionnement des blocs
* impression

---

## 🚗 Comparateur de transport

Comparaison des différents moyens de transport :

* voiture
* avion

Calculs disponibles :

* distance
* durée
* coût carburant
* péages
* coût total
* temps porte-à-porte

---

## 🔍 Recherche rapide

Accès direct vers :

* Google Flights
* Skyscanner
* Kayak
* Booking
* Tripadvisor
* Google Maps
* agences de voyages
* compagnies aériennes

---

## 🧳 Gestionnaire de valises

Checklist complète :

* vêtements
* accessoires
* documents
* pharmacie
* électronique

Fonctionnalités :

* progression
* impression
* export
* personnalisation

---

## 💶 Gestion des budgets

Comparaison automatique :

* budget minimum
* budget maximum
* prix des vols
* rapport qualité/prix

---

## 📄 Sauvegarde locale

L'application mémorise automatiquement :

* les checklists
* l'avancement
* les tâches
* les préférences utilisateur

Aucune base de données n'est nécessaire.

---

# Technologies utilisées

* HTML5
* CSS3
* JavaScript ES6
* Leaflet
* Leaflet MarkerCluster
* LocalStorage

---

# Structure du projet

```text
VoyageManager/
│
├── index.html
├── data.js
├── transport.js
│
├── styles/
│   ├── main.css
│   └── tokens.css
│
├── assets/
│
└── README.md
```

---

# Installation

Aucune compilation n'est nécessaire.

## 1. Cloner le dépôt

```bash
git clone https://github.com/VOTRE_COMPTE/VoyageManager.git
```

## 2. Entrer dans le projet

```bash
cd VoyageManager
```

## 3. Ouvrir le projet

Deux possibilités :

### Option 1 (recommandée)

Lancer un serveur web local.

Exemple avec VSCode :

```
Live Server
```

ou

```bash
python -m http.server 8000
```

Puis ouvrir :

```
http://localhost:8000
```

---

### Option 2

Ouvrir directement :

```
index.html
```

Certaines fonctionnalités liées aux ressources externes fonctionneront néanmoins mieux via un serveur local.

---

# Personnalisation

Les destinations sont définies dans :

```text
data.js
```

Tu peux facilement modifier :

* les pays
* les budgets
* les programmes
* les lieux
* les hôtels
* les restaurants
* les excursions
* les transports

L'apparence est personnalisable dans :

```
styles/tokens.css
```

Tu peux modifier :

* couleurs
* thème
* rayons
* palette
* identité graphique

---

# Roadmap

Les prochaines évolutions prévues sont notamment :

* authentification utilisateur
* comptes multiples
* base de données
* hébergement en ligne
* création collaborative de destinations
* ajout collaboratif d'activités
* génération PDF complète du voyage
* import/export des voyages
* synchronisation cloud
* API Google Maps
* API OpenStreetMap
* API météo
* API comparateurs de vols
* API hôtels
* suivi des réservations
* suivi des paiements
* tableau de bord d'avancement
* application PWA
* mode hors ligne

---

# Captures d'écran

Ajouter ici des captures de :

* Dashboard
* Carte
* Destinations
* Agenda
* Budget
* Valises
* Recherche

---

# Licence

Projet distribué sous licence MIT.

---

# Auteur

**Clément**

Ingénieur Systèmes & Réseaux

Projet personnel développé afin de disposer d'une plateforme complète de préparation et de suivi des voyages, avec une architecture évolutive permettant, à terme, une ouverture à un usage collaboratif et public.

---

Je te conseillerais également d'ajouter un **README "premium"**, avec une bannière graphique, une table des matières cliquable, des GIF de démonstration et des badges plus complets. Ce type de README donne immédiatement une impression de projet professionnel sur GitHub.
