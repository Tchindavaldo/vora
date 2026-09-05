# Feature — Accueil passager (`src/features/home/`)

Premier écran de l'application et de la démo. Il donne l'impression de qualité
du produit : c'est l'écran à soigner en priorité.

## Composition

```text
HomeScreen
├── MapCanvas            carte plein écran (features/map, encapsule MapLibre)
├── HomeHeader           flottant : menu · badge quartier · avatar
└── bottomStack
    ├── LocationNotice   bandeau, seulement si la géoloc a échoué
    ├── bouton recentrer
    └── DestinationSheet titre · faux champ de recherche · 3 raccourcis
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `HomeScreen.tsx` | Assemble la carte, les surcouches et l'enchaînement des panneaux |
| `useRideOrder.ts` | Enchaînement estimation → paiement → commande, sorti de l'écran (R4) |
| `useHomeMarkers.tsx` | Marqueurs de la carte : véhicules, position, destination, chauffeur |
| `useUserLocation.ts` | Permission + position, avec repli sur Douala |
| `useVehicleMotion.ts` | Fait avancer chaque véhicule le long du tracé de sa rue |
| `demoData.ts` | Véhicules simulés, raccourcis, quartier — **temporaire** |
| `components/HomeHeader.tsx` | Barre supérieure flottante |
| `components/DestinationSheet.tsx` | Bottom sheet de saisie de destination |
| `components/VehicleMarker.tsx` | Pastille véhicule (moto / voiture) |
| `components/UserLocationDot.tsx` | Position utilisateur (halo + point) |
| `components/LocationNotice.tsx` | Bandeau d'état dégradé géoloc |

## Flux

1. `useUserLocation` demande la permission au montage.
2. Accordée et position obtenue → carte centrée dessus, point utilisateur affiché.
3. Refusée ou position introuvable → carte centrée sur Douala, `LocationNotice`
   visible, point utilisateur **masqué**.
4. Une fois les tuiles dessinées, la carte se laisse interroger : les routes
   voisines sont lues dans les tuiles (`services/roadsFromMap.ts`) et chaque
   véhicule de démo est posé sur l'une d'elles, orienté dans son axe. Une seule
   fois — refaire le placement à chaque geste ferait sauter les véhicules d'une
   rue à l'autre. Tant que ces positions ne sont pas connues, **aucun véhicule
   n'est affiché** : les montrer ailleurs puis les déplacer produirait un saut
   visible.
5. `useVehicleMotion` les fait ensuite rouler le long de leur tracé.
6. Le bouton recentrer incrémente un `recenterToken` passé à `MapCanvas`, ce
   qui ramène la caméra sur la position courante — pas de `ref` impérative
   exposée à l'écran (R11).
7. Appui sur le champ de recherche ou un raccourci → `HomeScreen` affiche
   `DestinationSearchScreen` à la place de l'accueil (voir `search.md`). Un
   raccourci pré-remplit la saisie avec son libellé. Pas de librairie de
   navigation tant que l'app n'a que deux écrans (R18).

## Ancrage local (brief §11)

Deux choix qui répondent explicitement au contexte camerounais :

- **Le badge affiche un quartier** (« Bonapriso »), pas des coordonnées. À
  Douala, le quartier est le repère utilisé au quotidien.
- **Le placeholder dit « Adresse, quartier, point de repère »**. La couverture
  OSM des rues secondaires étant faible, forcer une adresse exacte bloquerait
  l'utilisateur ; le point de repère est la manière réelle de se situer.

## Données simulées à remplacer

`demoData.ts` contient 5 véhicules fixes et le libellé de quartier. À brancher :

- Véhicules → `GET /drivers/nearby?lng=&lat=`
- Quartier → reverse-geocoding sur la position courante
- Raccourcis → adresses enregistrées du profil utilisateur
- Initiale de l'avatar → `AuthContext`

⚠️ Tant que ces données sont simulées, ne pas les présenter comme réelles au
jury (brief §23).

## Reste à faire

- Skeleton de chargement sur le sheet pendant la résolution de la position
- Bandeau hors-ligne (distinct du bandeau géoloc)
