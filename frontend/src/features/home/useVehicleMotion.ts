import { useEffect, useRef, useState } from 'react';

import type { Coordinates, RoadPoint } from '../../services/roads';

/**
 * Deplacement des vehicules de demonstration le long de leur rue.
 *
 * Une carte de mobilite dont les vehicules sont figes se lit immediatement
 * comme une maquette. On les fait donc rouler sur le trace reel de leur voie,
 * fourni par le service `roads`.
 *
 * En production ce hook disparait : les positions arriveront par socket depuis
 * le GPS des chauffeurs.
 */

/** Etat affiche d'un vehicule : ou il est, et vers ou il pointe. */
export type VehicleMotion = Coordinates & {
  /** Cap en degres, 0 = nord. */
  bearing: number;
};

/**
 * Rythme de rafraichissement. 120 ms suffit a donner une impression de
 * fluidite sans reveiller le thread JS soixante fois par seconde, ce qui
 * coute cher sur les telephones d'entree de gamme vises par le projet.
 */
const TICK_MS = 120;

/**
 * Vitesse de parcours, en degres de latitude par seconde.
 *
 * Volontairement lente : a l'echelle d'un quartier affiche a l'ecran, un
 * deplacement realiste (50 km/h) traverserait la vue en quelques secondes et
 * les vehicules disparaitraient. On vise le mouvement perceptible, pas la
 * simulation physique.
 */
const SPEED_PER_SECOND = 0.00012;

/** Metres approximatifs, pour comparer des distances entre coordonnees. */
function distanceBetween(from: Coordinates, to: Coordinates): number {
  const dLat = to.latitude - from.latitude;
  const dLng =
    (to.longitude - from.longitude) *
    Math.cos((from.latitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function bearingBetween(from: Coordinates, to: Coordinates): number {
  const toRad = Math.PI / 180;
  const dLng =
    (to.longitude - from.longitude) * Math.cos(from.latitude * toRad);
  const dLat = to.latitude - from.latitude;
  return (Math.atan2(dLng, dLat) / toRad + 360) % 360;
}

/**
 * Progression d'un vehicule sur son trace.
 *
 * On memorise l'index du segment courant et l'avancement dedans, plutot qu'une
 * distance totale : cela evite de reparcourir le trace a chaque image.
 */
type Progress = {
  path: Coordinates[];
  /** Segment courant : du point `at` au point `at + 1`. */
  at: number;
  /** Avancement dans le segment courant, de 0 a 1. */
  ratio: number;
  /** Sens de parcours : le vehicule fait des aller-retours sur sa rue. */
  forward: boolean;
};

function initialProgress(point: RoadPoint): Progress {
  // On demarre le vehicule la ou le service l'a place, pas au debut de la rue :
  // sinon tous les vehicules se retrouveraient aux extremites du quartier.
  const at = Math.max(
    0,
    point.path.findIndex(
      (node) =>
        node.longitude === point.longitude && node.latitude === point.latitude,
    ),
  );

  return {
    path: point.path,
    at: Math.min(at, Math.max(0, point.path.length - 2)),
    ratio: 0,
    forward: true,
  };
}

/**
 * Fait avancer une progression de `step` (en degres) le long de son trace.
 *
 * Arrive au bout de la rue, le vehicule repart en sens inverse : une voie
 * ouverte n'a pas de boucle, et le faire disparaitre serait pire.
 */
function advance(progress: Progress, step: number): Progress {
  const { path } = progress;
  if (path.length < 2) return progress;

  let { at, ratio, forward } = progress;
  let remaining = step;

  // Boucle bornee : un pas ne doit jamais consommer plus que le trace entier,
  // et sans borne une rue aux points confondus tournerait a l'infini.
  for (let guard = 0; guard < path.length * 2 && remaining > 0; guard += 1) {
    const from = path[at];
    const to = path[at + 1];
    const length = distanceBetween(from, to);

    if (length === 0) {
      // Deux noeuds identiques : on saute le segment.
      ratio = 0;
      if (forward) {
        if (at + 2 < path.length) at += 1;
        else forward = false;
      } else if (at > 0) at -= 1;
      else forward = true;
      continue;
    }

    const left = forward ? (1 - ratio) * length : ratio * length;

    if (remaining < left) {
      const delta = remaining / length;
      ratio += forward ? delta : -delta;
      remaining = 0;
      break;
    }

    // On termine le segment et on passe au suivant.
    remaining -= left;

    if (forward) {
      if (at + 2 < path.length) {
        at += 1;
        ratio = 0;
      } else {
        // Bout de la rue : demi-tour.
        forward = false;
        ratio = 1;
      }
    } else if (at > 0) {
      at -= 1;
      ratio = 1;
    } else {
      forward = true;
      ratio = 0;
    }
  }

  return { path, at, ratio, forward };
}

/** Position et cap correspondant a une progression. */
function positionOf(progress: Progress): VehicleMotion {
  const { path, at, ratio, forward } = progress;
  const from = path[at];
  const to = path[at + 1] ?? from;

  const position = {
    longitude: from.longitude + (to.longitude - from.longitude) * ratio,
    latitude: from.latitude + (to.latitude - from.latitude) * ratio,
  };

  // Le vehicule pointe dans son sens de marche : en marche arriere sur le
  // trace, le cap est celui du segment inverse.
  const bearing = forward
    ? bearingBetween(from, to)
    : bearingBetween(to, from);

  return { ...position, bearing };
}

/**
 * Anime les vehicules le long de leurs rues.
 *
 * @param points positions initiales, ou `null` tant qu'elles sont inconnues
 * @returns un etat par vehicule, dans le meme ordre que `points`
 */
export function useVehicleMotion(points: RoadPoint[] | null): VehicleMotion[] {
  const [motions, setMotions] = useState<VehicleMotion[]>([]);
  const progressRef = useRef<Progress[]>([]);

  useEffect(() => {
    if (!points || points.length === 0) {
      progressRef.current = [];
      setMotions([]);
      return;
    }

    // Un vehicule sans trace exploitable reste immobile a sa position : mieux
    // vaut un marqueur fixe qu'un marqueur qui derive hors de la chaussee.
    const movable = points.filter((point) => point.path.length >= 2);

    progressRef.current = points.map(initialProgress);
    setMotions(points.map((point) => ({ ...point })));

    if (movable.length === 0) return;

    const step = SPEED_PER_SECOND * (TICK_MS / 1000);

    const timer = setInterval(() => {
      progressRef.current = progressRef.current.map((progress) =>
        progress.path.length >= 2 ? advance(progress, step) : progress,
      );

      setMotions(
        progressRef.current.map((progress, index) =>
          progress.path.length >= 2
            ? positionOf(progress)
            : { ...points[index] },
        ),
      );
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [points]);

  return motions;
}
