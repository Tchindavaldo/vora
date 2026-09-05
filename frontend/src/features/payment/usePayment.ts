import { useCallback, useEffect, useRef, useState } from 'react';

import {
  startPayment,
  type Payment,
  type PaymentMethod,
} from '../../services/payment';

/**
 * Choix du mode de paiement et suivi du verdict (R17 etape 6, brief §8).
 *
 * L'ecran ne connait que l'etat courant et deux actions : choisir un mode,
 * confirmer. Tout le reste — delais, annulation, nettoyage des timers — vit
 * ici (R4).
 */
export type PaymentFlow = {
  method: PaymentMethod;
  payment: Payment | null;
  /** Vrai tant que le verdict n'est pas tombe : le bouton reste bloque. */
  isProcessing: boolean;
  /** Vrai quand la course peut demarrer (paye, ou du en especes). */
  isSettled: boolean;
  selectMethod: (method: PaymentMethod) => void;
  confirm: (amountXaf: number) => void;
  /** Abandonne le paiement en cours et remet le panneau a zero. */
  reset: () => void;
};

export function usePayment(): PaymentFlow {
  // Les especes en premier : c'est le mode encore majoritaire a Douala.
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [payment, setPayment] = useState<Payment | null>(null);

  // Annulation du paiement en cours : un ecran quitte pendant l'attente ne
  // doit pas recevoir de verdict (R8).
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => () => cancelRef.current(), []);

  const reset = useCallback(() => {
    cancelRef.current();
    cancelRef.current = () => {};
    setPayment(null);
  }, []);

  const selectMethod = useCallback(
    (next: PaymentMethod) => {
      // Changer de mode apres un echec relance depuis un etat propre.
      reset();
      setMethod(next);
    },
    [reset],
  );

  const confirm = useCallback(
    (amountXaf: number) => {
      cancelRef.current();
      cancelRef.current = startPayment(method, amountXaf, setPayment);
    },
    [method],
  );

  const status = payment?.status ?? 'idle';

  return {
    method,
    payment,
    isProcessing: status === 'pending',
    isSettled: status === 'succeeded' || status === 'due',
    selectMethod,
    confirm,
    reset,
  };
}
