/**
 * Lecture de l'historique des courses du chauffeur (R12).
 *
 * Copie dediee de `useDriverEarnings` (R16), avec ce que celui-ci n'a pas :
 * une PERIODE. Changer de periode relance la lecture — c'est le backend qui
 * filtrera (`GET /driver/rides?from=&to=`), pas l'ecran : filtrer cote client
 * supposerait d'avoir deja tout charge, ce qui ne tiendra pas sur un
 * historique reel.
 *
 * Trois etats attendus d'un appel reseau — en cours, succes, erreur (R8) —
 * pour que l'ecran ait toujours quelque chose a montrer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  listDriverRides,
  type DriverRide,
  type DriverRidePeriod,
} from '../../services/driverRides';

export function useDriverRides(initialPeriod: DriverRidePeriod = 'week') {
  const [period, setPeriod] = useState<DriverRidePeriod>(initialPeriod);
  const [items, setItems] = useState<DriverRide[]>([]);
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
      const result = await listDriverRides(period);
      if (!isMountedRef.current) return;
      setItems(result);
    } catch (cause) {
      console.warn('[useDriverRides] lecture impossible', cause);
      if (!isMountedRef.current) return;
      setError('Impossible de charger vos courses. Réessayez.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, period, setPeriod, isLoading, error, retry: load };
}
