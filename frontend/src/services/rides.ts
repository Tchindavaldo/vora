/**
 * Cycle de vie d'une course : creation, recherche de chauffeur, approche,
 * trajet, fin (R17 etapes 6 a 8).
 *
 * ⚠️ SIMULE. Aucun backend n'existe encore : ce fichier imite le comportement
 * attendu du serveur — creation de la course, acceptation par un chauffeur,
 * puis progression des statuts — pour que le parcours passager soit jouable de
 * bout en bout. Il est le SEUL endroit a remplacer quand l'API arrivera :
 * `createRide` deviendra `POST /rides`, et `subscribeToRideStatus` un
 * abonnement socket (R6, SocketContext). L'UI n'a pas a changer.
 *
 * Ne jamais presenter ces chauffeurs comme reels au jury (brief §23, R13) :
 * chaque panneau porte la mention "simule".
 */

import type { VehicleTier } from './pricing';
import type { RoutePoint } from './routing';

/**
 * Etats successifs d'une course.
 *
 * `searching` recherche d'un chauffeur · `accepted` il vient vers vous ·
 * `arrived` il attend au point de depart · `in_progress` course en cours ·
 * `completed` terminee · `cancelled` abandonnee.
 */
export type RideStatus =
  | 'searching'
  | 'accepted'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type Driver = {
  id: string;
  name: string;
  /** Note sur 5, telle que renvoyee par le backend. */
  rating: number;
  ridesCount: number;
  vehicleModel: string;
  /** Plaque d'immatriculation, affichee pour identifier le vehicule (R10). */
  plate: string;
  /** Photo du chauffeur ; `null` = afficher son initiale a la place. */
  photoUrl: string | null;
  phone: string;
};

export type Ride = {
  id: string;
  status: RideStatus;
  tier: VehicleTier;
  destinationLabel: string;
  amountXaf: number;
  driver: Driver | null;
  /** Minutes avant l'arrivee du chauffeur au point de depart. */
  etaMinutes: number | null;
  /**
   * Position d'ou le chauffeur demarre son approche. `null` tant qu'aucun
   * chauffeur n'a accepte. En production, elle viendra du GPS du chauffeur,
   * rafraichie par socket.
   */
  driverOrigin: RoutePoint | null;
  /**
   * Point de prise en charge, FIGE a la commande.
   *
   * Le GPS du passager bouge de quelques metres en permanence : recalculer
   * l'approche a chaque rafraichissement viderait le quota de routage et ferait
   * clignoter le trace.
   */
  pickup: RoutePoint;
};

export type CreateRideInput = {
  origin: RoutePoint;
  destination: RoutePoint;
  destinationLabel: string;
  tier: VehicleTier;
  amountXaf: number;
};

/** Chauffeurs de demonstration, un par categorie de vehicule. */
const DEMO_DRIVERS: Record<VehicleTier, Driver> = {
  moto: {
    id: 'd-moto-1',
    name: 'Alain Mbarga',
    rating: 4.8,
    ridesCount: 1240,
    vehicleModel: 'Sanili 125',
    plate: 'LT 4821 AB',
    photoUrl: null,
    phone: '+237600000001',
  },
  eco: {
    id: 'd-eco-1',
    name: 'Rachelle Ndongo',
    rating: 4.9,
    ridesCount: 860,
    vehicleModel: 'Toyota Corolla',
    plate: 'CE 2094 XY',
    photoUrl: null,
    phone: '+237600000002',
  },
  comfort: {
    id: 'd-comfort-1',
    name: 'Serge Etoundi',
    rating: 5,
    ridesCount: 412,
    vehicleModel: 'Toyota Prado',
    plate: 'LT 7730 CD',
    photoUrl: null,
    phone: '+237600000003',
  },
};

/**
 * Rythme de la demonstration, en millisecondes.
 *
 * Chaque palier est assez long pour se voir et se comprendre pendant la
 * soutenance, assez court pour que le jury voie la course entiere sans
 * attendre. En production ces transitions viennent du chauffeur.
 */
const TIMINGS = {
  /** Latence de creation, pour que l'etat d'attente ne clignote pas. */
  create: 500,
  /** Delai avant qu'un chauffeur accepte. */
  accept: 3500,
  /** Duree de l'approche : le marqueur avance vers le passager. */
  approach: 20000,
  /**
   * Attente au point de depart avant que la course demarre.
   *
   * Court : le trajet est deja calcule a cet instant, donc toute attente plus
   * longue se lit comme une latence de l'application alors qu'elle ne
   * represente que la montee a bord. 2,5 s suffisent a lire "Votre chauffeur
   * est arrive".
   */
  boarding: 2500,
  /** Duree du trajet lui-meme. */
  trip: 25000,
} as const;

