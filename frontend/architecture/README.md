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

**Routage** : pas encore branché. Prévu — OpenRouteService, dans
`src/services/routing.ts`.

⚠️ MapLibre est un module natif : **l'app ne tourne pas dans Expo Go**. Il faut
un development build (voir « Lancer le projet » plus bas).

## Structure

```text
src/
  config/env.ts            lecture des variables d'environnement (R9)
  theme/index.ts           design system : couleurs, espacements, ombres
  features/
    map/MapCanvas.tsx      encapsulation MapLibre (R11) — seul fichier qui l'importe
    home/                  écran d'accueil passager
      HomeScreen.tsx       assemblage carte + header + sheet
      useUserLocation.ts   position utilisateur avec repli (R8)
      useVehicleMotion.ts  déplacement des véhicules le long de leur rue
      demoData.ts          données simulées — À REMPLACER par l'API
      components/          HomeHeader, DestinationSheet, VehicleMarker,
                           UserLocationDot, LocationNotice
    search/                recherche de destination (R17 étape 3)
      DestinationSearchScreen.tsx  écran plein : liste puis confirmation
      usePlaceSearch.ts    debounce, annulation, messages d'erreur (R8)
      components/          SearchField, PlaceRow, LandmarkField
    booking/               (vide) estimation et confirmation de course
  services/
    geocoding.ts           MapTiler Geocoding — seul fichier qui le connaît
    roadsFromMap.ts        routes lues dans les tuiles déjà affichées — utilisé
    roads.ts               mêmes types + variante Overpass — non utilisée
  contexts/                (vide) AuthContext, RideContext, LocationContext
  components/              (vide) composants transverses
```

## Docs par feature

| Doc | Feature |
|---|---|
| `home.md` | `src/features/home/` — écran d'accueil |
| `search.md` | `src/features/search/` — recherche de destination |

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

1. Service de routage (`src/services/routing.ts`) et tracé de l'itinéraire
2. Écran d'estimation (paliers Moto / Eco / Confort, distance, mode de paiement)
3. Remplacer `demoData.ts` par `GET /drivers/nearby`
