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
| `HomeScreen.tsx` | Assemble la carte et les surcouches, construit les marqueurs |
| `useUserLocation.ts` | Permission + position, avec repli sur Douala |
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
4. Les véhicules de démo sont positionnés relativement au centre courant, donc
   toujours visibles quelle que soit la ville.
5. Appui sur le champ de recherche ou un raccourci → handlers vides pour
   l'instant (`TODO` dans `HomeScreen.tsx`), en attente de l'écran de recherche.

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

- Brancher le bouton recentrer (nécessite une `ref` sur la `Camera` MapLibre)
- Navigation vers l'écran de recherche de destination
- Skeleton de chargement sur le sheet pendant la résolution de la position
- Bandeau hors-ligne (distinct du bandeau géoloc)
