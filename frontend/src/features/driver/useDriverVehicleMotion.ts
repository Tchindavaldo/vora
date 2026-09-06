import { useEffect, useRef, useState } from 'react';

import type { RoutePoint } from '../../services/routing';
import type { DriverTripStage } from './driverRequests';

/**
 * Position affichee du vehicule du chauffeur pendant sa course (R16).
 *
 * Copie dediee de `useDriverApproach` (feature `ride`, cote passager) : le
 * mouvement est le meme, mais il est pilote ici par l'etape du chauffeur
 * (`DriverTripStage`) et non par le statut d'une course passager. Ajouter ce
 * second pilote au hook passager l'aurait complique pour un cas qu'il ne sert
 * pas.
 *
 * ⚠️ SIMULE : le marqueur avance a cadence fixe le long d'un trace deja
 * calcule. En production, les positions viendront du GPS du telephone du
 * chauffeur et ce hook disparait.
 */
export type DriverVehiclePosition = RoutePoint & {
  /** Cap en degres, 0 = nord. Oriente le vehicule dans son sens de marche. */
  bearing: number;
};

/** Duree du deplacement simule vers le client, puis vers la destination. */
export const DRIVER_LEG_DURATION_MS = {
  toPickup: 12000,
  toDestination: 18000,
};

/**
 * Temps d'arret avant que le vehicule ne se mette en route, a chaque etape.
 *
 * Sans ce delai, les traces apparaissent et la voiture demarre dans la meme
 * image : le chauffeur n'a pas le temps de lire son itineraire, et le
 * mouvement se lit comme un saut.
 *
 * Cale sur le cadrage de `DriverMapCanvas` (~1200 ms) plus une courte pause :
 * la camera a fini de se poser sur le trajet quand le vehicule s'ebranle, et
 * les deux mouvements ne se marchent pas dessus.
 */
const DEPARTURE_DELAY_MS = 1600;

/**
 * Adoucit le depart et l'arrivee (ease-in-out) : une voiture accelere et
 * freine, elle ne passe pas de l'arret a sa vitesse de croisiere d'un coup.
 * C'est ce qui manque le plus a un deplacement lineaire pour paraitre reel.
 */
function ease(ratio: number): number {
  return ratio < 0.5
    ? 2 * ratio * ratio
    : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
}

/** 120 ms : fluide sans reveiller le thread JS soixante fois par seconde. */
const TICK_MS = 120;

function bearingBetween(from: RoutePoint, to: RoutePoint): number {
  const toRad = Math.PI / 180;
  const dLng = (to.longitude - from.longitude) * Math.cos(from.latitude * toRad);
  const dLat = to.latitude - from.latitude;
  return (Math.atan2(dLng, dLat) / toRad + 360) % 360;
}

function segmentLength(from: RoutePoint, to: RoutePoint): number {
  const dLng =
    (to.longitude - from.longitude) * Math.cos((from.latitude * Math.PI) / 180);
  return Math.hypot(dLng, to.latitude - from.latitude);
}

/**
 * Trace mesure une seule fois : un itineraire de ville compte des centaines de
 * points, et remesurer ses segments a chaque image ferait avancer le vehicule
 * par a-coups sur un telephone d'entree de gamme.
 */
type MeasuredPath = {
  points: RoutePoint[];
  lengths: number[];
  total: number;
};

function measurePath(points: RoutePoint[]): MeasuredPath {
  const lengths: number[] = [];
  let total = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    const length = segmentLength(points[i], points[i + 1]);
    lengths.push(length);
    total += length;
  }

  return { points, lengths, total };
}

/**
 * Point situe a `ratio` (0 a 1) du parcours, avec le cap du segment courant :
 * c'est ce qui garde le vehicule SUR la chaussee et PARALLELE a elle.
 */
