/**
 * Historique des courses du chauffeur (brief §6, §14).
 *
 * ⚠️ SIMULE, EN MEMOIRE. Distinct de `driverEarnings.ts`, qui ne repond qu'a
 * "combien j'ai gagne AUJOURD'HUI" : ici on repond a "qu'est-ce que j'ai fait
 * cette semaine". Les deux ne se remplacent pas — le premier se lit entre deux
 * courses, le second se consulte le soir ou en fin de semaine.
 *
 * Le service est SEPARE et non un filtre de `driverEarnings` : l'historique
 * viendra d'un endpoint pagine (`GET /driver/rides?from=&to=`) alors que les
 * gains du jour resteront un compteur temps reel. Les fusionner obligerait a
 * charger tout l'historique pour afficher le total du jour.
 *
 * Service pur, sans rendu : partage entre ecrans (R16).
 */

import type { PaymentMethod } from './payment';
import type { VehicleTier } from './pricing';

/** Une course terminee, telle qu'elle apparait dans l'historique. */
export type DriverRide = {
  id: string;
  /** Fin de course, en millisecondes depuis epoch. */
  completedAt: number;
  pickupLabel: string;
  destinationLabel: string;
  tier: VehicleTier;
  distanceMeters: number;
  durationMinutes: number;
  /** Ce que le chauffeur a encaisse, en francs CFA. Fige a l'encaissement. */
  amountXaf: number;
  method: PaymentMethod;
  /** Note laissee par le passager, `null` s'il n'a pas evalue la course. */
  passengerRating: number | null;
};

/** Periode consultable. L'historique complet resterait illisible sur mobile. */
export type DriverRidePeriod = 'week' | 'month';

