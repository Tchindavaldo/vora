# VORA — Mobilité intelligente pour le Cameroun

> Hackathon NuxCine 2026 — MVP 48 h. Application mobile de transport urbain
> pensée pour les réalités camerounaises : réseau instable, adresses informelles,
> paiement en espèces et sécurité des usagers.

**Nom de l'équipe :** _À COMPLÉTER_
**Dépôt :** https://github.com/Tchindavaldo/vora

---

## 1. Présentation

VORA met en relation un passager et un chauffeur (moto-taxi, voiture éco ou
confort) en quelques secondes : la carte affiche les véhicules disponibles, le
passager saisit sa destination, voit l'itinéraire et le prix **avant** de
commander, choisit son mode de paiement, puis suit l'approche du chauffeur
jusqu'à la note finale et le reçu.

Le livrable de ce dépôt est **l'application passager**, complète de bout en bout,
et le **mode chauffeur** qui l'accompagne : tableau de bord, réception d'une
demande, course en quatre étapes jusqu'à l'encaissement. Le tableau de bord
d'administration est traité en §17 (Limites).

## 2. Problème

Se déplacer à Douala ou Yaoundé aujourd'hui, c'est :

- **négocier le prix** à chaque course, sans référence commune — le passager ne
  sait pas ce qu'il devrait payer, le chauffeur non plus ;
- **l'absence d'adresses** : « après le carrefour Ndokoti, derrière la
  pharmacie » n'entre dans aucun champ « rue et numéro » ;
- **la monnaie** : le chauffeur n'a pas de quoi rendre sur un billet de 10 000 F,
  et on ne le découvre qu'à la descente ;
- **la sécurité** : aucune trace de la course, aucun moyen de prévenir un proche,
  aucune information vérifiée sur le conducteur ;
- **une connectivité instable** : une app qui suppose un réseau permanent est
  inutilisable la moitié du temps.

## 3. Notre solution

| Problème | Réponse de VORA |
|---|---|
| Prix négocié | Estimation affichée avant la commande, pour 3 catégories, calculée sur distance **et** durée (les embouteillages coûtent au chauffeur) |
| Adresses informelles | Recherche de lieu **plus** un champ libre « point de repère » joint à la course |
| Monnaie | Le passager annonce son billet **avant** de partir ; la monnaie à rendre est affichée aux deux parties |
| Sécurité | Partage de course, SOS vers des contacts d'urgence enregistrés, appel assistance, signalement du chauffeur |
| Réseau instable | Chaque appel réseau a un état de chargement, d'erreur et un repli explicite — jamais d'écran bloqué |

## 4. Fonctionnalités

**Parcours principal**

1. Ouverture : splash, onboarding (vu une seule fois), connexion par numéro
   `+237` et code à 4 chiffres — session persistée, rôle porté par le compte
2. Carte plein écran, véhicules disponibles circulant sur de vraies rues
3. Géolocalisation du passager (avec repli si elle est refusée)
4. Recherche de destination + point de repère libre
5. Calcul d'itinéraire réel et tracé sur la carte
6. Estimation du prix pour Moto / Eco / Confort
7. Choix du mode de paiement : espèces, portefeuille, mobile money
8. Rendu de monnaie annoncé à l'avance sur le mode espèces
9. Création de la course et recherche d'un chauffeur
10. Suivi de l'approche du chauffeur puis de la course
11. Évaluation du chauffeur (note + commentaire)
12. Historique des courses et reçus, total dépensé

**Sécurité** — partage de course, SOS, contacts d'urgence, appel assistance,
signalement du chauffeur (disponible aussi **après** la descente).

**Profil** — informations du compte, paramètres, gestion des contacts d'urgence.

## 5. Innovation

**Le rendu de monnaie négocié avant la course.** C'est notre fonctionnalité
innovante (brief §11), et elle ne vient pas d'une technologie mais d'une
observation du terrain : au Cameroun la majorité des courses se paient en
espèces, et le conflit récurrent n'est pas le prix — c'est la monnaie.

