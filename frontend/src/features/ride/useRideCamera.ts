import { useCallback, useEffect, useState } from 'react';

import type { RoutePoint } from '../../services/routing';
import type { RideStatus } from '../../services/rides';

/**
 * Cadrages de la carte pendant le suivi de course (R17 etape 8).
 *
 * Extrait de `HomeScreen` pour le garder lisible (R4). Le hook ne connait pas
 * MapLibre : il produit une liste de points et un compteur, que `MapCanvas`
 * traduit en mouvement de camera (R11).
 */
export type RideCamera = {
  /** Points a faire tenir dans la vue. */
  fitPoints: RoutePoint[];
  /** Increment = nouvelle demande de cadrage. */
  fitPointsToken: number;
  /** Marge supplementaire : plus elle est large, plus la camera recule. */
  fitPointsPadding: number;
  /** Itineraire actuellement pertinent : l'approche, sinon la course. */
  activeRoutePoints: RoutePoint[];
  /** Recadre sur l'itineraire en cours, a la demande de l'utilisateur. */
  fitActiveRoute: () => void;
};

/**
 * Marge ajoutee au cadrage de l'approche, en pixels.
 *
 * Le trajet d'un chauffeur du quartier fait quelques centaines de metres : sans
 * ce recul, le vehicule et le passager se retrouvent colles aux bords de
 * l'ecran et on ne voit plus le quartier qu'ils traversent.
 */
const APPROACH_FIT_PADDING = 90;

export function useRideCamera(
  rideStatus: RideStatus | null,
  approachPoints: RoutePoint[],
  routePoints: RoutePoint[],
): RideCamera {
  const [fitPoints, setFitPoints] = useState<RoutePoint[]>([]);
  const [fitPointsToken, setFitPointsToken] = useState(0);
  const [fitPointsPadding, setFitPointsPadding] = useState(0);

  const fitCameraTo = useCallback((points: RoutePoint[], padding = 0) => {
    if (points.length < 2) return;
    setFitPoints(points);
    setFitPointsPadding(padding);
    setFitPointsToken((token) => token + 1);
  }, []);

  const approachReady = approachPoints.length >= 2;

  /**
   * Recadrages automatiques, sur CHANGEMENT DE STATUT et non a chaque position
   * du vehicule : recadrer en continu empecherait l'utilisateur de deplacer la
   * carte, la camera lui reprenant la main a chaque image.
   *
   * - a l'acceptation : le chauffeur qui arrive ET la position du passager ;
   * - au demarrage : le vehicule ET la destination, vue globale du trajet.
   */
  useEffect(() => {
    if (rideStatus === 'accepted' && approachReady) {
      // Tout le trajet d'approche : ses extremites sont le chauffeur et le
      // passager, et ses points intermediaires evitent que la route sorte du
      // cadre dans un contournement. Marge supplementaire : un cadrage au plus
      // juste collerait les deux marqueurs aux bords de l'ecran.
      fitCameraTo(approachPoints, APPROACH_FIT_PADDING);
      return;
    }

    if (rideStatus === 'in_progress') {
      // Le trajet complet, sans marge ajoutee : il est long, l'ecran est deja
      // juste pour le contenir.
      fitCameraTo(routePoints);
    }
    // Sur le seul statut : voir le commentaire ci-dessus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideStatus, approachReady]);

  // Pendant l'approche, l'itineraire qui compte est celui du chauffeur vers
  // vous ; partout ailleurs, celui de la course.
  const activeRoutePoints =
    rideStatus === 'accepted' && approachReady ? approachPoints : routePoints;

  /**
   * Bouton "itineraire" : la camera est libre pendant tout le suivi, et
   * l'utilisateur doit pouvoir revenir a la vue d'ensemble sans attendre le
   * prochain changement de statut.
   */
  const fitActiveRoute = () =>
    fitCameraTo(
      activeRoutePoints,
      rideStatus === 'accepted' ? APPROACH_FIT_PADDING : 0,
    );

  return {
    fitPoints,
    fitPointsToken,
    fitPointsPadding,
    activeRoutePoints,
    fitActiveRoute,
  };
}