export const PERIOD_LABELS: Record<DriverRidePeriod, string> = {
  week: '7 derniers jours',
  month: '30 derniers jours',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const PERIOD_DAYS: Record<DriverRidePeriod, number> = {
  week: 7,
  month: 30,
};

/**
 * Courses de demonstration reparties sur le mois, pour que l'ecran ait quelque
 * chose a grouper devant le jury. Les dates sont relatives au lancement de
 * l'app : la demo reste credible quel que soit le jour ou elle est faite.
 */
type DemoRide = Omit<DriverRide, 'id' | 'completedAt'> & {
  /** Jours ecoules depuis aujourd'hui. */
  daysAgo: number;
  /** Heure de fin de course, en heures depuis minuit. */
  hour: number;
};

const DEMO_RIDES: DemoRide[] = [
  { daysAgo: 1, hour: 18, pickupLabel: 'Akwa', destinationLabel: 'Bonanjo', tier: 'eco', distanceMeters: 3800, durationMinutes: 14, amountXaf: 1700, method: 'cash', passengerRating: 5 },
  { daysAgo: 1, hour: 12, pickupLabel: 'Bonamoussadi', destinationLabel: 'Ndokotti', tier: 'eco', distanceMeters: 6400, durationMinutes: 22, amountXaf: 2600, method: 'mobile_money', passengerRating: 4 },
  { daysAgo: 2, hour: 20, pickupLabel: 'Marché Central', destinationLabel: 'Bepanda', tier: 'moto', distanceMeters: 2500, durationMinutes: 9, amountXaf: 900, method: 'cash', passengerRating: null },
  { daysAgo: 2, hour: 9, pickupLabel: 'Deido', destinationLabel: 'Aéroport de Douala', tier: 'comfort', distanceMeters: 11200, durationMinutes: 31, amountXaf: 5200, method: 'wallet', passengerRating: 5 },
  { daysAgo: 3, hour: 17, pickupLabel: 'Logbessou', destinationLabel: 'Akwa', tier: 'eco', distanceMeters: 8900, durationMinutes: 27, amountXaf: 3300, method: 'mobile_money', passengerRating: 4 },
  { daysAgo: 4, hour: 15, pickupLabel: 'Bonapriso', destinationLabel: 'Université de Douala', tier: 'eco', distanceMeters: 5100, durationMinutes: 19, amountXaf: 2100, method: 'cash', passengerRating: 5 },
  { daysAgo: 6, hour: 8, pickupLabel: 'Village', destinationLabel: 'Bonabéri', tier: 'eco', distanceMeters: 7300, durationMinutes: 25, amountXaf: 2800, method: 'cash', passengerRating: 3 },
  { daysAgo: 9, hour: 19, pickupLabel: 'Ndogbong', destinationLabel: 'Akwa', tier: 'moto', distanceMeters: 4100, durationMinutes: 13, amountXaf: 1200, method: 'mobile_money', passengerRating: 5 },
  { daysAgo: 12, hour: 11, pickupLabel: 'Bali', destinationLabel: 'Makepe', tier: 'eco', distanceMeters: 6800, durationMinutes: 24, amountXaf: 2700, method: 'cash', passengerRating: 4 },
  { daysAgo: 17, hour: 16, pickupLabel: 'PK14', destinationLabel: 'Bonanjo', tier: 'comfort', distanceMeters: 13500, durationMinutes: 38, amountXaf: 6100, method: 'wallet', passengerRating: 5 },
  { daysAgo: 24, hour: 13, pickupLabel: 'Cité des Palmiers', destinationLabel: 'Marché Central', tier: 'eco', distanceMeters: 4700, durationMinutes: 18, amountXaf: 2000, method: 'cash', passengerRating: null },
];

function buildDemoRides(now: number): DriverRide[] {
  return DEMO_RIDES.map((ride, index) => {
    const day = new Date(now - ride.daysAgo * DAY_MS);
    day.setHours(0, 0, 0, 0);

    return {
      id: `r-demo-${index + 1}`,
      completedAt: day.getTime() + ride.hour * HOUR_MS,
      pickupLabel: ride.pickupLabel,
      destinationLabel: ride.destinationLabel,
      tier: ride.tier,
      distanceMeters: ride.distanceMeters,
      durationMinutes: ride.durationMinutes,
      amountXaf: ride.amountXaf,
      method: ride.method,
      passengerRating: ride.passengerRating,
    };
  });
}

/**
 * Courses passees, les plus recentes en tete. Module-level et non contexte :
 * c'est un cache de reponse backend, pas de l'etat partage (R6).
 */
let rides: DriverRide[] = buildDemoRides(Date.now());

/** Latence simulee, pour que l'ecran montre son etat de chargement. */
const LIST_DELAY_MS = 500;

/**
 * Lit les courses terminees sur la periode demandee.
 *
 * Rejette en cas d'echec : l'appelant affiche un message et propose de
 * reessayer (R8). La simulation reussit toujours, mais la signature est celle
 * d'un vrai appel reseau pour que le branchement backend ne change rien.
 */
export async function listDriverRides(
  period: DriverRidePeriod,
): Promise<DriverRide[]> {
  await new Promise((resolve) => setTimeout(resolve, LIST_DELAY_MS));

  const since = Date.now() - PERIOD_DAYS[period] * DAY_MS;

  return rides
    .filter((ride) => ride.completedAt >= since)
    .sort((a, b) => b.completedAt - a.completedAt);
}

/**
 * Archive une course terminee. Renvoie la course creee, ou `null` si elle
 * etait deja archivee : la fin de course peut etre appelee deux fois.
 *
 * Disparaitra avec le backend, qui archive lui-meme la course (R13).
 */
export function recordDriverRide(
  input: Omit<DriverRide, 'completedAt'>,
): DriverRide | null {
  if (rides.some((ride) => ride.id === input.id)) return null;

  const ride: DriverRide = { ...input, completedAt: Date.now() };
  rides = [ride, ...rides];

  return ride;
}

/** Total encaisse sur les courses listees, en francs CFA. */
export function totalRidesAmount(items: DriverRide[]): number {
  return items.reduce((sum, ride) => sum + ride.amountXaf, 0);
}

/** Distance totale parcourue en course, en metres. */
export function totalRidesDistance(items: DriverRide[]): number {
  return items.reduce((sum, ride) => sum + ride.distanceMeters, 0);
}

/**
 * Note moyenne recue sur les courses evaluees, ou `null` si aucune ne l'a ete.
 * Les courses sans note sont ECARTEES du calcul et non comptees zero : une
 * absence d'evaluation n'est pas une mauvaise evaluation.
 */
export function averageRating(items: DriverRide[]): number | null {
  const rated = items.filter((ride) => ride.passengerRating !== null);
  if (rated.length === 0) return null;

  const sum = rated.reduce((total, ride) => total + (ride.passengerRating ?? 0), 0);

  return sum / rated.length;
}

/** Cle de groupement : un jour civil, "2026-09-05". */
export function rideDayKey(completedAt: number): string {
  const date = new Date(completedAt);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Intitule d'un jour dans la liste : "Aujourd'hui", "Hier", sinon la date.
 * Un chauffeur se repere aux journees, pas aux dates completes.
 */
export function formatRideDay(completedAt: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayStart = new Date(completedAt);
  dayStart.setHours(0, 0, 0, 0);

  const daysAgo = Math.round((today.getTime() - dayStart.getTime()) / DAY_MS);

  if (daysAgo === 0) return 'Aujourd’hui';
  if (daysAgo === 1) return 'Hier';

  return dayStart.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Heure de fin d'une course : "14:20". */
export function formatRideTime(completedAt: number): string {
  return new Date(completedAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Duree d'une course : "22 min". */
export function formatRideDuration(minutes: number): string {
  return `${minutes} min`;
}

/**
 * Courses d'un jour regroupees pour l'affichage, avec le total encaisse ce
 * jour-la : c'est l'unite que le chauffeur lit — une journee de travail.
 */
export type DriverRideDay = {
  key: string;
  label: string;
  rides: DriverRide[];
  totalXaf: number;
};

export function groupRidesByDay(items: DriverRide[]): DriverRideDay[] {
  const days: DriverRideDay[] = [];

  for (const ride of items) {
    const key = rideDayKey(ride.completedAt);
    const current = days.find((day) => day.key === key);

    if (current === undefined) {
      days.push({
        key,
        label: formatRideDay(ride.completedAt),
        rides: [ride],
        totalXaf: ride.amountXaf,
      });
    } else {
      current.rides.push(ride);
      current.totalXaf += ride.amountXaf;
    }
  }

  return days;
}
