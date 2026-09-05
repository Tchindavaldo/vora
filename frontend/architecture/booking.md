# Feature — Itinéraire et estimation (`src/features/booking/`)

Étapes 4 et 5 de l'ordre de construction (R17). Prend la destination rendue par
la recherche, trace l'itinéraire sur la carte et propose un prix par catégorie
de véhicule.

## Composition

```text
HomeScreen (course en préparation)
├── MapCanvas          trace l'itinéraire + cadre la vue dessus
│   └── DestinationPin marqueur de la destination
└── FareSheet          destination · distance · Moto / Eco / Confort · Commander
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `useBookingFlow.ts` | État de la course : destination, itinéraire, tarifs, catégorie retenue |
| `useRoute.ts` | Appel du routage, annulation, retry, messages d'erreur (R8) |
| `components/FareSheet.tsx` | Panneau d'estimation posé sur la carte |
| `components/DestinationPin.tsx` | Marqueur de la destination |
| `../../services/routing.ts` | OpenRouteService — seul fichier qui connaît le fournisseur (R11) |
| `../../services/pricing.ts` | Grille tarifaire, service pur partagé (R16) |

## Flux

1. `DestinationSearchScreen` renvoie sa `DestinationChoice` → `booking.start`.
2. `useRoute` appelle OpenRouteService (POST GeoJSON) entre la position
   courante et la destination. Le trajet est **figé au moment du choix** : le
   GPS bouge en permanence, relancer le calcul à chaque rafraîchissement
   viderait le quota et ferait clignoter le tracé.
3. Le tracé revient → `MapCanvas` le dessine (deux couches : liseré sombre sous
   la ligne orange, pour rester lisible sur tous les fonds) et cadre la caméra
   sur ses extrémités, avec une marge basse large pour le panneau.
4. `estimateAllFares` calcule les trois paliers à partir de la distance et de la
   durée renvoyées.
5. « Commander » reste un `TODO` (étapes 6-7 : création de la course, recherche
   d'un chauffeur).

## Bottom sheets : hauteur commune

Tous les sheets partagent `SHEET_HEIGHT` (`src/theme/index.ts`), calée sur le
sheet d'accueil. La marge basse du système **s'ajoute** à cette hauteur au lieu
d'être prise dessus : la barre de navigation du téléphone garde son espace, et
le contenu défile dans la zone restante plutôt que de déborder.

La carte reste plein écran et passe sous le panneau, mais sa caméra reçoit un
`bottomPadding` égal à la hauteur du sheet : le centre optique remonte au milieu
de la zone visible, sinon la position de l'utilisateur apparaît à moitié cachée.

Pendant le calcul, le panneau n'affiche que le loader et son label, centrés :
la destination et la croix n'ont rien à dire tant que le trajet est inconnu.

## Choix du fournisseur (brief §4.2)

**OpenRouteService**, appelé sur `api.heigit.org/openrouteservice/v2/` —
`api.openrouteservice.org` est en cours de retrait. Formule gratuite : 2 000
requêtes/jour, 40/minute, sans carte bancaire.

Retenu pour ses **profils de véhicule distincts** : `driving-car` pour les
voitures, `cycling-regular` pour les motos. Ce dernier emprunte les voies
étroites que le calcul voiture évite — c'est le trajet réel d'un moto-taxi à
Douala. OSRM public, l'alternative sans clé, ne propose pas cette distinction.

## Tarification

⚠️ **Grille calculée dans l'application, à déplacer côté backend.** Un prix
calculé sur le téléphone est modifiable par l'utilisateur et doit être identique
pour les deux parties de la course. Le panneau l'annonce explicitement comme une
estimation (brief §23, R13).

| Catégorie | Prise en charge | Par km | Par minute | Minimum |
|---|---|---|---|---|
| Moto | 200 F | 120 F | 15 F | 300 F |
| Eco | 500 F | 250 F | 30 F | 800 F |
| Confort | 900 F | 400 F | 45 F | 1 500 F |

Le temps est facturé en plus de la distance : à Douala, une course courte prise
dans les embouteillages coûte au chauffeur autant qu'une longue course fluide.
Les montants sont arrondis à 50 F — personne ne rend la monnaie à l'unité.

## États dégradés (R8)

| Situation | Comportement |
|---|---|
| Clé ORS absente | Message explicite dans le panneau, aucune requête émise |
| Pas de connexion | Message + bouton « Réessayer » |
| Calcul trop lent (> 12 s) | Requête abandonnée, même bouton |
| Aucune route entre les points | Invitation à choisir une destination proche d'une voie carrossable |

Les logs ne portent que la cause de l'échec, jamais l'objet d'erreur : celui-ci
contient l'en-tête `Authorization`, donc la clé (R9).

## Reste à faire

- Profil moto réellement utilisé (le calcul actuel est fait en `driving-car`
  pour les trois paliers)
- Choix du mode de paiement dans le panneau
- Création de la course côté backend et recherche d'un chauffeur
