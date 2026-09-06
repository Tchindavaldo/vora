# Feature `driver` — parcours chauffeur

Interface chauffeur : tableau de bord, demande entrante, course en quatre
etapes jusqu'a l'encaissement, profil. Simulee (aucun backend) — R17 etape 9.

## Flux

```text
DASHBOARD (hors ligne)
  -> passage EN LIGNE
  -> DEMANDE ENTRANTE (overlay, 15 s de compte a rebours)
       refus / expiration -> DASHBOARD
       acceptation        -> COURSE
COURSE : to_pickup -> arrived -> in_progress -> completed -> DASHBOARD
```

Depuis le tableau de bord, la card **Gains** ouvre l'ecran des revenus du jour
(`DriverEarningsScreen`) : total encaisse en tete, puis la liste des courses qui
le composent. Ecran plein comme le profil — une liste se parcourt, elle n'a pas
a partager la hauteur avec la carte. La ligne « Gains » du profil ouvre le meme ecran ; la fermeture revient a
l'ecran d'ou l'ouverture est partie (`openEarnings('dashboard' | 'profile')`).
Le profil porte en plus une fleche de retour au tableau de bord dans son
en-tete, distincte du bouton du bas qui, lui, quitte le mode chauffeur.

Chaque course encaissee est ajoutee par
`finishTrip` via `recordDriverEarning` (`services/driverEarnings.ts`, simule et
en memoire, sur le meme modele que `transactions.ts` cote passager).

## Historique des courses (brief §6, §14)

`DriverRideHistoryScreen` repond a une question que les revenus du jour ne
couvrent pas : « qu'est-ce que j'ai fait cette semaine ». Deux ecrans distincts
et non un onglet de plus dans les revenus — l'un se lit entre deux courses,
l'autre le soir ou en fin de semaine.

- **Periode** selectionnable : 7 ou 30 derniers jours. L'historique complet
  serait illisible sur mobile, et le backend paginera (`GET
  /driver/rides?from=&to=`). Changer de periode relance la lecture dans
  `useDriverRides` — le filtre n'est PAS applique cote client, sinon il
  faudrait avoir deja tout charge.
- **Groupement par jour** (`SectionList`, en-tetes collants) : « Aujourd'hui »,
  « Hier », puis la date. Chaque jour porte son total encaisse — l'unite que le
  chauffeur lit est une journee de travail.
- **Bilan de periode** en tete : total encaisse, nombre de courses, distance et
  note moyenne. Les courses non evaluees sont ECARTEES de la moyenne, jamais
  comptees zero.
- La ligne (`DriverRideRow`, copie de `DriverEarningRow` — R16) porte en plus la
  duree et la note recue : sur un historique on regarde comment on a travaille,
  pas seulement ce qu'on a encaisse.

Entrees : ligne « Historique des courses » du profil chauffeur, et pastille
« Historique » dans l'en-tete des revenus du jour. La fermeture revient a
l'ecran d'ou l'ouverture est partie (`openRideHistory('profile' | 'earnings')`).

`finishTrip` archive la course DEUX fois — `recordDriverEarning` et
`recordDriverRide` — parce que les deux deviendront deux endpoints distincts.

L'etat vit dans `useDriverSession` (pas de librairie de navigation, R18) :
`route`, `isOnline`, `request`, `stage`, gains du jour.

## Ecrans et composants

