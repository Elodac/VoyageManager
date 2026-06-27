<div align="center">

# ✈️ VoyageManager

### Planifiez, organisez et centralisez tous vos voyages depuis une seule application.

Une application web moderne permettant de gérer ses destinations, son budget, ses transports, ses hébergements, ses activités, ses checklists et son planning de voyage.

---

![Version](https://img.shields.io/badge/Version-1.0-3b82f6?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![License](https://img.shields.io/github/license/TON_PSEUDO/VoyageManager?style=for-the-badge)

</div>

---

# 📖 Sommaire

- Présentation
- Fonctionnalités
- Captures d'écran
- Installation
- Structure du projet
- Technologies
- Personnalisation
- Roadmap
- Contribution
- Licence

---

# 🌍 Présentation

VoyageManager est une application web développée afin de regrouper **l'ensemble de la préparation d'un voyage** dans une seule interface.

L'objectif est de remplacer les dizaines d'onglets ouverts habituellement :

- Booking
- Google Maps
- Google Flights
- Skyscanner
- Tripadvisor
- Guide du Routard
- Checklists
- Tableurs Excel
- Notes

par un seul outil moderne.

Le projet est actuellement développé en **HTML / CSS / JavaScript** et fonctionne entièrement côté client.

---

# ✨ Fonctionnalités

## 🏠 Dashboard

- Vue d'ensemble des voyages
- Statistiques
- Compte à rebours
- Voyage en cours
- Suivi des tâches
- Planning rapide

---

## 🗺️ Destinations

- Recherche
- Filtres
- Budgets
- Programmes
- Informations pratiques
- Météo
- Gastronomie
- Lieux incontournables

---

## 📍 Carte interactive

- Leaflet
- Marqueurs
- Clustering
- Points d'intérêt
- Navigation

---

## 📆 Agenda

- Planning journalier
- Drag & Drop
- Impression
- Export

---

## 🚗 Comparateur transport

Comparaison :

✅ Voiture

✅ Avion

avec :

- coût carburant
- péages
- durée
- distance
- coût total

---

## 🔎 Recherche rapide

Accès direct vers :

- Google Flights
- Booking
- Skyscanner
- Kayak
- Tripadvisor
- Google Maps

---

## 🧳 Gestionnaire de valises

Checklist complète :

- vêtements
- pharmacie
- électronique
- papiers
- accessoires

avec progression automatique.

---

## 💶 Budget

Comparaison des destinations :

- prix moyen
- budget mini
- budget maxi
- coût des vols

---

## 💾 Sauvegarde locale

Toutes les informations sont automatiquement enregistrées dans le navigateur.

Aucune base de données n'est nécessaire.

```

---

# 🚀 Installation

## Cloner le dépôt

```bash
git clone https://github.com/VOTRE_PSEUDO/VoyageManager.git
```

## Aller dans le dossier

```bash
cd VoyageManager
```

## Lancer un serveur

Avec Python

```bash
python -m http.server 8000
```

ou avec VSCode

```
Live Server
```

Puis ouvrir :

```
http://localhost:8000
```

---

# 📂 Structure

```
VoyageManager
│
├── index.html
├── data.js
├── transport.js
│
├── styles
│   ├── main.css
│   └── tokens.css
│
├── screenshots
│
└── README.md
```

---

# ⚙️ Technologies

| Technologie | Utilisation |
|-------------|-------------|
| HTML5 | Structure |
| CSS3 | Interface |
| JavaScript ES6 | Logique |
| Leaflet | Cartographie |
| MarkerCluster | Groupement des marqueurs |
| LocalStorage | Sauvegarde |

---

# 🎨 Personnalisation

Les données des destinations sont stockées dans :

```
data.js
```

Le thème est défini dans :

```
styles/tokens.css
```

Les composants graphiques sont dans :

```
styles/main.css
```

---

# 🛣️ Roadmap

## Version 1

- [x] Dashboard
- [x] Destinations
- [x] Carte
- [x] Agenda
- [x] Budget
- [x] Valises
- [x] Recherche

---

## Version 2

- [ ] Comptes utilisateurs
- [ ] Authentification
- [ ] Base de données
- [ ] Synchronisation Cloud
- [ ] Création collaborative
- [ ] API Google Maps
- [ ] API OpenStreetMap
- [ ] API Météo
- [ ] API Google Flights
- [ ] API Booking
- [ ] Export PDF
- [ ] Impression complète
- [ ] Gestion des réservations
- [ ] Suivi des paiements
- [ ] Génération automatique de programmes
- [ ] PWA
- [ ] Mode hors connexion

---

# 🤝 Contribution

Les contributions sont les bienvenues.

1. Fork
2. Nouvelle branche
3. Commit
4. Pull Request

---

# 📄 Licence

Distribué sous licence MIT.

---

<div align="center">

Développé avec ❤️ pour simplifier l'organisation des voyages.

⭐ Si ce projet vous plaît, pensez à lui attribuer une étoile sur GitHub !

</div>
