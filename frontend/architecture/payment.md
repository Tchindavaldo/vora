# Feature — Paiement (`src/features/payment/`)

Choix du mode de paiement (brief §8), entre l'estimation du tarif et la
recherche de chauffeur. Entièrement simulé : aucun débit réel, aucun appel à
MTN MoMo ou Orange Money (R13, brief §23).

## Position dans le flux

```text
FareSheet « Commander » → PaymentSheet → « Commander » (après verdict)
→ SearchingDriverSheet
```

La course n'est créée qu'une fois le paiement réglé — payé, ou « dû » en
espèces. Annuler le paiement revient à l'estimation, itinéraire conservé : le
calcul de route n'est pas refait.

## Composition

```text
HomeScreen (tarif retenu)
└── PaymentSheet  sous-titre distance + montant · destination
                 3 modes · montant · état · « Payer » / « Commander »
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `usePayment.ts` | Mode retenu, verdict, annulation des timers (R8) |
| `components/PaymentSheet.tsx` | Panneau : modes, montant, état, confirmation |
| `../../services/payment.ts` | Verdicts **simulés** — seul fichier à remplacer par l'API |

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
| `idle` | aucune ligne d'état, bouton « Payer X F » |
| `pending` | spinner + libellé selon le mode, bouton désactivé, modes gelés |
| `succeeded` | ✓ « Paiement accepté par … », bouton devient « Commander » |
| `due` | ✓ « Espèces — à régler au chauffeur à la descente », bouton « Commander » |
| `failed` | message d'erreur + bouton « Réessayer le paiement » |

## En-tête à deux niveaux

Le sous-titre reprend **la distance et le montant du palier retenu**
(« 3,4 km · Moto 1 250 F »), la destination reste la ligne principale : le
passager voit ce qu'il paie sans remonter à l'écran précédent. Les trois
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
| Solde portefeuille insuffisant | `failed` + « Réessayer le paiement » ou changer de mode |
| Changement de mode pendant `pending` | cartes désactivées : un seul paiement en vol |
| Écran quitté pendant l'attente | timers coupés, aucun `setState` sur composant démonté |
| Annulation du panneau | paiement abandonné, retour à l'estimation, itinéraire conservé |

## Reste à faire

- Recharge du portefeuille (écran dédié, solde venu du backend)
- Intégration MTN MoMo / Orange Money réelle derrière `services/payment.ts`
- La **monnaie** se greffera sur le mode espèces : elle n'a de sens qu'une fois
  l'encaissement à la descente posé
