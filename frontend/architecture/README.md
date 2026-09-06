# Architecture — Frontend VORA

Application mobile passager (React Native / Expo, TypeScript).

## Stack

| Couche | Choix | Justification (brief §4.2) |
|---|---|---|
| Framework | Expo SDK 54 + React Native | Un seul code Android/iOS, itération rapide — décisif sur 48 h |
| Langage | TypeScript | Contrats explicites entre features, erreurs vues à la compilation |
| Carte | MapLibre GL Native (`@maplibre/maplibre-react-native` v11) | Open source, styles vectoriels personnalisables, aucun coût ni carte bancaire |
| Tuiles |  MapTiler, style `bright-v2` | 100 000 chargements/mois gratuits ; ce style équilibre POI et lisibilité (voir plus bas) |
| Géolocalisation | `expo-location` | Intégré à Expo, gère les permissions des deux plateformes |
| Icônes | `@expo/vector-icons` (Ionicons) | Déjà présent, cohérent avec R15 (aucun emoji dans l'UI) |
| Dessin vectoriel | `react-native-svg` | Véhicules vus de dessus, dessinés dans le code plutôt qu'importés |

### Choix du style de carte

Comparaison mesurée sur les styles MapTiler disponibles :

| Style | POI | Noms de rues | Fond |
|---|---|---|---|
| **`bright-v2`** | **12** | **4** | **clair** |
| `streets-v2` | 11 | 8 | beige |
| `basic-v2` | 1 | 1 | beige |
| `dataviz-light` | 0 | 1 | gris 97 % |
| `backdrop` | 0 | 1 | blanc pur |

`bright-v2` retenu : une app de mobilité a besoin des points de repère
(hôpitaux, stations-service, commerces, transports) pour que l'utilisateur
situe sa destination — c'est le cœur du métier, pas de la décoration. Il en
porte 12 catégories tout en n'ayant que 4 couches de noms de rues, là où
`streets-v2` en empile 8 et sature la carte.

Écartés : `dataviz-light` et `backdrop` n'ont **aucun POI** (conçus pour de la
data-visualisation, la carte paraît vide) ; `basic-v2` n'en a qu'un et pose un
fond beige avec trois couches de végétation qui donnent à la ville un aspect de
forêt.

Le style se change par `EXPO_PUBLIC_MAP_STYLE_URL` sans toucher au code.

**Géocodage** : MapTiler Geocoding, encapsulé dans `src/services/geocoding.ts`
(R11). Retenu parce que la clé des tuiles couvre déjà cet usage — aucun service
supplémentaire à configurer avant la démo. Les requêtes portent `proximity`
(position courante) et `country=cm` pour écarter les homonymes étrangers.

**Routage** : OpenRouteService, encapsulé dans `src/services/routing.ts` (R11),
appelé sur `api.heigit.org/openrouteservice/v2/` (l'ancien domaine
`api.openrouteservice.org` est en cours de retrait). Retenu pour ses profils de
véhicule distincts — `driving-car` et `cycling-regular`, ce dernier approchant
le trajet réel d'un moto-taxi. 2 000 requêtes/jour gratuites. Détail dans
`booking.md`.

⚠️ MapLibre est un module natif : **l'app ne tourne pas dans Expo Go**. Il faut
un development build (voir « Lancer le projet » plus bas).

## Structure

