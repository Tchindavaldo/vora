/**
 * Estimation du prix d'une course (R17 etape 5).
 *
 * ⚠️ TARIFS DE DEMONSTRATION. La grille ci-dessous est calquee sur les prix
 * pratiques a Douala, mais elle est calculee ici, dans l'application. En
 * production le prix vient du backend : un tarif calcule cote client est
 * modifiable par l'utilisateur, et doit rester identique pour les deux parties
 * de la course. Ne pas presenter ces montants comme fermes au jury (brief §23).
 *
 * Service pur, sans rendu ni etat : partage entre ecrans (R16).
 */

export type VehicleTier = 'moto' | 'eco' | 'comfort';

export type Fare = {
  tier: VehicleTier;
  /** Montant arrondi, en francs CFA. */
  amountXaf: number;
  /** Duree annoncee, en minutes. */
  durationMinutes: number;
};

/**
 * Grille tarifaire par categorie.
 *
 * `base` couvre la prise en charge, `perKm` la distance, `perMinute` le temps
 * passe (embouteillages de Douala : une course courte mais lente coute au
 * chauffeur autant qu'une course longue et fluide). `minimum` evite les
 * courses a perte sur quelques centaines de metres.
 */
const TARIFFS: Record<
  VehicleTier,
  { base: number; perKm: number; perMinute: number; minimum: number }
> = {
  moto: { base: 200, perKm: 120, perMinute: 15, minimum: 300 },
  eco: { base: 500, perKm: 250, perMinute: 30, minimum: 800 },
  comfort: { base: 900, perKm: 400, perMinute: 45, minimum: 1500 },
};

/** Libelles affiches. Ils doivent rester ceux des marqueurs de la carte. */
export const TIER_LABELS: Record<VehicleTier, string> = {
  moto: 'Moto',
  eco: 'Eco',
  comfort: 'Confort',
};

/** Ordre d'affichage : du moins cher au plus cher. */
export const TIERS: VehicleTier[] = ['moto', 'eco', 'comfort'];

/**
 * Estime le prix d'une categorie pour un trajet donne.
 *
 * Le montant est arrondi a 50 F : personne ne rend la monnaie a l'unite, et un
 * prix affiche a 1 337 F paraitrait calcule par une machine plutot que
 * pratique.
 */
export function estimateFare(
  tier: VehicleTier,
  distanceMeters: number,
  durationSeconds: number,
): Fare {
  const tariff = TARIFFS[tier];
  const km = distanceMeters / 1000;
  const minutes = durationSeconds / 60;

  const raw = tariff.base + km * tariff.perKm + minutes * tariff.perMinute;
  const amountXaf = Math.max(tariff.minimum, roundTo(raw, 50));

  return {
    tier,
    amountXaf,
    // Une duree annoncee a la seconde serait fausse des le premier feu rouge.
    durationMinutes: Math.max(1, Math.round(minutes)),
  };
}

/** Estime toutes les categories, dans l'ordre d'affichage. */
export function estimateAllFares(
  distanceMeters: number,
  durationSeconds: number,
): Fare[] {
  return TIERS.map((tier) => estimateFare(tier, distanceMeters, durationSeconds));
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** "1 250 F" — espace insecable fine pour que le montant ne se coupe pas. */
export function formatXaf(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/ |\s/g, ' ')} F`;
}

/** "3,4 km" en dessous de 10 km, "12 km" au-dela. */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}
