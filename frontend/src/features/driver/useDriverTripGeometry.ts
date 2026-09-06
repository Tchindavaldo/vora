import { useMemo } from 'react';

import { useUserLocation } from '../home/useUserLocation';
import { useDriverTripRoutes } from './useDriverTripRoutes';
import { useDriverVehicleMotion } from './useDriverVehicleMotion';
import type { DriverTripStage } from './driverRequests';

/**
 * Geometrie de la carte chauffeur : position, points de la course, traces et
 * vehicule anime.
 *
 * Regroupee ici parce qu'elle doit vivre AU-DESSUS des ecrans, dans
 * `DriverApp` : le tableau de bord et la course partagent une seule et meme
 * carte, qui ne doit pas etre demontee au moment de l'acceptation — sinon la
 * carte disparait puis se recharge, et le chauffeur voit un flash au lieu de
 * son vehicule qui se met en route.
 */
export function useDriverTripGeometry(hasTrip: boolean, stage: DriverTripStage) {
  // Vraie position du chauffeur (R8) : repli sur la ville par defaut si la
  // geoloc est refusee ou indisponible.
  const location = useUserLocation();
  const { longitude, latitude } = location.coords;

  // Decalages courts (quelques centaines de metres) : le client et sa
  // destination restent dans le quartier du chauffeur — un ecart trop grand
  // casserait l'illusion d'une demande proche de lui. Faute de geocodage cote
  // chauffeur, ce sont des points de demonstration.
  const points = useMemo(
    () => ({
      driverStart: { longitude, latitude },
      pickup: { longitude: longitude + 0.0025, latitude: latitude + 0.0015 },
      destination: { longitude: longitude + 0.0055, latitude: latitude + 0.0035 },
    }),
    [longitude, latitude],
  );

  // Les deux itineraires ne sont calcules qu'une course acceptee : hors
  // course, aucune requete ORS (R12).
  const routes = useDriverTripRoutes(
    hasTrip ? points.driverStart : null,
    hasTrip ? points.pickup : null,
    hasTrip ? points.destination : null,
  );

  const vehicle = useDriverVehicleMotion(stage, routes.toPickup, routes.toDestination);

  // Hors course, le vehicule est simplement pose sur la position du chauffeur.
  const vehiclePosition = hasTrip && vehicle !== null ? vehicle : { ...points.driverStart, bearing: 0 };

  return { points, routes, vehiclePosition, location };
}
