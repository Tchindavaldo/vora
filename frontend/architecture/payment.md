# Feature — Paiement (`src/features/payment/`)

Choix du mode de paiement (brief §8), entre l'estimation du tarif et la
recherche de chauffeur. Entièrement simulé : aucun débit réel, aucun appel à
MTN MoMo ou Orange Money (R13, brief §23).

## Position dans le flux

```text
FareSheet « Commander » → PaymentSheet → « Suivant »
  ├─ espèces        → CashChangeSheet (monnaie) → « Commander »
  └─ autres modes   → débit simulé              → « Commander »
→ SearchingDriverSheet
```

La course n'est créée qu'une fois le paiement réglé — payé, ou « dû » en
espèces. Annuler le paiement revient à l'estimation, itinéraire conservé : le
calcul de route n'est pas refait.

## Composition

```text
HomeScreen (tarif retenu)
├── PaymentSheet     en-tête 1 ligne (destination + distance/montant)
│                    3 modes · montant · état · [Retour] [Suivant]
└── CashChangeSheet  saisie de la somme · billets 1000/2000/5000/10000
                     « Le chauffeur devra vous rendre X F » · [Retour] [Commander]
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `usePayment.ts` | Mode retenu, étape (`method` / `cash`), somme saisie, verdict, timers (R8) |
| `components/PaymentSheet.tsx` | Panneau : modes, montant, état, « Suivant » |
| `components/CashChangeSheet.tsx` | Étape espèces : somme annoncée, monnaie à rendre |
| `../../services/payment.ts` | Verdicts **simulés** + calcul de la monnaie — seul fichier à remplacer par l'API |

## Les trois modes (brief §8)

| Mode | Parcours affiché | État final |
|---|---|---|
| Espèces | rien n'est débité, le chauffeur encaisse à la descente | `due` immédiat |
| Portefeuille | solde VORA débité immédiatement | `pending` 0,9 s puis `succeeded` |
| Mobile Money | « Validez la demande sur votre téléphone… » | `pending` 3,5 s puis `succeeded` |

Le portefeuille est **simulé** : solde de démonstration (7 500 F), refus si le
montant dépasse le solde. Le Mobile Money imite la demande opérateur : l'app
attend, le passager valide sur son téléphone, le verdict revient. La vraie
différence entre les modes est le **parcours affiché** ; la logique commune
tient dans `startPayment`.

## Machine à états

| Statut | Affichage |
|---|---|
| `idle` | aucune ligne d'état, bouton « Suivant » |
| `pending` | spinner + libellé selon le mode, bouton désactivé, modes gelés |
| `succeeded` | ✓ « Paiement accepté par … », bouton devient « Commander » |
| `due` | ✓ « Espèces — à régler au chauffeur à la descente », bouton « Commander » |
| `failed` | message d'erreur + bouton « Réessayer le paiement » |

## Monnaie en espèces (innovation locale)

Le problème est concret à Douala : le chauffeur n'a pas toujours de quoi rendre
sur un gros billet, et la discussion a lieu à la descente. La monnaie est donc
annoncée **avant** la course.

1. Le passager choisit « Espèces », saisit la somme qu'il a en main (raccourcis
   1 000 / 2 000 / 5 000 / 10 000). L'app affiche « Le chauffeur devra vous
   rendre 700 F ». Une somme inférieure au prix bloque la commande. Pas d'étape
   « Payer » : rien n'est débité dans l'app, le bouton commande directement.
2. Le chauffeur voit le montant, la somme annoncée et la monnaie à prévoir sur
   la demande de course. S'il ne peut pas rendre, il refuse : la course repart
   vers un autre chauffeur, et le passager lit pourquoi l'attente se prolonge.
3. À l'arrivée, `RideTrackingSheet` affiche montant, billet et monnaie. Personne
   ne discute.

Le refus est **simulé** dans `services/rides.ts` : au-delà de 3 000 F de monnaie,
le premier chauffeur contacté refuse et un second accepte. En production, c'est
l'application chauffeur qui décide — l'écran chauffeur n'existe pas encore, seule
sa décision est jouée.

`computeCashOffer` et `changeLabel` (service pur, partagé — R16) produisent la
phrase affichée : un seul libellé, donc aucun écart possible entre les deux
côtés.

## En-tête sur une ligne

La destination et le sous-titre — **distance et montant du palier retenu**
(« 3,4 km · Moto 1 250 F ») — tiennent sur la **même ligne**, le sous-titre à
droite : le passager voit ce qu'il paie sans remonter à l'écran précédent, et le
panneau garde une ligne de haut pour le contenu. Les trois
cartes de modes reprennent la forme des paliers de véhicules — comparaison d'un
coup d'œil — mais vivent dans une copie dédiée (R16) : leur contenu, leur état
et leur suite divergent déjà de ceux du `FareSheet`.

## Simulation assumée (R13, brief §23)

Le panneau affiche « Paiement simulé — aucun débit réel n'est effectué » en
permanence. Quand l'API arrivera, `startPayment` devient un appel backend (MTN
MoMo / Orange Money côté serveur, verdict par notification) ; l'UI ne connaît
que les types `Payment` et `PaymentMethod`.

## États dégradés (R8)

| Situation | Comportement |
|---|---|
| Solde portefeuille insuffisant | `failed` + « Réessayer » ou changer de mode |
| Somme en espèces inférieure au prix | « Cette somme ne couvre pas la course. », bouton bloqué |
| Chauffeur sans monnaie | retour en recherche, motif affiché, un autre chauffeur prend la course |
| Changement de mode pendant `pending` | cartes désactivées : un seul paiement en vol |
| Écran quitté pendant l'attente | timers coupés, aucun `setState` sur composant démonté |
| Annulation du panneau | paiement abandonné, retour à l'estimation, itinéraire conservé |

## Reste à faire

- Recharge du portefeuille (écran dédié, solde venu du backend)
- Intégration MTN MoMo / Orange Money réelle derrière `services/payment.ts`
- Écran chauffeur : la demande de course avec montant, billet annoncé et monnaie
  à prévoir, accepter / refuser (l'application chauffeur n'existe pas encore)
