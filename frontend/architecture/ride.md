# Feature — Course : commande, chauffeur et suivi (`src/features/ride/`)

Étapes 6 à 8 de l'ordre de construction (R17). Prend le palier retenu par
l'estimation, crée la course, attend qu'un chauffeur accepte, le fait approcher
sur la carte et suit les statuts jusqu'à la fin du trajet.

## Composition

```text
HomeScreen (course commandée)
├── MapCanvas             itinéraire déjà tracé + marqueur du chauffeur
└── SearchingDriverSheet  « Recherche d'un chauffeur… » · Annuler
    puis RideTrackingSheet  statut · chauffeur · plaque · SOS · partage
    puis RatingSheet        étoiles · commentaire · envoi
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `useRideRequest.ts` | Création, abonnement au statut, annulation, erreurs (R8) |
| `useRideSafety.ts` | Partage, alerte, assistance, signalement — voir [`safety.md`](safety.md) (R10) |
| `useApproachRoute.ts` | Itinéraire ORS du chauffeur vers le passager |
| `useDriverApproach.ts` | Position animée du chauffeur (approche puis trajet) |
| `useRideCamera.ts` | Cadrages de la carte pendant le suivi |
| `useRideRating.ts` | Note, commentaire et envoi de l'évaluation (R8, R12) |
| `components/SearchingDriverSheet.tsx` | État d'attente |
| `components/RideTrackingSheet.tsx` | Suivi : les quatre statuts, mode de paiement, monnaie en espèces, SOS, partage, signalement |
| `components/EmergencySheet.tsx` | Panneau d'urgence (R10) — voir [`safety.md`](safety.md) |
| `components/ReportSheet.tsx` | Signalement du chauffeur (R10) — voir [`safety.md`](safety.md) |
| `components/RatingSheet.tsx` | Évaluation, temps 1 : étoiles + Suivant (copie dédiée, R16) |
| `components/RatingCommentScreen.tsx` | Évaluation, temps 2 : commentaire **plein écran** |
| `../../services/rides.ts` | Backend **simulé** — seul fichier à remplacer par l'API |
| `../../services/ratings.ts` | Envoi de la note, **simulé** — futur `POST /rides/:id/rating` |

## Machine à états

| Statut | Panneau | Carte |
|---|---|---|
| `searching` | « Recherche d'un chauffeur… » | itinéraire seul |
| `accepted` | « Arrive dans X min » | le chauffeur avance vers le passager |
| `arrived` | « Votre chauffeur est arrivé » | chauffeur immobile au départ |
| `in_progress` | « Course en cours » | le chauffeur suit le tracé |
| `completed` | « Course terminée » + bouton Terminer | chauffeur à destination |

« Terminer » n'efface pas la course : il ouvre le `RatingSheet`, qui a besoin du
chauffeur et du montant. Le nettoyage (`useRideOrder.reset`) n'a lieu qu'une fois
l'évaluation envoyée ou passée.

## Flux

1. « Commander » (`FareSheet`) → panneau de paiement (`features/payment`, voir
   `payment.md`). Le « Commander » du paiement appelle `ride.request()` avec
   origine, destination, palier, montant du tarif retenu et, en espèces, la
   monnaie annoncée (`cash`).
2. `createRide` répond après 500 ms avec une course au statut `searching` —
   l'état d'attente s'affiche.
3. Espèces avec plus de **3 000 F** de monnaie à rendre : le premier chauffeur
   refuse (il n'a pas la monnaie), la recherche repart pour 3,5 s avec le motif
   affiché, un second chauffeur accepte. Simulation — voir `payment.md`.
4. `subscribeToRideStatus` programme toute la suite : acceptation à **3,5 s**,
   arrivée au départ après **20 s** d'approche, démarrage après **2,5 s**
   d'embarquement, fin après **25 s** de trajet.
5. `useApproachRoute` calcule **un vrai itinéraire** (ORS) entre le chauffeur et
   le point de prise en charge, tracé en pointillés sur la carte.
6. `useDriverApproach` anime le marqueur à 120 ms le long de ce tracé, puis le
   long de l'itinéraire de la course. Le cap vient du **segment courant** : le
   véhicule reste parallèle à la chaussée dans chaque virage.
7. Statut `completed` → « Terminer » ouvre l'**évaluation**, en deux temps :
   - `RatingSheet` (bottom sheet) : les étoiles, puis « Suivant ». « Plus tard »
     ferme sans noter — une évaluation forcée ne produit que des 5 étoiles
     donnés pour sortir.
   - `RatingCommentScreen` (**plein écran**) : commentaire facultatif, 280 car.
     max. Plein écran et non un sheet : le sheet a une hauteur fixe et le
     clavier recouvrirait le champ. `KeyboardAvoidingView` remonte le contenu,
     comme dans `DestinationSearchScreen`.
   - Envoi réussi → retour au sheet, qui affiche le remerciement. Envoi échoué →
     on reste sur le texte saisi avec le message d'erreur (R8) : `submit`
     renvoie un booléen pour ça.
8. « Annuler la course », bouton pleine largeur en bas du panneau de suivi
   (possible jusqu'à la montée à bord) coupe tous les timers et
   revient à l'estimation, **itinéraire conservé** : le calcul de route n'est
   pas refait.

Une fois le chauffeur assigné, **les véhicules disponibles alentour
disparaissent** de la carte : ils n'ont plus rien à dire, et les laisser
rendrait impossible de suivre celui qui vient vous chercher.

## Cadrages de la caméra

Trois recadrages, chacun sur un **changement d'état** et jamais en continu :
recadrer à chaque position du véhicule reprendrait la main à l'utilisateur à
chaque image.

| Moment | Ce qui doit tenir dans la vue | Marge |
|---|---|---|
| Itinéraire calculé | départ et destination (`fitRouteToken`) | standard |
| Chauffeur accepté | tout le trajet d'approche — le véhicule et vous | **+90 px** |
| Course démarrée | l'itinéraire complet — le véhicule et la destination | standard |

Les deux derniers passent par `fitPoints` / `fitPointsToken` /
`fitPointsPadding` de `MapCanvas` : une liste de points quelconque et une marge,
pour que l'écran demande un cadrage sans manipuler MapLibre (R11). La marge
supplémentaire fait reculer la caméra — le trajet d'approche fait quelques
centaines de mètres, et un cadrage au plus juste collerait le véhicule et le
passager aux bords de l'écran.

**Bouton « itinéraire »**, à gauche du recentrage : recadre à la demande sur le
trajet en cours — l'approche pendant qu'elle dure, la course ensuite. La caméra
est libre pendant tout le suivi ; l'utilisateur doit pouvoir revenir à la vue
d'ensemble sans attendre le prochain changement de statut. Il n'apparaît que
s'il y a un trajet à cadrer.

Toute cette logique vit dans `useRideCamera` : `HomeScreen` reste un assemblage
de vues (R4).

## Coût du routage (R12)

Une seule requête d'approche par course, déclenchée **dès la création** et non à
l'acceptation : le chauffeur qui sera affecté est déjà connu à ce moment
(`driverOrigin` est posé par `createRide`), donc le tracé se calcule pendant que
l'écran affiche « Recherche d'un chauffeur… ». À l'acceptation il est prêt, et
le véhicule part sans latence. En production le backend réserve de la même façon
le chauffeur le plus proche avant de confirmer.

Le point de prise en charge est **figé** dans `ride.pickup` à la commande.

## Fluidité de l'animation

Un itinéraire de ville compte plusieurs centaines de points. Leurs longueurs de
segment sont mesurées **une fois par phase** (`measurePath`), pas à chaque
image : les remesurer huit fois par seconde saturait le thread JS et faisait
démarrer le véhicule par à-coups. Le GPS bouge de
quelques mètres en permanence — recalculer à chaque rafraîchissement viderait le
quota (2 000 requêtes/jour) et ferait clignoter le tracé.

Si ce calcul échoue, on retombe sur la ligne directe : le suivi reste
compréhensible, seul le réalisme du tracé est perdu (R8).

## Simulation assumée (R13, brief §23)

Aucun backend n'existe : `services/rides.ts` imite `POST /rides` et les
événements socket de progression. Les délais sont calés pour que le jury voie la
course entière pendant la démo sans attendre.

Les panneaux le disent explicitement à l'écran — « Recherche simulée » puis
« Course simulée » — et le SOS annonce lui-même qu'aucune alerte n'est
transmise. Jamais de faux présenté comme réel.

Quand l'API arrivera, `createRide` devient un `POST /rides` et
`subscribeToRideStatus` un abonnement `SocketContext` (R6) ; `useDriverApproach`
disparaît, les positions venant du GPS du chauffeur. L'UI ne change pas : les
composants ne connaissent que les types `Ride` et `Driver`.

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

**SOS et partage de course** apparaissent à partir du statut `arrived` — c'est-
à-dire quand le passager est au contact du véhicule ; avant, ils n'auraient rien
à signaler. Le partage passe par la feuille du système plutôt qu'un service
maison : elle atteint tous les canaux déjà installés sur le téléphone (WhatsApp
en tête, à Douala) et envoie chauffeur, plaque et destination.

Le SOS est **simulé** et le dit : aucune alerte n'est réellement transmise sans
backend.

## États dégradés (R8)

| Situation | Comportement |
|---|---|
| Création de la course en échec | Message + bouton « Réessayer » dans le panneau |
| Annulation pendant la création | La course arrivée en retard est ignorée |
| Écran démonté pendant la course | Timers coupés, aucun `setState` sur un composant démonté |
| Feuille de partage indisponible | Alerte explicite, pas d'échec silencieux |

Les logs ne portent que la cause, jamais l'objet d'erreur (il portera l'en-tête
d'authentification une fois le backend branché — R9).

## Reste à faire

- Envoi réel de l'évaluation (`services/ratings.ts` est simulé)
- Appel / message au chauffeur depuis la fiche
- Cas « aucun chauffeur disponible » après expiration du délai
- Contact d'urgence réel derrière le SOS
