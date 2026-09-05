# Architecture — Frontend VORA

Application mobile passager (React Native / Expo, TypeScript).

## Stack

| Couche | Choix | Justification (brief §4.2) |
|---|---|---|
| Framework | Expo SDK 54 + React Native | Un seul code Android/iOS, itération rapide — décisif sur 48 h |
| Langage | TypeScript | Contrats explicites entre features, erreurs vues à la compilation |
| Carte | MapLibre GL Native (`@maplibre/maplibre-react-native` v11) | Open source, styles vectoriels personnalisables, aucun coût ni carte bancaire |
| Tuiles | MapTiler | 100 000 chargements/mois gratuits, style clair personnalisable |
| Géolocalisation | `expo-location` | Intégré à Expo, gère les permissions des deux plateformes |
| Icônes | `@expo/vector-icons` (Ionicons) | Déjà présent, cohérent avec R15 (aucun emoji dans l'UI) |

**Routage et géocodage** : pas encore branchés. Prévus — OpenRouteService
(itinéraire) et Photon ou MapTiler Geocoding (recherche d'adresse). Ils
viendront s'ajouter dans `src/services/`.

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
      demoData.ts          données simulées — À REMPLACER par l'API
      components/          HomeHeader, DestinationSheet, VehicleMarker,
                           UserLocationDot, LocationNotice
    booking/               (vide) estimation et confirmation de course
  services/                (vide) appels API, routage, géocodage
  contexts/                (vide) AuthContext, RideContext, LocationContext
  components/              (vide) composants transverses
```

## Docs par feature

| Doc | Feature |
|---|---|
| `home.md` | `src/features/home/` — écran d'accueil |

## Décisions de design notables

**La carte occupe toute la hauteur** et passe sous le header comme sous le
bottom sheet. Aucune bande blanche : c'est ce qui distingue une app de mobilité
crédible d'une maquette.

**Le champ de recherche du sheet n'est pas un `TextInput`.** C'est un
`Pressable` qui poussera vers l'écran de recherche. Ouvrir le clavier ici
ferait remonter le sheet et casserait la transition, sans bénéfice.

**Les marqueurs véhicules sont des pastilles rondes avec icône vue de côté**,
jamais des silhouettes vues de dessus : à 32 px, une silhouette se réduit à une
tache illisible. Ils ne sont pas pivotés — une rotation n'a de sens qu'avec un
vrai cap GPS.

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

1. Écran de recherche de destination (champ réel + suggestions Photon)
2. Service de routage (`src/services/routing.ts`) et tracé de l'itinéraire
3. Écran d'estimation (paliers Moto / Eco / Confort, distance, mode de paiement)
4. Remplacer `demoData.ts` par `GET /drivers/nearby`
