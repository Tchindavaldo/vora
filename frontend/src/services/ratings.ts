/**
 * Evaluation du chauffeur apres la course (R17 etape finale du parcours
 * passager, brief §21).
 *
 * ⚠️ SIMULE. Aucun backend n'existe encore : l'envoi imite la latence d'un
 * `POST /rides/:id/rating` et se contente de journaliser le verdict. C'est le
 * SEUL fichier a remplacer quand l'API arrivera — l'UI n'a pas a changer.
 */

import type { Ride } from './rides';

/** Note en etoiles pleines : le passager n'a pas de demi-etoile a donner. */
export type RatingStars = 1 | 2 | 3 | 4 | 5;

export type RatingInput = {
  rideId: string;
  driverId: string;
  stars: RatingStars;
  /** Commentaire libre, facultatif : `null` quand le passager n'ecrit rien. */
  comment: string | null;
};

/** Longueur maximale du commentaire, alignee sur ce qu'un backend accepterait. */
export const COMMENT_MAX_LENGTH = 280;

/**
 * Libelle affiche sous les etoiles.
 *
 * Une note nue ne dit rien au passager : "3" est-il bon ? Le mot leve le doute
 * et evite les notes donnees au hasard.
 */
export const STAR_LABELS: Record<RatingStars, string> = {
  1: 'Très mauvaise course',
  2: 'Décevante',
  3: 'Correcte',
  4: 'Bonne course',
  5: 'Excellente course',
};

/** Latence simulee de l'envoi, assez courte pour ne pas retenir le passager. */
const SUBMIT_DELAY_MS = 700;

/**
 * Envoie l'evaluation.
 *
 * Rejette en cas d'echec : l'appelant doit afficher un message et proposer de
 * reessayer (R8). Ici la simulation reussit toujours, mais la signature est
 * celle d'un vrai appel reseau pour que le branchement backend ne change rien.
 */
export async function submitRating(input: RatingInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SUBMIT_DELAY_MS));

  console.log('[ratings] evaluation simulee envoyee', input);
}

/**
 * Construit l'evaluation a partir de la course terminee.
 *
 * Renvoie `null` si la course n'a pas de chauffeur : il n'y a alors personne a
 * noter, et l'ecran d'evaluation ne doit pas s'ouvrir.
 */
export function buildRating(
  ride: Ride,
  stars: RatingStars,
  comment: string,
): RatingInput | null {
  if (ride.driver === null) return null;

  const trimmed = comment.trim();

  return {
    rideId: ride.id,
    driverId: ride.driver.id,
    stars,
    comment: trimmed.length === 0 ? null : trimmed,
  };
}
