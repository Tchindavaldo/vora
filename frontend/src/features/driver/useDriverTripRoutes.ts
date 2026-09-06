import { useEffect, useState } from 'react';

import {
  fetchRoute,
  RoutingError,
  type RoutePoint,
} from '../../services/routing';

/**
 * Les deux itineraires d'une course chauffeur (R17 etape 9).
 *
 * Miroir de `useApproachRoute` cote passager, mais en DEUX traces calcules
 * ensemble a l'acceptation : le chauffeur doit voir tout de suite son trajet
 * vers le client PUIS le trajet du client vers sa destination, comme le
 * passager voit le sien. De vrais calculs ORS et non des lignes droites :
 * sinon le vehicule traverse les batiments et l'ecran se lit comme une
 * maquette.
 *
 * Une seule paire de requetes par course : les deux traces ne changent plus
 * ensuite, et le quota ORS est limite (R12).
 */
export type DriverTripRoutes = {
  /** Chauffeur -> client. Vide tant qu'il n'est pas calcule. */
  toPickup: RoutePoint[];
  /** Client -> destination. Vide tant qu'il n'est pas calcule. */
  toDestination: RoutePoint[];
  isLoading: boolean;
};

async function routeOrLine(
  from: RoutePoint,
  to: RoutePoint,
  signal: AbortSignal,
): Promise<RoutePoint[]> {
  try {
    const route = await fetchRoute(from, to, 'car', signal);
    return route.points;
  } catch (error) {
    if (signal.aborted) return [];

    // Repli en ligne directe plutot qu'une carte sans trace (R8) : le
    // deroule de la course reste comprehensible, seul le realisme du trace
    // est perdu.
    const cause = error instanceof RoutingError ? error.reason : 'unknown';
    console.warn(`[driver] itineraire indisponible (${cause})`);
    return [from, to];
  }
}

export function useDriverTripRoutes(
  driverOrigin: RoutePoint | null,
  pickup: RoutePoint | null,
  destination: RoutePoint | null,
): DriverTripRoutes {
  const [toPickup, setToPickup] = useState<RoutePoint[]>([]);
  const [toDestination, setToDestination] = useState<RoutePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Coordonnees eclatees en nombres : les objets sont recrees a chaque rendu
  // et relanceraient les deux requetes en boucle.
  const originLng = driverOrigin?.longitude ?? null;
  const originLat = driverOrigin?.latitude ?? null;
  const pickupLng = pickup?.longitude ?? null;
  const pickupLat = pickup?.latitude ?? null;
  const destLng = destination?.longitude ?? null;
  const destLat = destination?.latitude ?? null;

  useEffect(() => {
    if (
      originLng === null ||
      originLat === null ||
      pickupLng === null ||
      pickupLat === null ||
      destLng === null ||
      destLat === null
    ) {
      setToPickup([]);
      setToDestination([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const origin = { longitude: originLng, latitude: originLat };
    const client = { longitude: pickupLng, latitude: pickupLat };
    const target = { longitude: destLng, latitude: destLat };

    Promise.all([
      routeOrLine(origin, client, controller.signal),
      routeOrLine(client, target, controller.signal),
    ]).then(([approach, trip]) => {
      if (controller.signal.aborted) return;
      setToPickup(approach);
      setToDestination(trip);
      setIsLoading(false);
    });

    return () => controller.abort();
  }, [originLng, originLat, pickupLng, pickupLat, destLng, destLat]);

  return { toPickup, toDestination, isLoading };
}
