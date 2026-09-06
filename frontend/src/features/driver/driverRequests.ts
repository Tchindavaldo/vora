/**
 * Course cote chauffeur : demande entrante puis deroule jusqu'a l'encaissement
 * (R17 etape 9 — innovation).
 *
 * ⚠️ SIMULE. Aucun backend, aucune file de demandes reelle : ce service
 * fabrique une demande de demonstration a partir des memes services que le
 * cote passager (`pricing.ts`, `payment.ts`) pour que les montants affiches
 * ici soient exactement ceux que le passager verrait. Quand l'API existera,
 * ce fichier devient un abonnement socket cote chauffeur (R6, SocketContext) ;
 * les ecrans ne changent pas.
 *
 * L'innovation a demontrer : le chauffeur voit la monnaie a prevoir AVANT
 * d'accepter, pas a la descente.
 */

import { computeCashOffer, type CashOffer, type PaymentMethod } from '../../services/payment';
import { estimateFare, formatXaf, type VehicleTier } from '../../services/pricing';

export type DriverRideRequest = {
  id: string;
  tier: VehicleTier;
  pickupLabel: string;
  destinationLabel: string;
  distanceMeters: number;
  durationMinutes: number;
  /** Ce que le chauffeur encaisse pour cette course. */
  earningsXaf: number;
  method: PaymentMethod;
  /** Monnaie a prevoir. `null` hors paiement en especes. */
  cash: CashOffer | null;
};

/** Etapes d'une course acceptee, jusqu'a l'encaissement. */
export type DriverTripStage = 'to_pickup' | 'arrived' | 'in_progress' | 'completed';

/**
 * Secondes laissees au chauffeur pour repondre a une demande.
 *
 * 15 s : assez court pour creer la tension vue chez Yango/Uber en
 * demonstration, assez long pour que le jury ait le temps de lire l'ecran.
 */
export const REQUEST_TIMEOUT_SECONDS = 15;

/**
 * Trajets de demonstration : de quoi enchainer plusieurs demandes sans jamais
 * repeter exactement le meme cas devant le jury.
 *
 * Libelles GENERIQUES et non des quartiers de Douala fixes : la position
 * reelle du chauffeur peut etre n'importe ou, et un point de prise en charge
 * nomme "Ndokoti" alors qu'il se trouve ailleurs casserait l'illusion d'une
 * demande proche de lui. `pickup`/`destination` restent relatifs a sa
 * position, calcules par l'ecran de course.
 */
const DEMO_TRIPS = [
  {
    pickupLabel: 'À 250 m de vous',
    destinationLabel: 'À 850 m, quartier voisin',
    distanceMeters: 850,
    durationSeconds: 240,
    billXaf: 2000,
  },
  {
    pickupLabel: 'À 180 m de vous',
    destinationLabel: 'À 620 m, quartier voisin',
    distanceMeters: 620,
    durationSeconds: 180,
    billXaf: 5000,
  },
  {
    pickupLabel: 'À 300 m de vous',
    destinationLabel: 'À 900 m, quartier voisin',
    distanceMeters: 900,
    durationSeconds: 260,
    billXaf: 1000,
  },
] as const;

let demoTripIndex = 0;

/**
 * Fabrique une demande entrante de demonstration.
 *
 * Alterne les trajets de `DEMO_TRIPS` a chaque appel : le jury voit plusieurs
 * cas de monnaie (exacte, a rendre, billet juste) sans jamais rejouer deux
 * fois la meme demande d'affilee.
 */
/**
 * Phrase de la monnaie cote CHAUFFEUR : c'est lui qui devra rendre, pas le
 * passager qui devra recevoir. `changeLabel` (services/payment.ts) porte la
 * meme information a la premiere personne du passager — les deux ecrans ne
 * peuvent pas partager un seul libelle sans se contredire l'un l'autre.
 */
export function driverChangeLabel(offer: CashOffer): string {
  if (!offer.isEnough) {
    return 'Cette somme ne couvre pas la course.';
  }
  if (offer.changeXaf === 0) {
    return 'Appoint exact — aucune monnaie à rendre.';
  }
  return `Vous devrez rendre ${formatXaf(offer.changeXaf)}`;
}

export function createDemoRequest(): DriverRideRequest {
  const trip = DEMO_TRIPS[demoTripIndex % DEMO_TRIPS.length];
  demoTripIndex += 1;

  const tier: VehicleTier = 'eco';
  const fare = estimateFare(tier, trip.distanceMeters, trip.durationSeconds);
  const cash = computeCashOffer(fare.amountXaf, trip.billXaf);

  return {
    id: `req-${Date.now()}`,
    tier,
    pickupLabel: trip.pickupLabel,
    destinationLabel: trip.destinationLabel,
    distanceMeters: trip.distanceMeters,
    durationMinutes: fare.durationMinutes,
    earningsXaf: fare.amountXaf,
    method: 'cash',
    cash,
  };
}
