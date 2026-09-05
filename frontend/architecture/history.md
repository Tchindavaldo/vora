# Feature — Historique des transactions (`src/features/history/`)

Liste des courses passées avec leur reçu (brief §8). Dernier morceau du volet
paiement : il rend visible ce que les écrans précédents ont produit — montant,
mode de paiement, monnaie rendue, note laissée au chauffeur.

## Position dans le flux

```text
HomeHeader (bouton reçu, en haut à gauche) → TransactionHistoryScreen
RatingSheet « Terminer » → useRideOrder.reset(stars) → recordTransaction → accueil
```

L'écran se superpose à l'accueil, comme la recherche de destination : l'app n'a
toujours pas de librairie de navigation (R18).

## Composition

```text
TransactionHistoryScreen   plein écran · en-tête · total dépensé · liste
└── TransactionRow         une course : destination, date, reçu, mode
```

Plein écran et non un bottom sheet : la liste se parcourt et n'a pas à partager
la hauteur avec la carte.

## Fichiers

| Fichier | Rôle |
|---|---|
| `TransactionHistoryScreen.tsx` | Écran : chargement, erreur, vide, liste, total |
| `useTransactions.ts` | Lecture de l'historique — chargement / succès / erreur (R12) |
| `components/TransactionRow.tsx` | Une course passée et son reçu |
| `../../services/transactions.ts` | Archivage et lecture **simulés** — seul fichier à remplacer par l'API |

## Archivage d'une course

`recordTransaction` est appelé depuis `useRideOrder.reset(stars)`, à la
fermeture de l'évaluation : c'est le dernier moment où la course, le paiement et
la note sont connus **ensemble**. Le service refuse silencieusement :

- une course dont le statut n'est pas `completed` (abandon en cours de route) ;
- une course déjà archivée (l'écran peut fermer l'évaluation deux fois).

Le reçu est **figé** à cet instant — montant, mode, monnaie et chauffeur sont
recopiés. Une course passée ne doit pas changer parce que le tarif ou le
chauffeur a changé depuis.

Un paiement non réglé ne crée pas de transaction : sans `succeeded` ni `due`,
la course n'a jamais eu lieu.

## Stockage : en mémoire, assumé

Les transactions vivent dans une variable de module, précédées de trois courses
de démonstration (sans elles, l'écran serait vide devant le jury). Elles
disparaissent au redémarrage de l'app.

Pas d'`AsyncStorage` : l'historique et les revenus sont dérivés du backend,
jamais recalculés côté client comme source de vérité (R13). Ajouter une
dépendance de persistance pour un état qui sera de toute façon distant ne se
justifierait pas devant le jury (R18). Quand l'API arrivera, `listTransactions`
devient `GET /rides?status=completed` et `recordTransaction` disparaît — c'est
le backend qui archive la course à sa fermeture.

## Le reçu

`receiptLabel` (service pur, partagé — R16) produit la ligne affichée :

| Cas | Ligne |
|---|---|
| Espèces avec monnaie | « 750 F en espèces · billet de 1 000 F, 250 F rendus » |
| Espèces appoint exact | « 750 F en espèces · billet de 1 000 F, appoint exact » |
| Portefeuille / Mobile Money | « 1 800 F débités » |

Une course en espèces reste marquée « réglé au chauffeur » : la distinguer d'un
débit évite de croire à un double paiement.

## Dates

`formatTransactionDate` : « Aujourd'hui · 14:20 », « Hier · 09:05 », puis
« 12 août · 18:40 ». Une date absolue pour une course d'il y a deux heures
oblige le passager à calculer ; un « il y a 3 jours » pour une course du mois
dernier ne dit rien.

## États dégradés (R8)

| Situation | Comportement |
|---|---|
| Lecture en cours | Indicateur de chargement centré |
| Lecture en échec | Message + bouton « Réessayer » |
| Aucune course | « Aucune course pour l'instant » et ce qui apparaîtra ici |
| Écran fermé pendant la lecture | Aucun `setState` sur composant démonté |

## Simulation assumée (R13, brief §23)

Le pied de liste affiche « Historique simulé — aucun paiement réel n'a été
effectué. »

## Reste à faire

- Écran de détail d'une course (trajet sur la carte, reçu téléchargeable)
- Filtre par période et export, une fois l'historique venu du backend
- Revenus côté chauffeur, dérivés des mêmes courses