Avant de commander, le passager annonce la somme qu'il a en main (saisie libre
ou raccourcis 1 000 / 2 000 / 5 000 / 10 000 F). L'app calcule la monnaie due et
l'affiche aux deux parties. Un chauffeur qui ne peut pas rendre décline, et la
course repart vers un autre. La discussion à l'arrivée disparaît.

Les applications de mobilité internationales ne traitent pas ce cas : il
n'existe pas sur leurs marchés d'origine.

**Deuxième apport, technique :** les véhicules de la carte roulent sur de vraies
rues sans aucun service tiers. Leur géométrie est lue dans les tuiles
vectorielles que la carte a déjà téléchargées (`services/roadsFromMap.ts`) —
aucune requête supplémentaire, aucune clé de plus, et des positions
rigoureusement alignées sur le tracé visible. Utile dans un contexte où chaque
appel réseau coûte du temps et des données.

## 6. Sécurité

**Passager**
- Partage de la course (position, chauffeur, plaque, destination) via la feuille
  de partage du système
- SOS : alerte envoyée aux contacts d'urgence enregistrés, doublée d'appels
  directs — les deux voies sont volontairement distinctes, l'une passant par le
  réseau et l'autre non
- Contacts d'urgence gérés depuis le profil, avec validation des saisies
- Signalement du chauffeur : motifs fermés + détails facultatifs
- Informations du chauffeur et identification du véhicule affichées pendant le
  suivi

**Configuration et données**
- `.env` gitignoré, `.env.example` fourni avec toutes les clés vides
- Aucune clé en dur : tout passe par `src/config/env.ts`
- Seules des clés publiques à quota sont embarquées côté client (`EXPO_PUBLIC_*`,
  lisibles par quiconque installe l'app). Toute clé sensible — paiement, clé
  serveur — reste côté backend
- Aucune donnée personnelle dans les logs

**Gestion d'erreur** — chaque fonction réseau, géoloc ou paiement prévoit
l'échec et affiche un message clair. Pas de `try/catch` silencieux.

## 7. Architecture

Architecture **par features isolées**. Chaque feature possède ses hooks, ses
composants et ses types ; l'état vit dans des hooks dédiés, jamais dans les
composants d'affichage.

```text
Écran  →  hook de feature  →  service  →  API externe
```

- **Les composants ne connaissent aucun fournisseur.** MapLibre n'est importé
  que par `features/map/`, MapTiler que par `services/geocoding.ts`,
  OpenRouteService que par `services/routing.ts`. Changer de fournisseur touche
  un seul fichier.
- **Les services simulés sont isolés et étiquetés** (`rides`, `payment`,
  `ratings`, `transactions`, `safety`) : brancher le backend revient à remplacer
  leur corps, sans toucher à l'UI.
- **Pas de librairie de navigation** : les écrans pleins se superposent via
  `useHomeNavigation`. Une dépendance de moins à justifier, un flux que toute
  l'équipe peut expliquer.
- **Plafond de 500 lignes par fichier**, une responsabilité par fichier.

Documentation détaillée : [`frontend/architecture/README.md`](frontend/architecture/README.md)
et un `.md` par feature (`home`, `search`, `booking`, `payment`, `ride`,
`history`, `safety`).

## 8. Technologies

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | Expo SDK 57 + React Native 0.86 | Un seul code Android/iOS, itération rapide — décisif sur 48 h |
| Langage | TypeScript | Contrats explicites entre features, erreurs vues à la compilation |
| Carte | MapLibre GL Native v11 | Open source, styles vectoriels, aucun coût ni carte bancaire |
| Tuiles | MapTiler, style `bright-v2` | 100 000 chargements/mois gratuits ; le seul style testé portant assez de points de repère sans saturer de noms de rues |
| Géocodage | MapTiler Geocoding | Déjà couvert par la clé des tuiles — aucun service de plus à configurer |
| Itinéraire | OpenRouteService | Profils `driving-car` et `cycling-regular`, ce dernier approchant le trajet réel d'un moto-taxi. 2 000 requêtes/jour |
| Géolocalisation | `expo-location` | Intégré à Expo, gère les permissions des deux plateformes |
| Icônes | `@expo/vector-icons` (Ionicons) | Vraies icônes vectorielles, aucun emoji dans l'interface |
| Vectoriel | `react-native-svg` | Véhicules vus de dessus, dessinés dans le code |

Aucune autre dépendance : chaque bibliothèque du `package.json` est justifiable
devant le jury (brief §4.2).

## 9. Installation

```bash
git clone https://github.com/Tchindavaldo/vora.git
cd vora/frontend
npm install
```

Prérequis : **Node.js 20+**, **npm**, et le SDK Android (Android Studio) ou
Xcode sur macOS.

L'application utilise des **modules natifs** (MapLibre, géolocalisation,
stockage de session) : elle ne tourne pas dans Expo Go. Il faut construire le
client de développement une fois — voir §13. Un simple `npm start` sur une
installation neuve afficherait une erreur de module natif manquant.

