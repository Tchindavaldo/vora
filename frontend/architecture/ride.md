# Feature — Commande et recherche de chauffeur (`src/features/ride/`)

Étapes 6 et 7 de l'ordre de construction (R17). Prend le palier retenu par
l'estimation, crée la course, attend qu'un chauffeur accepte et affiche sa
fiche.

## Composition

```text
HomeScreen (course commandée)
├── MapCanvas             itinéraire déjà tracé, inchangé
└── SearchingDriverSheet  « Recherche d'un chauffeur… » · Annuler
    puis DriverFoundSheet photo · note · plaque · modèle · délai d'arrivée
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `useRideRequest.ts` | Création, abonnement au statut, annulation, erreurs (R8) |
| `components/SearchingDriverSheet.tsx` | État d'attente |
| `components/DriverFoundSheet.tsx` | Fiche du chauffeur trouvé |
| `../../services/rides.ts` | Backend **simulé** — seul fichier à remplacer par l'API |

## Flux

1. « Commander » (`FareSheet`) → `ride.request()` avec origine, destination,
   palier et montant du tarif retenu.
2. `createRide` répond après 500 ms avec une course au statut `searching` —
   l'état d'attente s'affiche.
3. `subscribeToRideStatus` notifie l'acceptation après **3,5 s**, avec un
   chauffeur de démonstration correspondant au palier et un délai d'arrivée de
   2 à 6 min.
4. Le panneau bascule sur `DriverFoundSheet`.
5. « Annuler » à n'importe quel moment coupe l'abonnement et revient à
   l'estimation, **itinéraire conservé** : le calcul de route n'est pas refait.

Le suivi de la course (étape 8) n'est pas encore branché.

## Simulation assumée (R13, brief §23)

Aucun backend n'existe : `services/rides.ts` imite `POST /rides` et l'événement
socket d'acceptation. Le délai d'attente (3,5 s) est calé pour que l'état de
recherche soit visible pendant la démo sans laisser le jury devant un loader.

Les deux panneaux le disent explicitement à l'écran — « Recherche simulée » puis
« Chauffeur de démonstration » : jamais de faux présenté comme réel.

Quand l'API arrivera, `createRide` devient un `POST /rides` et
`subscribeToRideStatus` un abonnement `SocketContext` (R6). L'UI ne change pas :
les deux composants ne connaissent que les types `Ride` et `Driver`.

## Séparation avec `booking`

L'état de la course vit dans `useRideRequest`, pas dans `useBookingFlow` : la
réservation s'arrête au choix du tarif, la course commence après. C'est ce qui
permet d'annuler la course sans perdre l'itinéraire déjà calculé (et sans
reconsommer le quota de routage).

## Sécurité (R10)

La fiche chauffeur met en avant **plaque et modèle** plutôt que de les reléguer
en ligne de détail : c'est ce que le passager compare au véhicule qui se
présente devant lui. Note et nombre de courses donnent le second repère de
confiance.

## États dégradés (R8)

| Situation | Comportement |
|---|---|
| Création de la course en échec | Message + bouton « Réessayer » dans le panneau |
| Annulation pendant la création | La course arrivée en retard est ignorée |
| Écran démonté pendant l'attente | Abonnement coupé, aucun `setState` sur un composant démonté |

Les logs ne portent que la cause, jamais l'objet d'erreur (il portera l'en-tête
d'authentification une fois le backend branché — R9).

## Reste à faire

- Suivi du chauffeur sur la carte (étape 8)
- Appel / message au chauffeur depuis la fiche
- Cas « aucun chauffeur disponible » après expiration du délai
