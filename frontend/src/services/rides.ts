/**
 * Creation d'une course et recherche d'un chauffeur (R17 etapes 6 et 7).
 *
 * ⚠️ SIMULE. Aucun backend n'existe encore : ce fichier imite le comportement
 * attendu du serveur (creation de la course, puis acceptation par un chauffeur
 * apres un delai) pour que le parcours passager soit jouable de bout en bout.
 * Il est le SEUL endroit a remplacer quand l'API arrivera : `createRide`
 * deviendra `POST /rides`, et `subscribeToRideStatus` un abonnement socket
 * (R6, SocketContext). L'UI n'a pas a changer.
 *
 * Ne jamais presenter ces chauffeurs comme reels au jury (brief §23, R13) :
 * l'ecran d'attente et la fiche chauffeur portent tous deux la mention
 * "simule".
 */

import type { VehicleTier } from './pricing';
import type { RoutePoint } from './routing';

export type RideStatus = 'searching' | 'accepted' | 'cancelled';

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
 * Delai simule avant qu'un chauffeur accepte.
 *
 * 3,5 s : assez long pour que l'etat d'attente se voie et se comprenne pendant
 * la demo, assez court pour ne pas laisser le jury devant un loader.
 */
const ACCEPT_DELAY_MS = 3500;

/** Latence reseau simulee de la creation, pour que l'attente ne clignote pas. */
const CREATE_DELAY_MS = 500;

/**
 * Cree la course cote serveur. Renvoie immediatement l'objet en recherche :
 * l'acceptation arrive ensuite par `subscribeToRideStatus`, comme le fera le
 * socket.
 */
export async function createRide(input: CreateRideInput): Promise<Ride> {
  await new Promise((resolve) => setTimeout(resolve, CREATE_DELAY_MS));

  return {
    id: `r-${Date.now()}`,
    status: 'searching',
    tier: input.tier,
    destinationLabel: input.destinationLabel,
    amountXaf: input.amountXaf,
    driver: null,
    etaMinutes: null,
  };
}

/**
 * Ecoute les changements de statut d'une course.
 *
 * Renvoie la fonction de desabonnement : l'appeler quand le passager annule ou
 * quitte l'ecran, sinon le callback se declencherait sur un composant demonte.
 */
export function subscribeToRideStatus(
  ride: Ride,
  onChange: (ride: Ride) => void,
): () => void {
  const timer = setTimeout(() => {
    onChange({
      ...ride,
      status: 'accepted',
      driver: DEMO_DRIVERS[ride.tier],
      // 2 a 6 minutes : l'ordre de grandeur d'un chauffeur deja dans le
      // quartier, comme ceux affiches sur la carte d'accueil.
      etaMinutes: 2 + Math.floor(Math.random() * 5),
    });
  }, ACCEPT_DELAY_MS);

  return () => clearTimeout(timer);
}

/** Annule la course. Cote backend : `POST /rides/:id/cancel`. */
export async function cancelRide(_ride: Ride): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
}
