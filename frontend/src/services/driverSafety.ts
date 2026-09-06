/**
 * Securite du CHAUFFEUR pendant la course (R10, brief §10.3).
 *
 * ⚠️ SIMULE. Aucun backend n'existe encore : l'alerte d'urgence et le
 * signalement imitent la latence d'un `POST /driver/rides/:id/alert` et
 * `POST /driver/rides/:id/report`, puis journalisent. Rien n'est reellement
 * transmis, et chaque ecran le dit (brief §23). C'est le SEUL fichier a
 * remplacer quand l'API arrivera — l'UI n'a pas a changer.
 *
 * Copie dediee de `services/safety.ts` (cote passager) : meme forme, mais les
 * motifs, les destinataires et l'assistance sont ceux du chauffeur. Les deux
 * ne peuvent pas partager une liste de motifs sans se contredire — on signale
 * un passager pour d'autres faits qu'un chauffeur.
 */

import type { RoutePoint } from './routing';
import type { DriverRideRequest } from '../features/driver/driverRequests';

/**
 * Contact prevenu quand le chauffeur declenche son alerte.
 *
 * De demonstration tant que le backend n'existe pas : en production, le
 * chauffeur les enregistre a son inscription. Jamais de numero code en dur
 * dans un composant (R9).
 */
export type DriverEmergencyContact = {
  id: string;
  name: string;
  /** Lien au chauffeur, affiche pour le distinguer d'un homonyme. */
  relation: string;
  phone: string;
};

export const DEMO_DRIVER_EMERGENCY_CONTACTS: DriverEmergencyContact[] = [
  {
    id: 'dc-1',
    name: 'Estelle Mbarga',
    relation: 'Épouse',
    phone: '+237690000021',
  },
  {
    id: 'dc-2',
    name: 'Police secours',
    relation: 'Services d’urgence',
    phone: '117',
  },
];

/**
 * Assistance chauffeur VORA, distincte de l'assistance passager : ce sont deux
 * files differentes cote support, et un chauffeur en difficulte ne doit pas
 * attendre derriere des demandes de course.
 *
 * Numero de demonstration : il viendra de la configuration d'environnement
 * quand le backend existera (R9).
 */
export const DRIVER_SUPPORT_PHONE = '+237690000001';

/**
 * Motifs de signalement d'un passager (brief §10.3).
 *
 * Liste fermee, comme cote passager : elle se traite automatiquement en
 * back-office et evite au chauffeur de formuler lui-meme un fait desagreable.
 */
export type DriverReportReason =
  | 'aggressive_behavior'
  | 'refused_payment'
  | 'vehicle_damage'
  | 'no_show'
  | 'other';

export const DRIVER_REPORT_REASONS: DriverReportReason[] = [
  'aggressive_behavior',
  'refused_payment',
  'vehicle_damage',
  'no_show',
  'other',
];

export const DRIVER_REPORT_REASON_LABELS: Record<DriverReportReason, string> = {
  aggressive_behavior: 'Comportement agressif',
  refused_payment: 'Refus de paiement',
  vehicle_damage: 'Dégradation du véhicule',
  no_show: 'Passager absent',
  other: 'Autre',
};

/** Longueur maximale du commentaire, alignee sur ce qu'un backend accepterait. */
export const DRIVER_REPORT_MAX_LENGTH = 500;

export type DriverReportInput = {
  rideId: string;
  reason: DriverReportReason;
  /** Precision libre, facultative : `null` quand le chauffeur n'ecrit rien. */
  details: string | null;
};

export type DriverAlertInput = {
  rideId: string | null;
  /** Position au moment de l'alerte, `null` si la geoloc est indisponible (R8). */
  coords: RoutePoint | null;
  /** Contacts qui seraient prevenus. */
  contactIds: string[];
};

const ALERT_DELAY_MS = 600;
const REPORT_DELAY_MS = 700;

/**
 * Declenche l'alerte d'urgence du chauffeur.
 *
 * Rejette en cas d'echec : l'appelant doit afficher un message et laisser
 * l'appel direct accessible (R8) — une alerte qui echoue en silence est pire
 * que pas d'alerte.
 */
export async function sendDriverAlert(input: DriverAlertInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ALERT_DELAY_MS));

  console.log('[driver-safety] alerte simulee envoyee', input);
}

/**
 * Envoie un signalement sur le passager.
 *
 * Rejette en cas d'echec, comme l'alerte : le chauffeur doit savoir si son
 * signalement est parti (R8).
 */
export async function submitDriverReport(
  input: DriverReportInput,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, REPORT_DELAY_MS));

  console.log('[driver-safety] signalement simule envoye', input);
}

/**
 * Construit le signalement a partir de la course en cours.
 *
 * Renvoie `null` sans course : il n'y a alors personne a signaler, et l'ecran
 * ne doit pas s'ouvrir.
 */
export function buildDriverReport(
  request: DriverRideRequest | null,
  reason: DriverReportReason,
  details: string,
): DriverReportInput | null {
  if (request === null) return null;

  const trimmed = details.trim();

  return {
    rideId: request.id,
    reason,
    details: trimmed.length === 0 ? null : trimmed,
  };
}

/**
 * Message envoye aux contacts d'urgence du chauffeur.
 *
 * Il porte de quoi agir : le trajet en cours et la position. Hors course, il
 * reste utile — un chauffeur peut etre en danger sans passager a bord.
 */
export function driverAlertMessage(
  request: DriverRideRequest | null,
  coords: RoutePoint | null,
): string {
  const trip =
    request === null
      ? 'Je ne suis pas en course.'
      : `Course en cours vers ${request.destinationLabel}.`;

  const position =
    coords === null
      ? 'Position indisponible.'
      : `Position : https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;

  return `URGENCE VORA — je suis chauffeur et j’ai besoin d’aide. ${trip} ${position}`;
}
