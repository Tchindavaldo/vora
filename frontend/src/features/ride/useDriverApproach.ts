import { useEffect, useRef, useState } from 'react';

import type { RoutePoint } from '../../services/routing';
import { RIDE_TIMINGS, type Ride } from '../../services/rides';

/**
 * Position affichee du chauffeur pendant l'approche puis pendant la course.
 *
 * ⚠️ SIMULE, comme `services/rides.ts` : le marqueur est interpole entre deux
 * points a cadence fixe. En production ce hook disparait — les positions
 * arriveront par socket depuis le GPS du chauffeur, et le composant se
 * contentera de les afficher.
 */
export type DriverPosition = RoutePoint & {
  /** Cap en degres, 0 = nord. Oriente le marqueur dans son sens de marche. */
  bearing: number;
};

/**
 * Rythme de rafraichissement, aligne sur `useVehicleMotion` : 120 ms donne un
 * mouvement fluide sans reveiller le thread JS soixante fois par seconde, ce
 * qui coute cher sur les telephones d'entree de gamme vises par le projet.
 */
const TICK_MS = 120;

function bearingBetween(from: RoutePoint, to: RoutePoint): number {
  const toRad = Math.PI / 180;
  const dLng = (to.longitude - from.longitude) * Math.cos(from.latitude * toRad);
  const dLat = to.latitude - from.latitude;
  return (Math.atan2(dLng, dLat) / toRad + 360) % 360;
}

/** Point a `ratio` (0 a 1) entre deux positions. */
function interpolate(from: RoutePoint, to: RoutePoint, ratio: number): RoutePoint {
  return {
    longitude: from.longitude + (to.longitude - from.longitude) * ratio,
    latitude: from.latitude + (to.latitude - from.latitude) * ratio,
  };
}

/**
 * Point situe a `ratio` du parcours le long d'une polyligne.
 *
 * Utilise pendant la course : le vehicule doit rester SUR le trace affiche,
 * pas couper a vol d'oiseau entre le depart et la destination.
 */
function alongPath(path: RoutePoint[], ratio: number): DriverPosition | null {
  if (path.length < 2) return null;

  // Longueur cumulee : calculee a chaque appel plutot que memorisee, car un
  // itineraire ne fait que quelques centaines de points et le calcul est
  // negligeable devant le rendu de la carte.
  const lengths: number[] = [];
  let total = 0;

  for (let i = 0; i < path.length - 1; i += 1) {
    const dLng =
      (path[i + 1].longitude - path[i].longitude) *
      Math.cos((path[i].latitude * Math.PI) / 180);
    const dLat = path[i + 1].latitude - path[i].latitude;
    const length = Math.hypot(dLng, dLat);
    lengths.push(length);
    total += length;
  }

  if (total === 0) return { ...path[0], bearing: 0 };

  let travelled = total * Math.min(Math.max(ratio, 0), 1);

  for (let i = 0; i < lengths.length; i += 1) {
    if (travelled <= lengths[i] || i === lengths.length - 1) {
      const segmentRatio = lengths[i] === 0 ? 0 : travelled / lengths[i];
      return {
        ...interpolate(path[i], path[i + 1], Math.min(segmentRatio, 1)),
        bearing: bearingBetween(path[i], path[i + 1]),
      };
    }
    travelled -= lengths[i];
  }

  return { ...path[path.length - 1], bearing: 0 };
}

/**
 * Fait avancer le marqueur du chauffeur selon le statut de la course.
 *
 * - `accepted` : du point de depart du chauffeur vers le passager, en ligne
 *   directe. L'approche est courte et ne justifie pas un second appel au
 *   service de routage — le quota est limite a 2 000 requetes/jour (R12).
 * - `in_progress` : le long de l'itineraire deja calcule, vers la destination.
 * - autres statuts : le chauffeur est immobile la ou il se trouve.
 *
 * @param ride course en cours, `null` si aucune
 * @param passenger point de prise en charge
 * @param routePoints itineraire de la course, deja trace sur la carte
 */
export function useDriverApproach(
  ride: Ride | null,
  passenger: RoutePoint,
  routePoints: RoutePoint[],
): DriverPosition | null {
  const [position, setPosition] = useState<DriverPosition | null>(null);

  // Lus dans l'intervalle sans le relancer : la position GPS du passager change
  // en permanence, et redemarrer l'animation a chaque rafraichissement ferait
  // repartir le vehicule de son point de depart.
  const passengerRef = useRef(passenger);
  passengerRef.current = passenger;

  const routeRef = useRef(routePoints);
  routeRef.current = routePoints;

  const status = ride?.status ?? null;
  const originLng = ride?.driverOrigin?.longitude ?? null;
  const originLat = ride?.driverOrigin?.latitude ?? null;

  useEffect(() => {
    if (status === null || originLng === null || originLat === null) {
      setPosition(null);
      return;
    }

    const origin = { longitude: originLng, latitude: originLat };

    if (status === 'accepted') {
      const startedAt = Date.now();

      const tick = () => {
        const ratio = Math.min(
          (Date.now() - startedAt) / RIDE_TIMINGS.approach,
          1,
        );
        const target = passengerRef.current;
        setPosition({
          ...interpolate(origin, target, ratio),
          bearing: bearingBetween(origin, target),
        });
      };

      tick();
      const timer = setInterval(tick, TICK_MS);
      return () => clearInterval(timer);
    }

    if (status === 'arrived') {
      // Immobile au point de prise en charge, tourne vers la destination.
      const target = routeRef.current[1] ?? passengerRef.current;
      setPosition({
        ...passengerRef.current,
        bearing: bearingBetween(passengerRef.current, target),
      });
      return;
    }

    if (status === 'in_progress') {
      const startedAt = Date.now();

      const tick = () => {
        const ratio = Math.min((Date.now() - startedAt) / RIDE_TIMINGS.trip, 1);
        const next = alongPath(routeRef.current, ratio);
        if (next !== null) setPosition(next);
      };

      tick();
      const timer = setInterval(tick, TICK_MS);
      return () => clearInterval(timer);
    }

    if (status === 'completed') {
      const last = routeRef.current[routeRef.current.length - 1];
      if (last) setPosition({ ...last, bearing: 0 });
      return;
    }

    setPosition(null);
  }, [status, originLng, originLat]);

  return position;
}
