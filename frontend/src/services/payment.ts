/**
 * Paiement d'une course (R13, brief §8).
 *
 * ⚠️ ENTIEREMENT SIMULE. Aucun debit reel, aucun appel a MTN MoMo ou Orange
 * Money. Ce fichier imite ce que fera le backend : creer une intention de
 * paiement, puis emettre un verdict. Quand l'API existera, seule
 * `startPayment` change — l'UI ne connait que les types ci-dessous.
 *
 * Service pur, sans rendu : partage entre ecrans (R16).
 */

import { formatXaf } from './pricing';

export type PaymentMethod = 'cash' | 'wallet' | 'mobile_money';

/**
 * Etats traverses par un paiement.
 *
 * `pending` couvre l'attente de validation sur le telephone (Mobile Money) ;
 * `due` est l'etat propre aux especes : rien n'est debite, le chauffeur
 * encaissera a la descente.
 */
export type PaymentStatus = 'idle' | 'pending' | 'succeeded' | 'failed' | 'due';

export type Payment = {
  method: PaymentMethod;
  status: PaymentStatus;
  amountXaf: number;
  /** Message d'echec a montrer a l'utilisateur, `null` si tout va bien (R8). */
  error: string | null;
  /** Billet annonce et monnaie a rendre. `null` hors paiement en especes. */
  cash: CashOffer | null;
};

/**
 * Especes : ce que le passager annonce avoir en main, et la monnaie qui en
 * decoule.
 *
 * Le probleme est concret a Douala : le chauffeur n'a pas toujours de quoi
 * rendre sur un gros billet, et la discussion a lieu a la descente. Annoncer le
 * billet AVANT la course permet au chauffeur de refuser s'il ne peut pas rendre
 * — la course repart alors vers un autre chauffeur — et supprime la discussion
 * a l'arrivee : les deux ecrans affichent le meme chiffre.
 */
export type CashOffer = {
  /** Ce que le passager a en main : billet annonce ou somme saisie. */
  billXaf: number;
  /** Monnaie que le chauffeur devra rendre. 0 si l'appoint est exact. */
  changeXaf: number;
  /** Faux si la somme ne couvre pas la course : on ne commande pas. */
  isEnough: boolean;
};

/** Coupures en circulation, proposees en raccourci sous la saisie. */
export const CASH_BILLS = [1000, 2000, 5000, 10000];

export function computeCashOffer(amountXaf: number, billXaf: number): CashOffer {
  const difference = billXaf - amountXaf;

  return {
    billXaf,
    changeXaf: difference > 0 ? difference : 0,
    isEnough: difference >= 0,
  };
}

/**
 * Phrase de la monnaie, affichee telle quelle au passager comme au chauffeur :
 * un seul libelle, donc aucun ecart possible entre les deux ecrans.
 */
export function changeLabel(offer: CashOffer): string {
  if (!offer.isEnough) {
    return 'Cette somme ne couvre pas la course.';
  }
  if (offer.changeXaf === 0) {
    return 'Appoint exact — aucune monnaie à rendre.';
  }
  return `Le chauffeur devra vous rendre ${formatXaf(offer.changeXaf)}`;
}

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'wallet', 'mobile_money'];

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  wallet: 'Portefeuille',
  mobile_money: 'Mobile Money',
};

/** Une ligne sous le libelle : ce que le passager doit comprendre du mode. */
export const METHOD_HINTS: Record<PaymentMethod, string> = {
  cash: 'À la descente',
  wallet: 'Solde VORA',
  mobile_money: 'MTN · Orange',
};

/**
 * Solde du portefeuille virtuel, en francs CFA.
 *
 * Valeur de demonstration : le solde reel viendra du backend avec le profil.
 */
export const DEMO_WALLET_BALANCE = 7500;

/** Delais de la simulation, cales pour rester visibles pendant la demo. */
const WALLET_DELAY_MS = 900;
const MOBILE_MONEY_PROMPT_MS = 3500;

/**
 * Lance le paiement et rappelle a chaque changement d'etat.
 *
 * Renvoie une fonction d'annulation : l'ecran peut etre quitte avant le
 * verdict, et un `setState` sur un composant demonte n'a pas de sens (R8).
 */
export function startPayment(
  method: PaymentMethod,
  amountXaf: number,
  onUpdate: (payment: Payment) => void,
  cash: CashOffer | null = null,
): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const emit = (status: PaymentStatus, error: string | null = null) =>
    onUpdate({ method, status, amountXaf, error, cash });

  // Especes : rien a debiter. Le paiement est simplement du au chauffeur, avec
  // la monnaie annoncee d'avance.
  if (method === 'cash') {
    if (cash !== null && !cash.isEnough) {
      emit('failed', 'Cette somme ne couvre pas la course.');
      return () => {};
    }

    emit('due');
    return () => {};
  }

  // Portefeuille : debit immediat sur un solde deja present dans l'app.
  if (method === 'wallet') {
    if (amountXaf > DEMO_WALLET_BALANCE) {
      emit('failed', 'Solde insuffisant. Rechargez ou choisissez un autre mode.');
      return () => {};
    }

    emit('pending');
    timers.push(setTimeout(() => emit('succeeded'), WALLET_DELAY_MS));
    return () => timers.forEach(clearTimeout);
  }

  // Mobile Money : l'operateur envoie une demande sur le telephone, le
  // passager saisit son code, puis le verdict revient.
  emit('pending');
  timers.push(setTimeout(() => emit('succeeded'), MOBILE_MONEY_PROMPT_MS));
  return () => timers.forEach(clearTimeout);
}

/** Ce que le panneau affiche pendant l'attente, selon le mode choisi. */
export function pendingLabel(method: PaymentMethod): string {
  if (method === 'mobile_money') {
    return 'Validez la demande sur votre téléphone…';
  }
  return 'Paiement en cours…';
}

/** Ce que le panneau affiche une fois le paiement conclu. */
export function resultLabel(payment: Payment): string {
  if (payment.status === 'due') {
    const settle = `${formatMethod(payment.method)} — à régler au chauffeur à la descente.`;
    // La monnaie fait partie du verdict : c'est elle que le passager relira a
    // l'arrivee, pas le montant de la course.
    return payment.cash === null
      ? settle
      : `${settle} ${changeLabel(payment.cash)}.`;
  }
  if (payment.status === 'succeeded') {
    return `Paiement accepté par ${formatMethod(payment.method)}.`;
  }
  return payment.error ?? 'Le paiement a échoué.';
}

function formatMethod(method: PaymentMethod): string {
  return METHOD_LABELS[method];
}