```text
src/
  config/env.ts            lecture des variables d'environnement (R9)
  theme/index.ts           design system : couleurs, espacements, ombres,
                           SHEET_HEIGHT (hauteur commune des bottom sheets)
  features/
    auth/                  ouverture de l'application (R17 étape 1)
      SplashScreen.tsx     logo 1,5 s, couvre la vérification de session
      LoginScreen.tsx      conteneur : mise en page, clavier, retour arrière
      useAuthFlow.ts       étape, numéro, code, rôle, chargement, erreur, rebours
      components/          PhoneStep (numéro +237), CodeStep (4 cases, renvoi 30 s)
    onboarding/            3 écrans de première ouverture
      OnboardingScreen.tsx pager balayable, « Passer », vu une seule fois
      slides.tsx           textes et illustrations SVG maison
    map/                   encapsulation MapLibre (R11) — seuls fichiers qui l'importent
      MapCanvas.tsx        carte, caméra, marqueurs, cadrages
      RouteLayers.tsx      tracés : course (plein) et approche (pointillés)
    home/                  écran d'accueil passager
      HomeScreen.tsx       assemblage carte + header + sheet
      useRideOrder.ts      estimation → paiement → commande, sorti de l'écran (R4)
      useHomeNavigation.ts écrans pleins superposés : recherche, historique,
                           profil, contacts (pas de librairie de nav — R18)
      useHomeMarkers.tsx   marqueurs : véhicules, position, destination, chauffeur
      useUserLocation.ts   position utilisateur avec repli (R8)
      useVehicleMotion.ts  déplacement des véhicules le long de leur rue
      demoData.ts          données simulées — À REMPLACER par l'API
      components/          HomeHeader, HomeSheets (cascade des panneaux),
                           DestinationSheet, VehicleMarker,
                           UserLocationDot, LocationNotice
    search/                recherche de destination (R17 étape 3)
      DestinationSearchScreen.tsx  écran plein : liste puis confirmation
      usePlaceSearch.ts    debounce, annulation, messages d'erreur (R8)
      components/          SearchField, PlaceRow, LandmarkField
    booking/               itinéraire et estimation (R17 étapes 4-5)
      useBookingFlow.ts    destination, itinéraire, tarifs, palier retenu
      useRoute.ts          appel du routage, annulation, retry (R8)
      components/          FareSheet, DestinationPin
    payment/               mode de paiement + monnaie en espèces (brief §8, simulé)
      usePayment.ts        mode retenu, verdict, annulation des timers (R8)
      components/          PaymentSheet, CashChangeSheet
    ride/                  course : commande, chauffeur, suivi (R17 étapes 6-8)
      useRideRequest.ts    création, statuts, annulation (R8)
      useApproachRoute.ts  itinéraire du chauffeur vers le passager
      useDriverApproach.ts position animée du chauffeur sur la carte
      useRideCamera.ts     cadrages de la carte pendant le suivi
      useRideSafety.ts     partage, alerte, assistance, signalement (R10)
      useRideRating.ts     note, commentaire, envoi de l'évaluation (R8)
      components/          SearchingDriverSheet, RideTrackingSheet,
                           RatingSheet, RatingCommentScreen,
                           EmergencySheet, ReportSheet
    driver/                mode chauffeur (R17 étape 9, simulé)
      useDriverSession.ts  statut en ligne, écran affiché, étape de la course
      driverRequests.ts    demandes de démonstration + monnaie à rendre
      useDriverTripGeometry.ts  position, points, tracés et véhicule animé
      useDriverTripRoutes.ts    les deux itinéraires ORS de la course
      useDriverVehicleMotion.ts position animée du véhicule du chauffeur
      DriverMapCanvas.tsx  carte partagée dashboard/course (copie, R16)
      DriverVehicleMarker.tsx, DriverRouteLine.tsx, DriverMapControls.tsx
      DriverDashboardScreen, DriverTripScreen/Sheet, DriverStatusSheet,
      IncomingRequestOverlay, DriverProfileScreen
    profile/               profil, paramètres et contacts d'urgence (R10)
      ProfileScreen.tsx    sections sécurité / courses / compte
      EmergencyContactsScreen.tsx  ajout et suppression des contacts
      useEmergencyContacts.ts      liste partagée + validation des saisies
    history/               historique des courses et de leurs reçus (brief §8)
      TransactionHistoryScreen.tsx  écran plein : total, liste, états dégradés
      useTransactions.ts   lecture : chargement, succès, erreur (R8, R12)
      components/          TransactionRow
  services/
    geocoding.ts           MapTiler Geocoding — seul fichier qui le connaît
    routing.ts             OpenRouteService — idem pour l'itinéraire
    rides.ts               courses — backend SIMULÉ, à remplacer par l'API
    pricing.ts             grille tarifaire, service pur (R16)
    payment.ts             verdicts de paiement SIMULÉS, à remplacer par l'API
    ratings.ts             envoi de l'évaluation SIMULÉ, à remplacer par l'API
    transactions.ts        historique SIMULÉ en mémoire, à remplacer par l'API
    safety.ts              alerte et signalement SIMULÉS, à remplacer par l'API
    roadsFromMap.ts        routes lues dans les tuiles déjà affichées — utilisé
    roads.ts               mêmes types + variante Overpass — non utilisée
  contexts/
    AuthContext.tsx        session, rôle, étape d'ouverture, déconnexion (R6)
                           RideContext et LocationContext restent à faire
  components/              (vide) composants transverses
```