| Fichier | Role |
|---|---|
| `DriverApp.tsx` | Racine : **monte la carte partagee** et choisit l'ecran pose dessus |
| `DriverDashboardScreen.tsx` | En-tete et panneau bas : statut en ligne, gains, vehicule |
| `IncomingRequestOverlay.tsx` | Demande entrante + compte a rebours + monnaie a prevoir |
| `DriverTripScreen.tsx` | Panneau bas de la course |
| `DriverTripSheet.tsx` | Panneau bas : etape courante, action, detail du paiement |
| `DriverProfileScreen.tsx` | Profil chauffeur, sortie vers le mode passager |
| `DriverEarningsScreen.tsx` | Revenus du jour : total, courses encaissees, etats degrades |
| `useDriverEarnings.ts` | Lecture des revenus — chargement / succes / erreur (R12) |
| `DriverEarningRow.tsx` | Une course encaissee (copie de `TransactionRow`, R16) |
| `../../services/driverEarnings.ts` | Archivage et lecture **simules** — seul fichier a remplacer par l'API |
| `DriverRideHistoryScreen.tsx` | Historique : periode, jours groupes, bilan, etats degrades |
| `useDriverRides.ts` | Lecture de l'historique par periode (R12) |
| `DriverRideRow.tsx` | Une course passee (copie de `DriverEarningRow`, R16) |
| `../../services/driverRides.ts` | Historique **simule** — a remplacer par `GET /driver/rides` |
| `DriverMapCanvas.tsx` | Carte du mode chauffeur (copie de `MapCanvas`, R16) |
| `DriverRouteLine.tsx` | Trace d'itineraire (copie de `RouteLine`, R16) |
| `DriverVehicleMarker.tsx` | Vehicule du chauffeur, halo ROUGE (copie de `VehicleMarker`, R16) |
| `DriverMapControls.tsx` | Boutons « cadrer l'itineraire » et « recentrer » (copie de la `recenterRow` de `HomeScreen`, R16) |

## Carte (partagee dashboard <-> course)

**UNE seule carte**, montee par `DriverApp` et jamais demontee : le tableau de
bord et la course sont des couches posees dessus. Sans cela, l'acceptation
detruisait la carte du dashboard pour en creer une autre — un flash a l'ecran
au lieu du vehicule qui se met en route depuis la position courante.

Le vehicule du chauffeur (voiture vue de dessus, halo rouge) est visible DES le
tableau de bord, a la place d'un point bleu : le chauffeur se repere comme un
vehicule, pas comme un pieton. Le halo BAT en boucle (rayon et opacite en sens
inverse, 1100 ms par demi-periode, `useNativeDriver`) : il signale une position
vive, mise a jour en continu. Meme halo rouge et meme battement cote passager
(`colors.vehicleHalo`) : un vehicule se lit pareil des deux cotes, et seul le
point bleu du passager dit « vous etes ici ».

Inclinaison identique a la carte passager (`DEFAULT_PITCH` = 25) : le chauffeur
doit retrouver la meme carte que son client, pas un plan a plat.

`useDriverTripGeometry` regroupe la geometrie au-dessus des ecrans : position,
points de la course, traces, vehicule anime.

Deux itineraires REELS (OpenRouteService, profil voiture) sont calcules en une
seule fois a l'acceptation par `useDriverTripRoutes`, et tous deux traces
ensemble comme cote passager :

1. **chauffeur -> client** — pointilles sombres (`DriverApproachLine`) ;
2. **client -> destination** — trait plein orange (`DriverRouteLine`).

Hors course, aucune requete ORS n'est emise (R12). Pendant le calcul, le
panneau bas n'affiche QUE le loader centre « Calcul de l'itineraire… », comme
le `FareSheet` cote passager (R16).

`useDriverVehicleMotion` fait avancer le vehicule le long du trace de l'etape
courante (copie dediee de `useDriverApproach` cote passager, R16) : il roule
vers le client des l'acceptation, s'immobilise sur lui a « Je suis arrive »
(deja tourne vers la suite du trajet), puis repart vers la destination a
« Demarrer la course ».

**Camera** : une fois le cadrage effectue, les props `center`/`zoom` de
`<Camera>` sont FIGEES sur leur derniere valeur (elles ne sont pas retirees —
MapLibre lirait l'absence de prop comme une remise a zero et la camera
sauterait). La camera n'est ensuite pilotee que par `flyTo` / `fitBounds`.
Sans ce gel, chaque nouvelle position du vehicule (huit fois par seconde)
reappliquait le zoom par defaut et la carte se dezoomait des que la voiture
demarrait.

Le cadrage est UNIQUE et anime. Un second `fitBounds` enchaine pour « se
rapprocher » ne resserre rien : ajouter de la marge sur les quatre cotes
ELARGIT le cadre, donc dezoome.

