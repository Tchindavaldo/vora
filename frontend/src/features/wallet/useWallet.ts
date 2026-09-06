import { useCallback, useEffect, useRef, useState } from 'react';

import {
  credit,
  getBalance,
  listWalletEntries,
  subscribeWallet,
  type WalletEntry,
  type WalletOperator,
} from '../../services/wallet';
import { startMomo, type MomoTransaction } from '../../services/momo';
import { notify } from '../../services/notifications';
import { formatXaf } from '../../services/pricing';

/**
 * Solde du portefeuille et recharge par Mobile Money (brief §8, R13).
 *
 * La recharge emprunte le MEME tunnel USSD simule que le paiement d'une course
 * (`services/momo`) : c'est la meme demande envoyee a l'operateur, seul le sens
 * de l'argent change. Le solde n'est credite qu'au verdict positif.
 */

export type WalletFlow = {
  balanceXaf: number;
  entries: WalletEntry[];
  operator: WalletOperator;
  /** Montant en cours de saisie, tel que tape par l'utilisateur. */
  amountInput: string;
  phone: string;
  /** Tunnel de recharge en cours, `null` tant que rien n'est lance. */
  momo: MomoTransaction | null;
  /** Vrai tant que le verdict n'est pas tombe : la saisie reste bloquee. */
  isProcessing: boolean;
  setOperator: (operator: WalletOperator) => void;
  setAmountInput: (value: string) => void;
  setPhone: (value: string) => void;
  /** Lance la recharge. Ne fait rien si le montant est invalide. */
  topUp: (amountXaf: number) => void;
  /** Abandonne la recharge en cours et remet l'ecran a zero. */
  reset: () => void;
};

export function useWallet(): WalletFlow {
  // Le solde vit dans le service : on ne le recopie pas, on se re-rend quand il
  // change (R6 — pas d'etat partage duplique dans un ecran).
  const [, forceRender] = useState(0);

  useEffect(
    () => subscribeWallet(() => forceRender((tick) => tick + 1)),
    [],
  );

  const [operator, setOperator] = useState<WalletOperator>('mtn');
  const [amountInput, setAmountInput] = useState('');
  const [phone, setPhone] = useState('');
  const [momo, setMomo] = useState<MomoTransaction | null>(null);

  // Le tunnel peut etre quitte avant son verdict : sans annulation, un
  // `setState` tomberait sur un ecran demonte (R8).
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => () => cancelRef.current(), []);

  const reset = useCallback(() => {
    cancelRef.current();
    cancelRef.current = () => {};
    setMomo(null);
    setAmountInput('');
  }, []);

  const topUp = useCallback(
    (amountXaf: number) => {
      cancelRef.current();

      cancelRef.current = startMomo(operator, amountXaf, phone, (next) => {
        setMomo(next);

        // Le solde ne bouge qu'au verdict positif : crediter plus tot
        // afficherait de l'argent qui n'est pas arrive.
        if (next.state === 'success') {
          credit(amountXaf, operator);

          // Notification locale : une recharge se lance puis se poursuit
          // pendant que le passager compose son code ailleurs, ecran eteint ou
          // application en arriere-plan. Sans elle, il devrait revenir verifier
          // lui-meme si son solde a bouge.
          notify(
            'Recharge confirmée',
            `${formatXaf(amountXaf)} ajoutés à votre portefeuille VORA.`,
          );
        }
      });
    },
    [operator, phone],
  );

  const state = momo?.state ?? null;

  return {
    balanceXaf: getBalance(),
    entries: listWalletEntries(),
    operator,
    amountInput,
    phone,
    momo,
    isProcessing: state === 'waiting' || state === 'ussd_sent',
    setOperator,
    setAmountInput,
    setPhone,
    topUp,
    reset,
  };
}