## Docs par feature

| Doc | Feature |
|---|---|
| `auth.md` | `src/features/auth/` + `src/features/onboarding/` — splash, onboarding, connexion |
| `home.md` | `src/features/home/` — écran d'accueil |
| `search.md` | `src/features/search/` — recherche de destination |
| `booking.md` | `src/features/booking/` — itinéraire et estimation |
| `ride.md` | `src/features/ride/` — course : commande, chauffeur, suivi |
| `payment.md` | `src/features/payment/` — mode de paiement et monnaie en espèces |
| `history.md` | `src/features/history/` — historique des courses et de leurs reçus |
| `safety.md` | `src/features/ride/` + `src/features/profile/` — SOS, partage, signalement, contacts d'urgence |
| `driver.md` | `src/features/driver/` — mode chauffeur : demande, course, encaissement |

## Décisions de design notables

**La carte occupe toute la hauteur** et passe sous le header comme sous le
bottom sheet. Aucune bande blanche : c'est ce qui distingue une app de mobilité
crédible d'une maquette.

**Le champ de recherche du sheet n'est pas un `TextInput`.** C'est un
`Pressable` qui poussera vers l'écran de recherche. Ouvrir le clavier ici
ferait remonter le sheet et casserait la transition, sans bénéfice.

**Les marqueurs véhicules sont dessinés en SVG, vus de dessus.** C'est la seule
projection cohérente avec une carte, et la seule qui rende l'orientation
lisible : une icône vue de côté ne peut pas suivre l'axe d'une rue. Le volume
vient de trois couches empilées (ombre, carrosserie, vitrage) ; les feux
arrière rouges donnent le sens de marche d'un coup d'œil.

**Chaque véhicule porte un cap et pivote.** En production il viendra du GPS du
chauffeur.

**Les véhicules roulent sur de vraies rues.** Leur géométrie n'est pas demandée
à un service tiers (Overpass, injoignable depuis certains réseaux) mais lue
dans les tuiles que la carte a déjà téléchargées pour les dessiner
(`services/roadsFromMap.ts`) : aucune requête ni clé supplémentaire, et les
positions viennent de la même source que le tracé visible — donc exactement
dessus. `useVehicleMotion` les fait ensuite avancer le long de ce tracé, ce
qu'une simple translation ne permettrait pas (le véhicule quitterait la
chaussée au premier virage). `services/roads.ts` garde les types partagés et
la variante Overpass, conservée comme repli documenté mais non branchée.

**Trois catégories de véhicules** : `moto`, `eco`, `comfort` — les mêmes
paliers que l'estimation de prix à venir, pour que la carte annonce dès
l'accueil ce que l'app propose.

**Le point utilisateur n'est affiché que si la position est réelle.** Un point
« vous êtes ici » sur une ville par défaut serait un mensonge.

## États dégradés implémentés (R8)

| Situation | Comportement |
|---|---|
| Permission géoloc refusée | Carte centrée sur Douala + bandeau « Activer » vers les réglages |
| Position introuvable (GPS coupé) | Même repli, message adapté |
| Clé MapTiler absente | Fond neutre + message indiquant la variable à renseigner |

## Lancer le projet

```bash
cd frontend
npm install
cp .env.example .env      # puis renseigner EXPO_PUBLIC_MAPTILER_KEY
```

MapLibre étant natif, il faut un development build :

```bash
npx expo prebuild
npx expo run:android      # ou run:ios sur macOS
```

Ensuite, les lancements suivants se font avec `npx expo start --dev-client`.

## À faire ensuite

1. Remplacer `demoData.ts` par `GET /drivers/nearby`
2. Recharge du portefeuille et intégration MTN MoMo / Orange Money réelle
   derrière `services/payment.ts`
3. Rendu de monnaie sur le mode espèces
