# Feature — Paiement (`src/features/payment/`)

Choix du mode de paiement (brief §8), entre l'estimation du tarif et la
recherche de chauffeur. Entièrement simulé : aucun débit réel, aucun appel à
MTN MoMo ou Orange Money (R13, brief §23).

## Position dans le flux

```text
COMMANDE — on RETIENT le mode, on ne débite pas
FareSheet « Commander » → PaymentSheet → « Suivant »
  ├─ espèces        → CashChangeSheet (monnaie) → « Commander »
  └─ autres modes   → vérification du solde     → « Commander »
→ SearchingDriverSheet → suivi de course

ARRIVÉE — le mode retenu s'EXÉCUTE (SettlementScreen)
« Terminer » → SettlementScreen
  ├─ espèces       → « Payez 2 500 F au chauffeur » → « J'ai payé »
  ├─ portefeuille  → débit du solde + ligne de mouvement
  └─ Mobile Money  → tunnel USSD (waiting → ussd_sent → success / failed)
→ évaluation du chauffeur → historique
```

**Le paiement a lieu à la fin de la course, jamais au départ** (brief §8, comme
Yango et Uber) : débiter à la commande ferait payer une course annulée. À la
commande on ne fait que retenir le mode et vérifier que le portefeuille couvre
l'estimation. Annuler le paiement revient à l'estimation, itinéraire conservé.

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
| `usePayment.ts` | Mode retenu à la commande, étape (`method` / `cash`), somme saisie |
| `useSettlement.ts` | Règlement **à l'arrivée** : espèces dues, débit portefeuille, tunnel USSD |
| `SettlementScreen.tsx` | Écran plein de fin de course : état du règlement, réessayer, repli espèces |
| `components/PaymentSheet.tsx` | Panneau : modes, montant, état, « Suivant » |
| `components/CashChangeSheet.tsx` | Étape espèces : somme annoncée, monnaie à rendre |
| `../../services/payment.ts` | Modes et verdicts **simulés** + calcul de la monnaie |
| `../../services/momo.ts` | Tunnel Mobile Money **simulé** : `waiting → ussd_sent → success / failed` |
| `../../services/wallet.ts` | Solde du portefeuille, recharges, débits, mouvements (**simulé**, en mémoire) |
| `../wallet/` | Écran portefeuille : solde, recharge Mobile Money, mouvements |

## Les trois modes (brief §8)

| Mode | À la commande | À l'arrivée |
|---|---|---|
| Espèces | monnaie annoncée au chauffeur | « Payez 2 500 F au chauffeur » + confirmation |
| Portefeuille | vérification du solde | débit du solde, ligne dans les mouvements |
| Mobile Money | mode simplement retenu | tunnel USSD (voir ci-dessous) |

Le portefeuille est **simulé et en mémoire** (`services/wallet.ts`) : solde
d'ouverture 7 500 F, rechargeable, refus si le montant dépasse le solde. Le
solde est revérifié **au moment du débit** et pas seulement à la commande — une
autre course a pu passer entre-temps.

## Tunnel USSD Mobile Money (`services/momo.ts`)

Même machine à états pour la recharge du portefeuille et pour le paiement d'une
course — c'est la même demande envoyée à l'opérateur, seul le sens de l'argent
change :

| État | Écran |
|---|---|
| `waiting` | « Envoi de la demande à l'opérateur… » + spinner |
| `ussd_sent` | « Composez *126# et validez le paiement de 2 500 F sur MTN MoMo. » |
| `success` | ✓ « Paiement de 2 500 F confirmé. » |
| `failed` | ❌ « Demande annulée ou expirée. Réessayez ou changez de mode. » |

Codes USSD : MTN MoMo `*126#`, Orange Money `#150#`. **Un paiement sur cinq
échoue volontairement** : un tunnel qui réussit toujours ne prouve rien, et le
brief (§20) pénalise l'application qui ne marche que dans le scénario idéal.
L'échec ouvre « Réessayer » et « Payer en espèces ».

Chaque écran du tunnel porte le badge « Paiement simulé — démonstration. Aucun
débit réel. » (`features/wallet/components/SimulatedPaymentBadge.tsx`, R13).

## Portefeuille et recharge (`src/features/wallet/`)

Ouvert depuis Profil → Portefeuille. Trois blocs : le **solde**, la **recharge**
(opérateur MTN / Orange, raccourcis 1 000 / 2 000 / 5 000 / 10 000, montant
libre à partir de 500 F, numéro Mobile Money) et les **mouvements** (recharges
et courses payées, du plus récent au plus ancien).

Le solde n'est **crédité qu'au verdict positif** du tunnel : l'afficher plus tôt
montrerait de l'argent qui n'est pas arrivé. Il vit dans le service et notifie
ses abonnés (`subscribeWallet`) — plusieurs écrans le lisent, aucun n'en garde
sa propre copie (R6).

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
| Solde portefeuille insuffisant à la commande | `failed` + « Réessayer » ou changer de mode |
| Solde devenu insuffisant à l'arrivée | règlement en échec, repli « Payer en espèces » proposé |
| Tunnel USSD annulé ou expiré | « Réessayer » (même montant) ou « Payer en espèces » |
| Recharge quittée pendant l'attente | timers coupés, solde inchangé — rien n'est crédité |
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