Deux boutons flottants au-dessus du panneau (`DriverMapControls`), sur les deux
ecrans : cadrer tout l'itineraire, et recentrer sur son vehicule — les deux
animes, via un jeton incremente et non un appel direct a la camera.

**Enchainement a l'acceptation** (le mouvement doit se lire d'un seul tenant) :
la camera cadre les DEUX traces (~1200 ms), puis le vehicule demarre une fois
ce mouvement pose (`DEPARTURE_DELAY_MS` = 1600 ms) et avance en ease-in-out —
il accelere et freine au lieu de sauter a sa vitesse de croisiere.

En cas d'echec ORS, repli en ligne droite avec un log — jamais de carte sans
trace (R8).

**Couleur de position** : halo ROUGE sous le vehicule du chauffeur
(`colors.driverHalo`), la ou le passager voit un halo BLEU sous son point
(`colors.userHalo`). Les deux ne doivent jamais se confondre.

## Assistance chauffeur (brief §10.3)

Trois actions, dupliquees du cote passager (R16) et jamais partagees avec lui :
`services/driverSafety.ts` (copie de `safety.ts`), `useDriverSafety`
(copie de `useRideSafety`), `DriverEmergencySheet` et `DriverReportSheet`
(copies de `EmergencySheet` et `ReportSheet`).

- **Alerte d'urgence** : previent les contacts d'urgence du chauffeur avec sa
  position et la course en cours. Disponible AUSSI hors course — un chauffeur
  peut etre en danger a l'arret, entre deux courses. Si l'envoi echoue, l'appel
  direct reste affiche sous le message (R8).
- **Contact assistance** : file chauffeur (`DRIVER_SUPPORT_PHONE`), distincte de
  l'assistance passager. Le numero est pre-rempli dans le composeur, jamais
  compose automatiquement.
- **Signalement d'un passager** : liste fermee de motifs propres au chauffeur
  (comportement agressif, refus de paiement, degradation, passager absent,
  autre) + commentaire facultatif. Exiger le commentaire dissuaderait de
  signaler.

**Contacts d'urgence** : registre SEPARE de celui du passager
(`useDriverEmergencyContacts`, copie de `useEmergencyContacts` — R16), edite
depuis la section Securite du profil chauffeur
(`DriverEmergencyContactsScreen`). Le meme telephone peut servir aux deux roles
en demonstration : les deux listes ne doivent pas se melanger. Sans contact
enregistre, le bouton d'alerte est desactive et le panneau le dit (R8).

Le hook est monte dans `DriverApp`, pas dans l'ecran de course : c'est ce qui
permet au SOS de rester joignable sur le tableau de bord. Entrees : pastilles
"Signaler" et "SOS" dans l'en-tete de `DriverTripSheet` pendant la course, et
bouton SOS flottant en haut de la carte hors course.

⚠️ Alerte et signalement SIMULES : les deux panneaux le disent (brief §23).

## Simulations a remplacer

- `driverSafety.ts` : `sendDriverAlert` -> `POST /driver/rides/:id/alert`,
  `submitDriverReport` -> `POST /driver/rides/:id/report`, et les contacts
  d'urgence viendront du compte chauffeur.
- `useDriverEmergencyContacts` : liste en memoire -> `GET/POST
  /driver/me/emergency-contacts` (R12).
- `driverRequests.ts` : demandes de demonstration -> abonnement socket (R6).
- `driverEarnings.ts` : `listDriverEarnings` -> `GET /driver/rides?day=today`,
  et `recordDriverEarning` disparait (c'est le backend qui archive la course).
- `driverRides.ts` : `listDriverRides` -> `GET /driver/rides?from=&to=` (pagine),
  `recordDriverRide` disparait, et `passengerRating` viendra de l'evaluation
  laissee par le passager.
- `useDriverVehicleMotion` : disparait, les positions viendront du GPS reel.
- Points de prise en charge / destination : decales autour de la position du
  chauffeur, faute de geocodage cote chauffeur.
