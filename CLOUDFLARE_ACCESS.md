# 🔐 Protéger VoyageManager avec Cloudflare Access (gratuit)

Le site est **statique** (aucun backend, aucune base de données). Le mot de passe côté
navigateur qui existait avant ne protégeait **rien** : il était stocké dans le
`localStorage` d'un seul appareil, donc absent partout ailleurs → accès libre.

La bonne solution, **gratuite et sans backend**, est **Cloudflare Access** (inclus dans
Cloudflare Zero Trust, gratuit jusqu'à **50 utilisateurs**). Il place une vraie
authentification **devant** le site : seules les personnes que tu autorises peuvent
même charger la page. Une fois entré, le sélecteur de profil ne sert plus qu'à choisir
*quel espace* on consulte (plus besoin de sécurité à ce niveau, puisque seules des
personnes de confiance ont pu entrer).

---

## Étapes (≈ 10 min, tout dans le dashboard Cloudflare)

### 1. Activer Zero Trust
1. Va sur <https://dash.cloudflare.com> → menu de gauche **Zero Trust**.
2. À la 1re activation, choisis le plan **Free** (0 €, demande une CB mais ne facture pas
   tant que tu restes sous 50 utilisateurs).
3. Choisis un nom d'équipe (ex. `clement`) → ton tableau de bord sera
   `clement.cloudflareaccess.com`.

### 2. Créer l'application protégée
1. **Access → Applications → Add an application → Self-hosted**.
2. **Application name** : `VoyageManager`.
3. **Session duration** : 1 semaine (ou 1 mois, pour ne pas te reconnecter souvent).
4. **Application domain** : mets le domaine de ton site Pages, par ex.
   `voyagemanager.pages.dev` (ou ton domaine perso s'il est branché sur Cloudflare).
   - Laisse le **path** vide pour protéger tout le site.

### 3. Définir qui a le droit d'entrer
1. Dans **Add policy** :
   - **Policy name** : `Cercle voyage`.
   - **Action** : `Allow`.
   - **Configure rules → Include → Emails** : ajoute les e-mails autorisés
     (le tien + Héloïse, Maxence, Lucie, Coraly, Claire…).
     - Variante plus souple : règle **Emails ending in** `@gmail.com`, ou
       **Everyone** pour ouvrir à tous (déconseillé).
2. Enregistre.

### 4. Choisir la méthode de connexion
1. **Settings → Authentication → Login methods**.
2. Le plus simple sans rien configurer : **One-time PIN** (Cloudflare envoie un code à
   6 chiffres par e-mail à chaque connexion). Activé par défaut.
3. (Optionnel) Ajoute **Google** / **GitHub** en un clic pour un login « en 1 tap ».

### 5. Tester
1. Ouvre le site en navigation privée → tu es redirigé vers l'écran Cloudflare Access.
2. Saisis un e-mail **autorisé** → tu reçois le code → tu entres.
3. Un e-mail **non autorisé** est **bloqué** avant même de charger le site. ✅

---

## Après ça
- Le portail « Qui voyage ? » de l'app reste : il choisit l'espace de données
  (Clément / Héloïse / …), plus aucun mot de passe.
- Pour révoquer quelqu'un : retire son e-mail de la policy.
- Déconnexion Cloudflare : `https://<ton-équipe>.cloudflareaccess.com/logout`.

## Plus tard : partage de données entre utilisateurs (toujours gratuit)
Quand tu voudras que les espaces partagent des données en ligne (et pas seulement en
local par appareil) :
- **Cloudflare D1** (base SQLite, offre gratuite : 5 Go, 5 M lectures/jour) +
- un petit **Worker** exposant une API `GET/PUT /data`, appelée par l'app,
- l'identité de l'utilisateur étant déjà fournie par Access via l'en-tête
  `Cf-Access-Authenticated-User-Email` (pas besoin de re-gérer les comptes).

C'est le chemin recommandé : zéro serveur à héberger, zéro coût sous les quotas.