## 10. Configuration

```bash
cp .env.example .env
```

Puis renseigner les deux clés (comptes gratuits, sans carte bancaire) :

1. **MapTiler** — https://cloud.maptiler.com → *API Keys* → copier la clé dans
   `EXPO_PUBLIC_MAPTILER_KEY`. Elle sert **à la fois** aux tuiles et à la
   recherche de destination.
2. **OpenRouteService** — https://openrouteservice.org/dev/#/signup →
   *Dashboard* → *Request a token* (formule Standard) → copier dans
   `EXPO_PUBLIC_ORS_KEY`.

Sans clé, l'app démarre quand même et affiche ses états dégradés : c'est
volontaire, mais la démo perd la carte et l'estimation.

## 11. Variables d'environnement

Fichier `frontend/.env` (gitignoré). Modèle : `frontend/.env.example`.

| Variable | Obligatoire | Rôle |
|---|---|---|
| `EXPO_PUBLIC_MAPTILER_KEY` | Oui | Tuiles de carte **et** géocodage de la destination |
| `EXPO_PUBLIC_ORS_KEY` | Oui | Calcul d'itinéraire (distance, durée, tracé) |
| `EXPO_PUBLIC_MAP_STYLE_URL` | Non | URL de style MapLibre complète ; prime sur la clé MapTiler. Permet de basculer sur Protomaps / OpenFreeMap sans toucher au code |
| `EXPO_PUBLIC_API_URL` | Non | Base URL du backend VORA. Inutilisée tant que l'API n'existe pas |

⚠️ Les variables `EXPO_PUBLIC_*` sont **embarquées dans le bundle** et donc
lisibles par quiconque installe l'app. On n'y met que des clés publiques à quota.

## 12. Base de données

**Aucune base de données dans ce livrable.** Le MVP passager est complet côté
client ; la persistance est simulée en mémoire dans `src/services/` (courses,
paiements, évaluations, transactions, signalements), chaque fichier portant en
en-tête la mention de ce qu'il faudra remplacer.

Ce choix est assumé : sur 48 h, le brief (§27) privilégie un parcours qui marche
parfaitement à une pile complète à moitié terminée. Le schéma visé côté backend
est direct — `users`, `drivers`, `rides`, `payments`, `ratings`,
`emergency_contacts`, `reports` — et les types TypeScript des services en
tiennent déjà lieu de contrat.

## 13. Lancement du projet

⚠️ **MapLibre est un module natif : l'app ne tourne pas dans Expo Go.** Il faut
un *development build*. Premier lancement :

```bash
cd frontend
npx expo prebuild
npx expo run:android        # ou : npx expo run:ios   (macOS uniquement)
```