export const RIDE_TIMINGS = TIMINGS;

/**
 * Distance a laquelle le chauffeur demarre son approche, en degres.
 *
 * ~600 m : la distance d'un chauffeur du meme quartier, et une longueur ou le
 * deplacement du marqueur reste visible a l'echelle affichee.
 */
const APPROACH_DISTANCE = 0.0055;

/**
 * Cree la course cote serveur. Renvoie immediatement l'objet en recherche :
 * les changements de statut arrivent ensuite par `subscribeToRideStatus`, comme
 * le fera le socket.
 */
export async function createRide(input: CreateRideInput): Promise<Ride> {
  await new Promise((resolve) => setTimeout(resolve, TIMINGS.create));

  return {
    id: `r-${Date.now()}`,
    status: 'searching',
    tier: input.tier,
    destinationLabel: input.destinationLabel,
    amountXaf: input.amountXaf,
    driver: null,
    etaMinutes: null,
    // Connu DES la creation, et non a l'acceptation : c'est ce qui permet de
    // calculer l'itineraire d'approche pendant la recherche, pour que le trace
    // soit pret a l'instant ou le chauffeur accepte. En production, le backend
    // reserve de la meme facon le chauffeur le plus proche avant de confirmer.
    driverOrigin: driverStartPoint(input.origin, input.destination),
    pickup: input.origin,
  };
}

/**
 * Position de depart du chauffeur : a `APPROACH_DISTANCE` du passager, dans une
 * direction opposee a la destination pour que l'approche ne se confonde pas
 * visuellement avec le trace de la course.
 */
function driverStartPoint(passenger: RoutePoint, destination: RoutePoint): RoutePoint {
  const dLng = destination.longitude - passenger.longitude;
  const dLat = destination.latitude - passenger.latitude;
  const length = Math.hypot(dLng, dLat);

  // Destination confondue avec le depart : direction arbitraire plutot qu'une
  // division par zero.
  if (length === 0) {
    return {
      longitude: passenger.longitude + APPROACH_DISTANCE,
      latitude: passenger.latitude,
    };
  }

  return {
    longitude: passenger.longitude - (dLng / length) * APPROACH_DISTANCE,
    latitude: passenger.latitude - (dLat / length) * APPROACH_DISTANCE,
  };
}

/**
 * Ecoute les changements de statut d'une course.
 *
 * Enchaine les etapes simulees : acceptation, arrivee au point de depart,
 * demarrage, fin. Renvoie la fonction de desabonnement : l'appeler quand le
 * passager annule ou quitte l'ecran, sinon le callback se declencherait sur un
 * composant demonte.
 */
export function subscribeToRideStatus(
  ride: Ride,
  onChange: (ride: Ride) => void,
): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const at = (delay: number, run: () => void) => {
    timers.push(setTimeout(run, delay));
  };

  // 2 a 6 minutes : l'ordre de grandeur d'un chauffeur deja dans le quartier,
  // comme ceux affiches sur la carte d'accueil.
  const etaMinutes = 2 + Math.floor(Math.random() * 5);

  const accepted: Ride = {
    ...ride,
    status: 'accepted',
    driver: DEMO_DRIVERS[ride.tier],
    etaMinutes,
    // `driverOrigin` vient de la creation : le trace d'approche a ete calcule
    // dessus pendant la recherche, le changer ici le rendrait faux.
  };

  at(TIMINGS.accept, () => onChange(accepted));

  at(TIMINGS.accept + TIMINGS.approach, () =>
    onChange({ ...accepted, status: 'arrived', etaMinutes: 0 }),
  );

  at(TIMINGS.accept + TIMINGS.approach + TIMINGS.boarding, () =>
    onChange({ ...accepted, status: 'in_progress', etaMinutes: null }),
  );

  at(
    TIMINGS.accept + TIMINGS.approach + TIMINGS.boarding + TIMINGS.trip,
    () => onChange({ ...accepted, status: 'completed', etaMinutes: null }),
  );

  return () => timers.forEach(clearTimeout);
}

/** Annule la course. Cote backend : `POST /rides/:id/cancel`. */
export async function cancelRide(_ride: Ride): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
}

/** Vrai tant que la course occupe l'ecran (empeche le retour a l'accueil). */
export function isRideActive(ride: Ride | null): boolean {
  return (
    ride !== null &&
    ride.status !== 'completed' &&
    ride.status !== 'cancelled'
  );
}
