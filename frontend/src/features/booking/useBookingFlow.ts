import { useEffect, useMemo, useState } from 'react';

import { estimateAllFares, type Fare, type VehicleTier } from '../../services/pricing';
import type { RoutePoint } from '../../services/routing';
import type { DestinationChoice } from '../search/DestinationSearchScreen';
import { useRoute } from './useRoute';

/**
 * Deroulement d'une reservation, de la destination choisie a la commande
 * (R17 etapes 4 et 5).
 *
 * Rassemble ici pour que `HomeScreen` reste un assemblage de vues : il ne
 * connait que l'etat courant et trois actions.
 */
export type BookingFlow = {
  /** Destination retenue, `null` tant qu'aucune course n'est en preparation. */
  choice: DestinationChoice | null;
  /** Trace a passer a la carte, vide tant que l'itineraire n'est pas calcule. */
  routePoints: RoutePoint[];
  distanceMeters: number | null;
  fares: Fare[];
  selectedTier: VehicleTier;
  isLoading: boolean;
  error: string | null;
  /** Incremente quand un nouveau trace est pret : declenche le cadrage. */
  fitRouteToken: number;
  selectTier: (tier: VehicleTier) => void;
  retry: () => void;
  /** Commence une course vers la destination choisie. */
  start: (choice: DestinationChoice) => void;
  /** Abandonne la course en preparation et revient a l'accueil. */
  cancel: () => void;
};

export function useBookingFlow(origin: RoutePoint): BookingFlow {
  const [choice, setChoice] = useState<DestinationChoice | null>(null);

  // La moto est proposee en premier : c'est le mode le plus utilise a Douala,
  // et le moins cher de la grille.
  const [selectedTier, setSelectedTier] = useState<VehicleTier>('moto');

  const destination = useMemo<RoutePoint | null>(
    () =>
      choice === null
        ? null
        : {
            longitude: choice.place.longitude,
            latitude: choice.place.latitude,
          },
    [choice],
  );

  const { route, isLoading, error, retry } = useRoute(origin, destination);

  // Le cadrage se demande une fois par itineraire calcule, pas a chaque rendu :
  // sinon la camera repartirait en vol des que l'utilisateur deplace la carte.
  const [fitRouteToken, setFitRouteToken] = useState(0);

  useEffect(() => {
    if (route === null) return;
    setFitRouteToken((token) => token + 1);
  }, [route]);

  const fares = useMemo(
    () =>
      route === null
        ? []
        : estimateAllFares(route.distanceMeters, route.durationSeconds),
    [route],
  );

  return {
    choice,
    routePoints: route?.points ?? [],
    distanceMeters: route?.distanceMeters ?? null,
    fares,
    selectedTier,
    isLoading,
    error,
    fitRouteToken,
    selectTier: setSelectedTier,
    retry,
    start: setChoice,
    cancel: () => setChoice(null),
  };
}
