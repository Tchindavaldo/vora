/**
 * Securite du passager pendant la course (R10, brief §10).
 *
 * ⚠️ SIMULE. Aucun backend n'existe encore : l'alerte d'urgence et le
 * signalement imitent la latence d'un `POST /rides/:id/alert` et
 * `POST /rides/:id/report`, puis journalisent. Rien n'est reellement transmis,
 * et chaque ecran le dit (brief §23). C'est le SEUL fichier a remplacer quand
 * l'API arrivera — l'UI n'a pas a changer.
 *
 * Service pur, sans rendu : partage entre ecrans (R16).
 */

import type { RoutePoint } from './routing';
import type { Ride } from './rides';

/**
 * Contact prevenu en cas d'alerte.
 *
 * De demonstration tant que le profil n'existe pas : en production, le passager
 * enregistre ses contacts a l'inscription et le backend les rattache a son
 * compte. Jamais de numero code en dur dans un composant (R9).
 */
export type EmergencyContact = {
  id: string;
  name: string;
  /** Lien au passager, affiche pour le distinguer d'un homonyme. */
  relation: string;
  phone: string;
};

export const DEMO_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'c-1',
    name: 'Marie Tchinda',
    relation: 'Sœur',
    phone: '+237690000011',
  },
  {
    id: 'c-2',
    name: 'Police secours',
    relation: 'Services d’urgence',
    phone: '117',
  },
];

/**
 * Assistance VORA, joignable a tout moment pendant la course.
 *
 * Numero de demonstration : il viendra de la configuration d'environnement
 * quand le backend existera (R9).
 */
export const SUPPORT_PHONE = '+237690000000';

/**
 * Motifs de signalement d'un chauffeur.
 *
 * Une liste fermee plutot qu'un champ libre seul : elle se traite
 * automatiquement cote back-office, et elle evite au passager de formuler
 * lui-meme un fait desagreable. Le commentaire libre reste possible en plus.
 */
export type ReportReason =
  | 'dangerous_driving'
  | 'inappropriate_behavior'
  | 'vehicle_mismatch'
  | 'overcharging'
  | 'other';

export const REPORT_REASONS: ReportReason[] = [
  'dangerous_driving',
  'inappropriate_behavior',
  'vehicle_mismatch',
  'overcharging',
  'other',
];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  dangerous_driving: 'Conduite dangereuse',
  inappropriate_behavior: 'Comportement déplacé',
  vehicle_mismatch: 'Véhicule non conforme',
  overcharging: 'Tarif abusif',
  other: 'Autre',
};

/** Longueur maximale du commentaire, alignee sur ce qu'un backend accepterait. */
export const REPORT_MAX_LENGTH = 500;

export type ReportInput = {
  rideId: string;
  driverId: string;
  reason: ReportReason;
  /** Precision libre, facultative : `null` quand le passager n'ecrit rien. */
  details: string | null;
};

export type EmergencyAlertInput = {
  rideId: string;
  driverId: string | null;
  /** Position au moment de l'alerte, `null` si la geoloc est indisponible (R8). */
  coords: RoutePoint | null;
  /** Contacts qui seraient prevenus. */
  contactIds: string[];
};

const ALERT_DELAY_MS = 600;
const REPORT_DELAY_MS = 700;

/**
 * Declenche l'alerte d'urgence.
 *
 * Rejette en cas d'echec : l'appelant doit afficher un message et proposer de
 * reessayer (R8) — une alerte qui echoue en silence est pire que pas d'alerte.
 */
export async function sendEmergencyAlert(
  input: EmergencyAlertInput,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ALERT_DELAY_MS));

  console.log('[safety] alerte simulee envoyee', input);
}

/**
 * Envoie un signalement sur le chauffeur.
 *
 * Rejette en cas d'echec, comme l'alerte : le passager doit savoir si son
 * signalement est parti (R8).
 */
export async function submitReport(input: ReportInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, REPORT_DELAY_MS));

  console.log('[safety] signalement simule envoye', input);
}

/**
 * Construit le signalement a partir de la course.
 *
 * Renvoie `null` si la course n'a pas de chauffeur : il n'y a alors personne a
 * signaler, et l'ecran ne doit pas s'ouvrir.
 */
export function buildReport(
  ride: Ride,
  reason: ReportReason,
  details: string,
): ReportInput | null {
  if (ride.driver === null) return null;

  const trimmed = details.trim();

  return {
    rideId: ride.id,
    driverId: ride.driver.id,
    reason,
    details: trimmed.length === 0 ? null : trimmed,
  };
}

/**
 * Message envoye aux contacts d'urgence.
 *
 * Il porte tout ce qui permet d'agir : le vehicule a chercher, la destination
 * et la position. Un simple "au secours" n'aiderait personne.
 */
export function alertMessage(ride: Ride, coords: RoutePoint | null): string {
  const vehicle =
    ride.driver === null
      ? 'Chauffeur inconnu'
      : `${ride.driver.name}, ${ride.driver.vehicleModel} (${ride.driver.plate})`;

  const position =
    coords === null
      ? 'Position indisponible.'
      : `Position : https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;

  return (
    `URGENCE VORA — je suis en course vers ${ride.destinationLabel}. ` +
    `${vehicle}. ${position}`
  );
}