Lancements suivants :

```bash
npx expo start --dev-client
```

⚠️ Après un `git pull` qui ajoute une **dépendance native** (le stockage de
session, par exemple), refaire `npx expo run:android` : un simple rechargement
ne suffit pas, le module natif n'est pas dans le binaire déjà installé.

## 14. Comptes de démonstration

**Aucune inscription n'est requise.** L'authentification est simulée pour ce
livrable (voir §17) : aucun SMS n'est envoyé et le code est toujours le même.

**Code de vérification : `1234`** — pour tous les comptes.

Un numéro par rôle, pour matérialiser la séparation stricte des rôles (§6).
Seuls les trois derniers chiffres comptent : composez n'importe quel numéro
camerounais à 9 chiffres se terminant par le suffixe voulu.

| Numéro | Rôle | Ce qui s'ouvre |
|---|---|---|
| `+237 6XX XXX 001` | Passager | Accueil, course, paiement, évaluation |
| `+237 6XX XXX 002` | Chauffeur | Tableau de bord, demande, course, revenus |
| `+237 6XX XXX 003` | Administrateur | _Réservé_ — dashboard web non livré, ouvre le compte passager |

Tout autre numéro à 9 chiffres ouvre un compte **passager** : la démonstration
ne doit jamais être bloquée par un numéro mal retenu.

**Raccourci** : le lien **« Continuer comme chauffeur »** sous le bouton de
connexion force le rôle chauffeur quel que soit le numéro saisi — pratique en
démonstration pour ne pas avoir à retenir les suffixes.

La session est **persistée** : après une première connexion, l'application
s'ouvre directement sur le compte concerné. Pour changer de rôle, utilisez
« Changer de compte » depuis le profil — cela déconnecte et renvoie à l'écran
de connexion.

## 15. Structure du projet

```text
vora/
├── README.md                    ce fichier
├── CLAUDE.md                    règles de travail de l'équipe (R1→R18)
├── architecture/                notes d'architecture générales
└── frontend/
    ├── .env.example             modèle de configuration
    ├── App.tsx
    ├── architecture/            documentation détaillée, un .md par feature
    └── src/
        ├── config/env.ts        lecture des variables d'environnement
        ├── theme/               design system : couleurs, espacements, ombres
        ├── contexts/
        │   └── AuthContext.tsx  session, rôle, étape d'ouverture, déconnexion
        ├── features/
        │   ├── auth/            splash et connexion par numéro et code
        │   ├── onboarding/      trois écrans de première ouverture
        │   ├── map/             encapsulation MapLibre — seuls fichiers qui l'importent
        │   ├── home/            écran d'accueil : carte, header, bottom sheets
        │   ├── search/          recherche de destination + point de repère
        │   ├── booking/         itinéraire et estimation de prix
        │   ├── payment/         mode de paiement et rendu de monnaie
        │   ├── ride/            commande, chauffeur, suivi, sécurité, évaluation
        │   ├── driver/          mode chauffeur : tableau de bord, demande, course
        │   ├── profile/         profil et contacts d'urgence
        │   └── history/         historique des courses et reçus
        └── services/
            ├── geocoding.ts     MapTiler Geocoding
            ├── routing.ts       OpenRouteService
            ├── roadsFromMap.ts  rues lues dans les tuiles déjà affichées
            ├── pricing.ts       grille tarifaire (service pur)
            ├── session.ts       session persistée, comptes de démo   [SIMULÉ]
            └── rides · payment · ratings · transactions · safety   [SIMULÉS]
```

## 16. API utilisées

| API | Usage | Quota gratuit |
|---|---|---|
| **MapTiler Maps** | Tuiles vectorielles, style `bright-v2` | 100 000 chargements/mois |
| **MapTiler Geocoding** | Recherche de destination, avec `proximity` (position courante) et `country=cm` pour écarter les homonymes étrangers | inclus dans la même clé |
| **OpenRouteService** | Itinéraire : distance, durée, tracé. Profils `driving-car` et `cycling-regular` | 2 000 requêtes/jour |

