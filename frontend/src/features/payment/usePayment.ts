import { useCallback, useEffect, useRef, useState } from 'react';

import {
  startPayment,
  type CashOffer,
  type Payment,
  type PaymentMethod,
} from '../../services/payment';

/**
 * Choix du mode de paiement et suivi du verdict (R17 etape 6, brief §8).
 *
 * L'ecran ne connait que l'etat courant et quelques actions : choisir un mode,
 * passer a l'etape suivante, confirmer. Tout le reste — delais, annulation,
 * nettoyage des timers — vit ici (R4).
 */

/**
 * Etape du panneau de paiement.
 *
 * `method` choix du mode · `cash` saisie de la somme dont dispose le passager,
 * pour annoncer la monnaie au chauffeur. Les autres modes n'ont pas de seconde
 * etape : ils confirment directement depuis `method`.
 */
export type PaymentStep = 'method' | 'cash';

export type PaymentFlow = {
  method: PaymentMethod;
  step: PaymentStep;
  payment: Payment | null;
  /** Somme annoncee par le passager, telle qu'il la saisit (especes). */
  billInput: string;
  /** Vrai tant que le verdict n'est pas tombe : le bouton reste bloque. */
  isProcessing: boolean;
  /** Vrai quand la course peut demarrer (paye, ou du en especes). */
  isSettled: boolean;
  selectMethod: (method: PaymentMethod) => void;
  setBillInput: (value: string) => void;
  /** Ouvre l'etape especes : saisie de la somme et calcul de la monnaie. */
  openCash: () => void;
  /** Revient a l'etape precedente sans perdre le mode choisi. */
  back: () => void;
  confirm: (amountXaf: number, cash?: CashOffer | null) => void;
  /** Abandonne le paiement en cours et remet le panneau a zero. */
  reset: () => void;
};

export function usePayment(): PaymentFlow {
  // Les especes en premier : c'est le mode encore majoritaire a Douala.
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [step, setStep] = useState<PaymentStep>('method');
  const [billInput, setBillInput] = useState('');
  const [payment, setPayment] = useState<Payment | null>(null);

  // Annulation du paiement en cours : un ecran quitte pendant l'attente ne
  // doit pas recevoir de verdict (R8).
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => () => cancelRef.current(), []);

  const reset = useCallback(() => {
    cancelRef.current();
    cancelRef.current = () => {};
    setPayment(null);
    setStep('method');
    setBillInput('');
  }, []);

  const selectMethod = useCallback(
    (next: PaymentMethod) => {
      // Changer de mode apres un echec relance depuis un etat propre.
      reset();
      setMethod(next);
    },
    [reset],
  );

  const openCash = useCallback(() => setStep('cash'), []);

  const back = useCallback(() => {
    // Le verdict des especes tient a la somme annoncee : revenir en arriere
    // pour la changer doit repartir d'un paiement vierge.
    cancelRef.current();
    cancelRef.current = () => {};
    setPayment(null);
    setStep('method');
  }, []);

  const confirm = useCallback(
    (amountXaf: number, cash: CashOffer | null = null) => {
      cancelRef.current();
      cancelRef.current = startPayment(method, amountXaf, setPayment, cash);
    },
    [method],
  );

  const status = payment?.status ?? 'idle';

  return {
    method,
    step,
    payment,
    billInput,
    isProcessing: status === 'pending',
    isSettled: status === 'succeeded' || status === 'due',
    selectMethod,
    setBillInput,
    openCash,
    back,
    confirm,
    reset,
  };
}
