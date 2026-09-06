/**
 * Lecture des revenus du jour du chauffeur (R12).
 *
 * Copie dediee de `useTransactions` cote passager (R16) : meme structure —
 * en cours, succes, erreur (R8) — mais sur le service `driverEarnings`, et
 * elle divergera des que les revenus auront leurs propres filtres (jour,
 * semaine, periode). Aucun composant n'appelle le service directement.
 *
 * L'ecran des revenus est monte a son ouverture et demonte a sa fermeture : la
 * lecture repart donc a chaque visite, et une course encaissee entre-temps
 * apparait sans qu'il faille invalider quoi que ce soit.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  listDriverEarnings,
  type DriverEarning,
} from '../../services/driverEarnings';

export function useDriverEarnings() {
  const [items, setItems] = useState<DriverEarning[]>([]);
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
      const result = await listDriverEarnings();
      if (!isMountedRef.current) return;
      setItems(result);
    } catch (cause) {
      console.warn('[useDriverEarnings] lecture impossible', cause);
      if (!isMountedRef.current) return;
      setError('Impossible de charger vos revenus. Réessayez.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, isLoading, error, retry: load };
}