function alongPath(path: MeasuredPath, ratio: number): DriverVehiclePosition | null {
  const { points, lengths, total } = path;

  if (points.length === 0) return null;
  if (points.length === 1 || total === 0) return { ...points[0], bearing: 0 };

  let travelled = total * Math.min(Math.max(ratio, 0), 1);

  for (let i = 0; i < lengths.length; i += 1) {
    if (travelled <= lengths[i] || i === lengths.length - 1) {
      const segmentRatio = lengths[i] === 0 ? 0 : Math.min(travelled / lengths[i], 1);
      const from = points[i];
      const to = points[i + 1];

      return {
        longitude: from.longitude + (to.longitude - from.longitude) * segmentRatio,
        latitude: from.latitude + (to.latitude - from.latitude) * segmentRatio,
        bearing: bearingBetween(from, to),
      };
    }
    travelled -= lengths[i];
  }

  return { ...points[points.length - 1], bearing: 0 };
}

/**
 * Fait avancer le vehicule du chauffeur selon l'etape de sa course.
 *
 * - `to_pickup` : le long du trace vers le client, des l'acceptation.
 * - `arrived` : immobile sur le client, deja tourne vers la destination.
 * - `in_progress` : le long du trace vers la destination du client.
 * - `completed` : a destination.
 */
export function useDriverVehicleMotion(
  stage: DriverTripStage,
  toPickup: RoutePoint[],
  toDestination: RoutePoint[],
): DriverVehiclePosition | null {
  const [position, setPosition] = useState<DriverVehiclePosition | null>(null);

  // Lus dans l'intervalle sans le relancer : sinon l'animation repartirait de
  // zero au moindre nouveau rendu.
  const pickupRef = useRef(toPickup);
  pickupRef.current = toPickup;
  const destinationRef = useRef(toDestination);
  destinationRef.current = toDestination;

  // Les longueurs suffisent a savoir si un trace est disponible, sans dependre
  // des tableaux eux-memes.
  const pickupLength = toPickup.length;
  const destinationLength = toDestination.length;

  useEffect(() => {
    if (stage === 'to_pickup') {
      // Pas encore de trace : aucun vehicule affiche plutot qu'un vehicule
      // pose hors de la chaussee, qui sauterait sur la route a son arrivee.
      if (pickupLength < 2) {
        setPosition(null);
        return;
      }

      const path = measurePath(pickupRef.current);
      const startedAt = Date.now() + DEPARTURE_DELAY_MS;

      const tick = () => {
        // Ratio negatif pendant le temps d'arret : le vehicule reste pose au
        // depart du trace, visible et immobile.
        const elapsed = Date.now() - startedAt;
        const ratio = Math.min(
          Math.max(elapsed, 0) / DRIVER_LEG_DURATION_MS.toPickup,
          1,
        );
        const next = alongPath(path, ease(ratio));
        if (next !== null) setPosition(next);
      };

      tick();
      const timer = setInterval(tick, TICK_MS);
      return () => clearInterval(timer);
    }

    if (stage === 'arrived') {
      const pickup = pickupRef.current[pickupRef.current.length - 1];
      if (!pickup) return;

      // Deja tourne vers la suite du trajet : le vehicule attend dans le bon
      // sens, comme un vrai chauffeur range le long du trottoir.
      const target = destinationRef.current[1] ?? destinationRef.current[0] ?? pickup;
      setPosition({ ...pickup, bearing: bearingBetween(pickup, target) });
      return;
    }

    if (stage === 'in_progress') {
      if (destinationLength < 2) return;

      const path = measurePath(destinationRef.current);
      const startedAt = Date.now() + DEPARTURE_DELAY_MS;

      const tick = () => {
        const elapsed = Date.now() - startedAt;
        const ratio = Math.min(
          Math.max(elapsed, 0) / DRIVER_LEG_DURATION_MS.toDestination,
          1,
        );
        const next = alongPath(path, ease(ratio));
        if (next !== null) setPosition(next);
      };

      tick();
      const timer = setInterval(tick, TICK_MS);
      return () => clearInterval(timer);
    }

    const last = destinationRef.current[destinationRef.current.length - 1];
    if (last) setPosition({ ...last, bearing: 0 });
  }, [stage, pickupLength, destinationLength]);

  return position;
}
