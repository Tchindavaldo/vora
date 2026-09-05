/**
 * Lecture de l'historique des transactions (R12).
 *
 * Aucun composant n'appelle `listTransactions` directement : le hook porte les
 * trois etats attendus d'un appel reseau — en cours, succes, erreur — pour que
 * l'ecran ait toujours quelque chose a montrer, y compris en cas d'echec (R8).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { listTransactions, type Transaction } from '../../services/transactions';

export function useTransactions() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // L'ecran peut etre ferme pendant la lecture : un `setState` sur un composant
  // demonte n'a pas de sens (R8).
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listTransactions();
      if (!isMountedRef.current) return;
      setItems(result);
    } catch (cause) {
      console.warn('[useTransactions] lecture impossible', cause);
      if (!isMountedRef.current) return;
      setError('Impossible de charger vos courses. Réessayez.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, isLoading, error, retry: load };
}
