/**
 * Portefeuille virtuel du passager (brief §8, R13).
 *
 * ⚠️ SIMULE, EN MEMOIRE. Aucun compte reel, aucun mouvement d'argent : le solde
 * vit le temps de la session, comme l'historique des courses. Quand le backend
 * existera, `getBalance` deviendra `GET /wallet` et les mouvements viendront de
 * lui — le telephone n'est jamais la source de verite d'un solde (R13).
 *
 * Service pur, sans rendu : partage entre ecrans (R16).
 */

import { formatXaf } from './pricing';

/** Operateurs de rechargement disponibles au Cameroun. */
export type WalletOperator = 'mtn' | 'orange';

/** Un mouvement du solde, du plus recent au plus ancien. */
export type WalletEntry = {
  id: string;
  /** Date du mouvement, en millisecondes depuis epoch. */
  at: number;
  /** Positif pour une recharge, negatif pour le paiement d'une course. */
  amountXaf: number;
  label: string;
};

/** Solde d'ouverture, avant toute recharge de la session. */
const INITIAL_BALANCE_XAF = 7500;

/** Montants proposes en raccourci sur l'ecran de recharge. */
export const TOPUP_PRESETS_XAF = [1000, 2000, 5000, 10000];

/** Recharge minimale : en dessous, les frais operateur n'ont pas de sens. */
export const MIN_TOPUP_XAF = 500;

let balanceXaf = INITIAL_BALANCE_XAF;

const entries: WalletEntry[] = [];

/**
 * Abonnes aux variations du solde.
 *
 * Le solde est lu par plusieurs ecrans (paiement, profil, recharge) : sans
 * notification, celui qui ne provoque pas le changement garderait l'ancienne
 * valeur affichee jusqu'a son prochain montage.
 */
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeWallet(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBalance(): number {
  return balanceXaf;
}

export function listWalletEntries(): WalletEntry[] {
  return entries;
}

export function operatorLabel(operator: WalletOperator): string {
  return operator === 'mtn' ? 'MTN MoMo' : 'Orange Money';
}

/**
 * Code USSD de l'operateur, affiche au passager pendant la recharge comme
 * pendant le paiement d'une course.
 */
export function ussdCode(operator: WalletOperator): string {
  return operator === 'mtn' ? '*126#' : '#150#';
}

/** Credite le portefeuille a l'issue d'une recharge validee. */
export function credit(amountXaf: number, operator: WalletOperator): void {
  balanceXaf += amountXaf;
  entries.unshift({
    id: `top-${Date.now()}`,
    at: Date.now(),
    amountXaf,
    label: `Recharge ${operatorLabel(operator)}`,
  });
  notify();
}

/**
 * Debite le portefeuille a la fin d'une course.
 *
 * Renvoie `false` si le solde ne couvre pas le montant : l'appelant doit alors
 * proposer une recharge ou un autre mode (R8). Le solde n'est jamais laisse
 * negatif.
 */
export function debit(amountXaf: number, label: string): boolean {
  if (amountXaf > balanceXaf) return false;

  balanceXaf -= amountXaf;
  entries.unshift({
    id: `pay-${Date.now()}`,
    at: Date.now(),
    amountXaf: -amountXaf,
    label,
  });
  notify();
  return true;
}

/** Phrase du solde, identique partout ou il est affiche. */
export function balanceLabel(): string {
  return formatXaf(balanceXaf);
}
