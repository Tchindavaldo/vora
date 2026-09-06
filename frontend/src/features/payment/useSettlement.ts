import { useCallback, useEffect, useRef, useState } from 'react';

import { formatXaf } from '../../services/pricing';
import { debit, type WalletOperator } from '../../services/wallet';
import { startMomo, type MomoTransaction } from '../../services/momo';
import type { PaymentMethod } from '../../services/payment';

/**
 * Reglement de la course A L'ARRIVEE (brief §8, R13).
 *
 * Le mode de paiement est choisi a la commande ; c'est ici qu'il s'execute,
 * une fois la course terminee — comme chez Yango ou Uber. Debiter au depart
 * ferait payer une course annulee.
 *
 * Trois chemins, selon le mode :
 * - especes       : rien a debiter, on affiche la somme a remettre au chauffeur
 * - portefeuille  : debit immediat du solde, une ligne dans les mouvements
 * - Mobile Money  : tunnel USSD simule (voir `services/momo`)
 */

export type SettlementState =
  | 'idle'
  /** Especes : le passager doit remettre la somme au chauffeur. */
  | 'cash_due'
  /** Portefeuille ou Mobile Money : reglement abouti. */
  | 'settled'
  /** Le reglement a echoue : reessayer, ou changer de mode (R8). */
  | 'failed';

export type Settlement = {
  state: SettlementState;
  /** Tunnel Mobile Money en cours, `null` pour les autres modes. */
  momo: MomoTransaction | null;
  /** Message affiche au passager, deja redige. */
  message: string;
  /** Cause de l'echec, `null` tant que tout va bien. */
  error: string | null;
  /** Vrai tant que le verdict n'est pas tombe : on ne ferme pas l'ecran. */
  isProcessing: boolean;
  /** Joue le reglement. A appeler une fois, a la fin de la course. */
  start: (
    method: PaymentMethod,
    amountXaf: number,
    phone: string,
    operator?: WalletOperator,
  ) => void;
  /** Rejoue le meme reglement apres un echec. */
  retry: () => void;
  reset: () => void;
};

type Attempt = {
  method: PaymentMethod;
  amountXaf: number;
  phone: string;
  operator: WalletOperator;
};

export function useSettlement(): Settlement {
  const [state, setState] = useState<SettlementState>('idle');
  const [momo, setMomo] = useState<MomoTransaction | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Conserve pour le bouton "Reessayer" : refaire saisir le montant apres un
  // echec d'operateur n'aurait aucun sens.
  const attemptRef = useRef<Attempt | null>(null);

  // Le tunnel peut etre quitte avant son verdict (R8).
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => () => cancelRef.current(), []);

  const run = useCallback((attempt: Attempt) => {
    const { method, amountXaf, phone, operator } = attempt;

    cancelRef.current();
    cancelRef.current = () => {};
    attemptRef.current = attempt;
    setError(null);
    setMomo(null);

    if (method === 'cash') {
      setState('cash_due');
      setMessage(`Payez ${formatXaf(amountXaf)} au chauffeur.`);
      return;
    }

    if (method === 'wallet') {
      // Le solde a pu changer depuis la commande : une autre course, ou une
      // recharge qui n'a pas abouti. On revalide au moment du debit.
      if (!debit(amountXaf, 'Course VORA')) {
        setState('failed');
        setMessage('Débit impossible.');
        setError('Solde insuffisant. Rechargez ou payez autrement.');
        return;
      }

      setState('settled');
      setMessage(`${formatXaf(amountXaf)} débités de votre portefeuille.`);
      return;
    }

    // Mobile Money : le tunnel USSD porte lui-meme ses messages.
    cancelRef.current = startMomo(operator, amountXaf, phone, (next) => {
      setMomo(next);
      setMessage(next.message);
      setError(next.error);

      if (next.state === 'success') setState('settled');
      if (next.state === 'failed') setState('failed');
    });
  }, []);

  const start = useCallback(
    (
      method: PaymentMethod,
      amountXaf: number,
      phone: string,
      operator: WalletOperator = 'mtn',
    ) => run({ method, amountXaf, phone, operator }),
    [run],
  );

  const retry = useCallback(() => {
    const attempt = attemptRef.current;
    if (attempt !== null) run(attempt);
  }, [run]);

  const reset = useCallback(() => {
    cancelRef.current();
    cancelRef.current = () => {};
    attemptRef.current = null;
    setState('idle');
    setMomo(null);
    setMessage('');
    setError(null);
  }, []);

  const momoState = momo?.state ?? null;

  return {
    state,
    momo,
    message,
    error,
    isProcessing: momoState === 'waiting' || momoState === 'ussd_sent',
    start,
    retry,
    reset,
  };
}
