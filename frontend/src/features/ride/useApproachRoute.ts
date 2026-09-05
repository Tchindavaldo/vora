import { useEffect, useState } from 'react';

import {
  fetchRoute,
  RoutingError,
  type RoutePoint,
} from '../../services/routing';
import type { Ride } from '../../services/rides';

/**
 * Itineraire d'approche : de la position du chauffeur jusqu'au passager
 * (R17 etape 8).
 *
 * Un vrai calcul de route, et non une ligne droite : le vehicule doit rouler
 * sur la chaussee et rester aligne dessus, sinon il traverse les batiments et
 * l'app se lit comme une maquette.
 *
 * Une seule requete par course, declenchee a l'acceptation : le trajet
 * d'approche ne change plus ensuite, et le quota ORS est de 2 000
 * requetes/jour (R12).
 */
export type ApproachRoute = {
  /** Trace a dessiner et a suivre, vide tant qu'il n'est pas calcule. */
  points: RoutePoint[];
  /** Vrai pendant le calcul : le vehicule n'est pas encore affiche. */
  isLoading: boolean;
};

export function useApproachRoute(ride: Ride | null): ApproachRoute {
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const originLng = ride?.driverOrigin?.longitude ?? null;
  const originLat = ride?.driverOrigin?.latitude ?? null;
  const targetLng = ride?.pickup?.longitude ?? null;
  const targetLat = ride?.pickup?.latitude ?? null;

  useEffect(() => {
    if (
      originLng === null ||
      originLat === null ||
      targetLng === null ||
      targetLat === null
    ) {
      setPoints([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetchRoute(
      { longitude: originLng, latitude: originLat },
      { longitude: targetLng, latitude: targetLat },
      'car',
      controller.signal,
    )
      .then((route) => {
        if (controller.signal.aborted) return;
        setPoints(route.points);
        setIsLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        // Echec du calcul : on retombe sur la ligne directe plutot que de
        // laisser la carte sans vehicule (R8). Le suivi reste comprehensible,
        // seul le realisme du trace est perdu.
        const cause = error instanceof RoutingError ? error.reason : 'unknown';
        console.warn(`[ride] itineraire d'approche indisponible (${cause})`);
        setPoints([
          { longitude: originLng, latitude: originLat },
          { longitude: targetLng, latitude: targetLat },
        ]);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [originLng, originLat, targetLng, targetLat]);

  return { points, isLoading };
}
