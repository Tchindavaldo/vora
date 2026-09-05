/**
 * Historique des transactions du passager (brief §8, R13).
 *
 * ⚠️ SIMULE, EN MEMOIRE. Aucun backend n'existe encore : les courses terminees
 * sont conservees dans ce module pour la duree de la session, precedees de
 * quelques courses de demonstration. Quand l'API arrivera, `listTransactions`
 * deviendra `GET /rides?status=completed` et `recordTransaction` disparaitra —
 * c'est le backend qui archive la course a sa fermeture, pas le telephone.
 *
 * Pourquoi pas de stockage local : l'historique et les revenus sont derives du
 * backend, jamais recalcules cote client comme source de verite (R13). Ajouter
 * une dependance de persistance pour un etat qui sera de toute facon distant ne
 * se justifierait pas devant le jury (R18).
 *
 * Service pur, sans rendu : partage entre ecrans (R16).
 */

import type { CashOffer, PaymentMethod, PaymentStatus } from './payment';
import { formatXaf, type VehicleTier } from './pricing';
import type { Ride } from './rides';

/**
 * Une course terminee, telle qu'elle apparait dans l'historique.
 *
 * Le recu est fige a la fin de la course : montant, mode de paiement, monnaie
 * annoncee et chauffeur sont recopies, jamais relus depuis l'etat courant. Une
 * course passee ne doit pas changer parce que le tarif ou le chauffeur a change
 * depuis.
 */
export type Transaction = {
  id: string;
  /** Date de fin de course, en millisecondes depuis epoch. */
  completedAt: number;
  destinationLabel: string;
  tier: VehicleTier;
  amountXaf: number;
  method: PaymentMethod;
  /**
   * Verdict du paiement au moment de la course : `succeeded` (debite) ou `due`
   * (especes reglees au chauffeur a la descente). Les autres etats ne creent
   * pas de transaction — sans paiement regle, la course n'a pas eu lieu.
   */
  status: Extract<PaymentStatus, 'succeeded' | 'due'>;
  /** Billet annonce et monnaie rendue. `null` hors paiement en especes. */
  cash: CashOffer | null;
  driverName: string | null;
  /** Note laissee au chauffeur, `null` si le passager a passe l'evaluation. */
  stars: number | null;
};

export type RecordTransactionInput = {
  ride: Ride;
  method: PaymentMethod;
  status: Transaction['status'];
  cash: CashOffer | null;
  stars: number | null;
};

/**
 * Courses de demonstration, anterieures a la session.
 *
 * Sans elles, l'historique serait vide a l'ouverture et le jury ne verrait rien
 * tant qu'une course n'a pas ete jouee. Les dates sont relatives au lancement
 * de l'app pour qu'elles restent recentes quel que soit le jour de la demo.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function buildDemoTransactions(now: number): Transaction[] {
  return [
    {
      id: 't-demo-1',
      completedAt: now - 2 * DAY_MS,
      destinationLabel: 'Marché Central, Douala',
      tier: 'moto',
      amountXaf: 750,
      method: 'cash',
      status: 'due',
      cash: { billXaf: 1000, changeXaf: 250, isEnough: true },
      driverName: 'Alain Mbarga',
      stars: 5,
    },
    {
      id: 't-demo-2',
      completedAt: now - 4 * DAY_MS,
      destinationLabel: 'Aéroport de Douala',
      tier: 'comfort',
      amountXaf: 4500,
      method: 'mobile_money',
      status: 'succeeded',
      cash: null,
      driverName: 'Serge Etoundi',
      stars: 4,
    },
    {
      id: 't-demo-3',
      completedAt: now - 9 * DAY_MS,
      destinationLabel: 'Université de Douala, Ndogbong',
      tier: 'eco',
      amountXaf: 1800,
      method: 'wallet',
      status: 'succeeded',
      cash: null,
      driverName: 'Rachelle Ndongo',
      stars: null,
    },
  ];
}

/**
 * Transactions de la session, les plus recentes en tete.
 *
 * Module-level et non contexte : c'est un cache de reponse backend, pas de
 * l'etat partage d'application (R6). `useTransactions` en fait un etat React.
 */
let transactions: Transaction[] = buildDemoTransactions(Date.now());

/** Latence simulee de la lecture, pour que l'ecran montre son etat de chargement. */
const LIST_DELAY_MS = 400;

/**
 * Lit l'historique.
 *
 * Rejette en cas d'echec : l'appelant doit afficher un message et proposer de
 * reessayer (R8). La simulation reussit toujours, mais la signature est celle
 * d'un vrai appel reseau pour que le branchement backend ne change rien.
 */
export async function listTransactions(): Promise<Transaction[]> {
  await new Promise((resolve) => setTimeout(resolve, LIST_DELAY_MS));

  return [...transactions];
}

/**
 * Archive une course terminee.
 *
 * Sans paiement regle — `succeeded` ou `due` — il n'y a pas de transaction :
 * une course abandonnee au paiement n'a jamais eu lieu. Renvoie la transaction
 * creee, ou `null` si la course n'etait pas archivable.
 */
export function recordTransaction({
  ride,
  method,
  status,
  cash,
  stars,
}: RecordTransactionInput): Transaction | null {
  if (ride.status !== 'completed') return null;

  // Une meme course ne s'archive qu'une fois : l'ecran peut appeler la fin de
  // parcours deux fois (evaluation envoyee puis passee).
  if (transactions.some((item) => item.id === ride.id)) return null;

  const transaction: Transaction = {
    id: ride.id,
    completedAt: Date.now(),
    destinationLabel: ride.destinationLabel,
    tier: ride.tier,
    amountXaf: ride.amountXaf,
    method,
    status,
    cash,
    driverName: ride.driver?.name ?? null,
    stars,
  };

  transactions = [transaction, ...transactions];

  return transaction;
}

/** Total depense sur les courses archivees, en francs CFA. */
export function totalSpent(items: Transaction[]): number {
  return items.reduce((sum, item) => sum + item.amountXaf, 0);
}

/**
 * Date lisible d'une transaction : "Aujourd'hui · 14:20", "Hier · 09:05", puis
 * "12 août · 18:40".
 *
 * Une date absolue pour une course d'il y a deux heures oblige le passager a
 * calculer ; un "il y a 3 jours" pour une course du mois dernier ne dit rien.
 */
export function formatTransactionDate(completedAt: number): string {
  const date = new Date(completedAt);
  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / DAY_MS,
  );

  if (days === 0) return `Aujourd’hui · ${time}`;
  if (days === 1) return `Hier · ${time}`;

  const day = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `${day} · ${time}`;
}

/**
 * Ligne de recu : ce qui a ete paye et comment.
 *
 * Les especes affichent le billet et la monnaie — c'est la seule trace de
 * l'accord passe avant la course, et ce que le passager relira en cas de doute.
 */
export function receiptLabel(item: Transaction): string {
  const amount = formatXaf(item.amountXaf);

  if (item.status === 'due' && item.cash !== null) {
    return `${amount} en espèces · billet de ${formatXaf(item.cash.billXaf)}, ${
      item.cash.changeXaf === 0
        ? 'appoint exact'
        : `${formatXaf(item.cash.changeXaf)} rendus`
    }`;
  }

  if (item.status === 'due') return `${amount} réglés en espèces`;

  return `${amount} débités`;
}