OpenRouteService est appelé sur `api.heigit.org/openrouteservice/v2/` — l'ancien
domaine `api.openrouteservice.org` est en cours de retrait.

**Non utilisées :** aucune API de paiement réelle. MTN MoMo et Orange Money sont
**simulés** (le brief §8 l'autorise explicitement) et l'interface de démo
l'indique.

## 17. Limites

Limites connues, énoncées franchement (brief §23) :

- **Authentification simulée.** Les écrans existent (splash, onboarding,
  connexion par numéro et code) et la session est persistée sur l'appareil,
  mais aucun SMS n'est envoyé : le code `1234` est vérifié côté client et le
  rôle est déduit du numéro (§14). La vérification, l'émission du token et
  l'attribution du rôle devront passer côté serveur (§6).
- **Tableau de bord administration non livré.** Le brief décrit trois systèmes ;
  nous avons livré le passager complet et le mode chauffeur plutôt que trois
  partiels (brief §27).
- **Mode chauffeur simulé.** Les demandes de course viennent de
  `driverRequests.ts` et le véhicule avance le long d'un itinéraire calculé, à
  cadence fixe : il n'y a ni file de demandes réelle, ni GPS chauffeur, ni
  navigation tournée par tournée.
- **Backend absent.** Courses, paiements, évaluations, historique et
  signalements sont simulés en mémoire — donc perdus à la fermeture de l'app.
- **Paiement simulé.** Aucun débit réel. Les tarifs sont calculés côté client :
  en production le prix doit venir du serveur, sinon il est modifiable par
  l'utilisateur et peut différer entre les deux parties.
- **Chauffeurs de démonstration.** Les véhicules de la carte viennent de
  `demoData.ts`, à remplacer par `GET /drivers/nearby`.
- **Pas de mode hors-ligne complet.** Les états dégradés sont gérés (message
  clair, repli), mais la course elle-même exige du réseau.
- **Pas encore de tests automatisés** : la validation est manuelle, sur le
  parcours du §20.

## 18. Membres de l'équipe

| Nom | Rôle | GitHub |
|---|---|---|
| Tchinda Valdo Blair | _À COMPLÉTER_ | [@Tchindavaldo](https://github.com/Tchindavaldo) |
| _À COMPLÉTER_ | | |

## 19. Figma

Maquettes et prototype : _LIEN FIGMA À COMPLÉTER_

## 20. Démonstration

**Vidéo de démonstration :** _LIEN À COMPLÉTER_

**Parcours à dérouler devant le jury (≈ 3 min)**

1. Ouverture : carte de Douala, véhicules circulant sur les rues, position réelle
2. Appui sur le champ de recherche → saisie d'une destination → ajout d'un point
   de repère (« derrière la pharmacie »)
3. Confirmation : itinéraire tracé, distance et durée réelles
4. Estimation : trois catégories avec leur prix — choisir **Moto**
5. Paiement : sélectionner **Espèces** → annoncer un billet de 2 000 F → la
   monnaie à rendre s'affiche → **Commander**  *(moment fort, voir §5)*
6. Recherche de chauffeur → chauffeur trouvé → suivi de son approche sur la carte
7. Pendant la course : **Partager la course**, puis ouvrir le panneau **SOS**
8. Fin de course → note et commentaire
9. Historique : la course apparaît avec son reçu, son mode de paiement et sa
   monnaie

**À montrer aussi si le temps le permet** — les états dégradés : couper la
géolocalisation avant de lancer l'app (bandeau « Activer » et repli sur Douala),
couper le réseau sur l'écran d'estimation (message clair et possibilité de
réessayer). Une app qui ne marche que dans le scénario idéal est pénalisée
(brief §20).
