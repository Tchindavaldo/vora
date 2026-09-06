/**
 * Tunnel Mobile Money simule (R13, brief §8).
 *
 * ⚠️ ENTIEREMENT SIMULE. Aucun appel a MTN MoMo ni Orange Money, aucun debit
 * reel. Ce module imite la sequence que produira le backend :
 *
 *   waiting     la demande part vers l'operateur
 *   ussd_sent   l'operateur a pousse la demande sur le telephone du passager,
 *               qui compose son code et valide
 *   success     verdict positif
 *   failed      verdict negatif (annulation, solde operateur insuffisant)
 *
 * Quand l'API existera, seule `startMomo` change : elle postera la demande puis
 * ecoutera le verdict, au lieu de le produire elle-meme. Les etats et les
 * messages ci-dessous restent les memes, donc l'UI ne bouge pas.
 *
 * Service pur, sans rendu : partage entre ecrans (R16).
 */

import { formatXaf } from './pricing';
import { operatorLabel, ussdCode, type WalletOperator } from './wallet';

export type MomoState = 'waiting' | 'ussd_sent' | 'success' | 'failed';

export type MomoTransaction = {
  state: MomoState;
  operator: WalletOperator;
  amountXaf: number;
  phone: string;
  /** Message a afficher tel quel, deja redige pour le passager. */
  message: string;
  /** Renseigne uniquement en `failed`, pour le toast d'erreur (R8). */
  error: string | null;
};

/**
 * Delais de la simulation.
 *
 * Cales pour rester lisibles pendant la demo devant le jury : assez longs pour
 * qu'on voie chaque etape, assez courts pour ne pas faire attendre.
 */
const SEND_MS = 1500;
const VERDICT_MS = 6000;

/**
 * Un paiement sur cinq echoue.
 *
 * Un tunnel qui reussit toujours ne prouve rien : le brief (§20) penalise une
 * application qui ne marche que dans le scenario ideal. L'echec permet de
 * montrer le rattrapage — reessayer ou changer de mode.
 */
const FAILURE_RATE = 0.2;

export function waitingMessage(): string {
  return 'Envoi de la demande à l’opérateur…';
}

export function ussdMessage(
  operator: WalletOperator,
  amountXaf: number,
): string {
  return `Composez ${ussdCode(operator)} et validez le paiement de ${formatXaf(
    amountXaf,
  )} sur ${operatorLabel(operator)}.`;
}

/**
 * Lance la sequence et rappelle a chaque changement d'etat.
 *
 * Renvoie une fonction d'annulation : le passager peut fermer l'ecran avant le
 * verdict, et un `setState` sur un composant demonte n'a pas de sens (R8).
 */
export function startMomo(
  operator: WalletOperator,
  amountXaf: number,
  phone: string,
  onUpdate: (transaction: MomoTransaction) => void,
): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];

  const emit = (state: MomoState, message: string, error: string | null = null) =>
    onUpdate({ state, operator, amountXaf, phone, message, error });

  emit('waiting', waitingMessage());

  timers.push(
    setTimeout(() => {
      emit('ussd_sent', ussdMessage(operator, amountXaf));

      timers.push(
        setTimeout(() => {
          if (Math.random() < FAILURE_RATE) {
            emit(
              'failed',
              'Paiement non abouti.',
              'Demande annulée ou expirée. Réessayez ou changez de mode.',
            );
            return;
          }

          emit('success', `Paiement de ${formatXaf(amountXaf)} confirmé.`);
        }, VERDICT_MS),
      );
    }, SEND_MS),
  );

  return () => timers.forEach(clearTimeout);
}
