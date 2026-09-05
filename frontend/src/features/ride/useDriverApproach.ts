import { useEffect, useRef, useState } from 'react';

import type { RoutePoint } from '../../services/routing';
import { RIDE_TIMINGS, type Ride } from '../../services/rides';

/**
 * Position affichee du chauffeur pendant l'approche puis pendant la course.
 *
 * ⚠️ SIMULE, comme `services/rides.ts` : le marqueur avance a cadence fixe le
 * long d'un trace deja calcule. En production ce hook disparait — les positions
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

/** Longueur approximative d'un segment, en degres corriges de la latitude. */
function segmentLength(from: RoutePoint, to: RoutePoint): number {
  const dLng =
    (to.longitude - from.longitude) * Math.cos((from.latitude * Math.PI) / 180);
  return Math.hypot(dLng, to.latitude - from.latitude);
}

/**
 * Point situe a `ratio` (0 a 1) du parcours le long d'une polyligne, avec le
 * cap du segment courant.
 *
 * C'est ce qui garde le vehicule SUR la chaussee et PARALLELE a elle : couper a
 * vol d'oiseau le ferait traverser les batiments, et un cap calcule entre le
 * depart et l'arrivee le laisserait de travers dans chaque virage.
 */
function alongPath(path: RoutePoint[], ratio: number): DriverPosition | null {
  if (path.length === 0) return null;
  if (path.length === 1) return { ...path[0], bearing: 0 };

  const lengths: number[] = [];
  let total = 0;

  for (let i = 0; i < path.length - 1; i += 1) {
    const length = segmentLength(path[i], path[i + 1]);
    lengths.push(length);
    total += length;
  }

  if (total === 0) return { ...path[0], bearing: 0 };

  let travelled = total * Math.min(Math.max(ratio, 0), 1);

  for (let i = 0; i < lengths.length; i += 1) {
    if (travelled <= lengths[i] || i === lengths.length - 1) {
      const segmentRatio =
        lengths[i] === 0 ? 0 : Math.min(travelled / lengths[i], 1);
      const from = path[i];
      const to = path[i + 1];

      return {
        longitude: from.longitude + (to.longitude - from.longitude) * segmentRatio,
        latitude: from.latitude + (to.latitude - from.latitude) * segmentRatio,
        bearing: bearingBetween(from, to),
      };
    }
    travelled -= lengths[i];
  }

  return { ...path[path.length - 1], bearing: 0 };
}

/**
 * Fait avancer le marqueur du chauffeur selon le statut de la course.
 *
 * - `accepted` : le long de l'itineraire d'approche calcule par ORS.
 * - `arrived` : immobile au point de prise en charge, tourne vers la
 *   destination.
 * - `in_progress` : le long de l'itineraire de la course.
 * - `completed` : a destination.
 *
 * @param ride course en cours, `null` si aucune
 * @param approachPoints itineraire du chauffeur vers le passager
 * @param routePoints itineraire de la course, deja trace sur la carte
 */
export function useDriverApproach(
  ride: Ride | null,
  approachPoints: RoutePoint[],
  routePoints: RoutePoint[],
): DriverPosition | null {
  const [position, setPosition] = useState<DriverPosition | null>(null);

  // Lu dans l'intervalle sans le relancer : sinon l'animation repartirait de
  // zero au moindre nouveau rendu.
  const routeRef = useRef(routePoints);
  routeRef.current = routePoints;

  const status = ride?.status ?? null;

  // Le trace d'approche est fige une fois calcule : sa longueur suffit a savoir
  // s'il est disponible, et evite de dependre du tableau lui-meme (recree a
  // chaque rendu).
  const approachRef = useRef(approachPoints);
  approachRef.current = approachPoints;
  const approachLength = approachPoints.length;

  useEffect(() => {
    if (status === null) {
      setPosition(null);
      return;
    }

    if (status === 'accepted') {
      // Pas encore de trace : aucun vehicule affiche plutot qu'un vehicule pose
      // hors de la chaussee, qui sauterait sur la route des son arrivee.
      if (approachLength < 2) {
        setPosition(null);
        return;
      }

      const startedAt = Date.now();

      const tick = () => {
        const ratio = Math.min(
          (Date.now() - startedAt) / RIDE_TIMINGS.approach,
          1,
        );
        const next = alongPath(approachRef.current, ratio);
        if (next !== null) setPosition(next);
      };

      tick();
      const timer = setInterval(tick, TICK_MS);
      return () => clearInterval(timer);
    }

    if (status === 'arrived') {
      const pickup =
        approachRef.current[approachRef.current.length - 1] ?? ride?.pickup;
      if (!pickup) return;

      // Deja tourne vers la suite du trajet : le vehicule attend dans le bon
      // sens, comme un vrai chauffeur range le long du trottoir.
      const target = routeRef.current[1] ?? routeRef.current[0] ?? pickup;
      setPosition({ ...pickup, bearing: bearingBetween(pickup, target) });
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
    // `ride.pickup` est fige a la commande : le lire dans l'effet ne justifie
    // pas de le relancer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, approachLength]);

  return position;
}
