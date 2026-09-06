/**
 * Revenus du chauffeur : courses encaissees du jour et total (brief §6, §14).
 *
 * ⚠️ SIMULE, EN MEMOIRE. Meme parti pris que `transactions.ts` cote passager :
 * les courses terminees pendant la session sont conservees dans ce module,
 * precedees de quelques courses de demonstration pour que l'ecran ne soit pas
 * vide devant le jury. Elles disparaissent au redemarrage de l'app.
 *
 * Pas de stockage local : les revenus sont derives du backend, jamais
 * recalcules cote client comme source de verite (R13). Quand l'API arrivera,
 * `listDriverEarnings` devient `GET /driver/rides?day=today` et
 * `recordDriverEarning` disparait — c'est le backend qui archive la course a
 * son encaissement.
 *
 * Service pur, sans rendu : partage entre ecrans (R16).
 */

import { METHOD_LABELS, type PaymentMethod } from './payment';
import type { VehicleTier } from './pricing';

/**
 * Une course encaissee, telle qu'elle apparait dans les revenus.
 *
 * Le montant et le mode de paiement sont FIGES a l'encaissement : une course
 * passee ne doit pas changer parce que la grille tarifaire a change depuis.
 */
export type DriverEarning = {
  id: string;
  /** Fin de course, en millisecondes depuis epoch. */
  completedAt: number;
  pickupLabel: string;
  destinationLabel: string;
  tier: VehicleTier;
  distanceMeters: number;
  /** Ce que le chauffeur a encaisse pour cette course, en francs CFA. */
  amountXaf: number;
  method: PaymentMethod;
};

export type RecordDriverEarningInput = {
  id: string;
  pickupLabel: string;
  destinationLabel: string;
  tier: VehicleTier;
  distanceMeters: number;
  amountXaf: number;
  method: PaymentMethod;
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * Courses de demonstration, anterieures a la session mais du MEME jour :
 * l'ecran affiche les revenus du jour, une course d'hier n'y aurait pas sa
 * place. Les heures sont relatives au lancement de l'app pour rester credibles
 * quel que soit le moment de la demo.
 */
function buildDemoEarnings(now: number): DriverEarning[] {
  return [
    {
      id: 'e-demo-1',
      completedAt: now - 2 * HOUR_MS,
      pickupLabel: 'Bonapriso',
      destinationLabel: 'Marché Central',
      tier: 'eco',
      distanceMeters: 4200,
      amountXaf: 1800,
      method: 'cash',
    },
    {
      id: 'e-demo-2',
      completedAt: now - 4 * HOUR_MS,
      pickupLabel: 'Akwa',
      destinationLabel: 'Bonamoussadi',
      tier: 'eco',
      distanceMeters: 7600,
      amountXaf: 2900,
      method: 'mobile_money',
    },
    {
      id: 'e-demo-3',
      completedAt: now - 6 * HOUR_MS,
      pickupLabel: 'Deido',
      destinationLabel: 'Université de Douala',
      tier: 'eco',
      distanceMeters: 3100,
      amountXaf: 1400,
      method: 'cash',
    },
  ];
}

/**
 * Courses encaissees de la session, les plus recentes en tete.
 *
 * Module-level et non contexte : c'est un cache de reponse backend, pas de
 * l'etat partage d'application (R6). `useDriverEarnings` en fait un etat React.
 */
let earnings: DriverEarning[] = buildDemoEarnings(Date.now());

/** Latence simulee de la lecture, pour que l'ecran montre son etat de chargement. */
const LIST_DELAY_MS = 400;

/**
 * Lit les courses encaissees du jour.
 *
 * Rejette en cas d'echec : l'appelant doit afficher un message et proposer de
 * reessayer (R8). La simulation reussit toujours, mais la signature est celle
 * d'un vrai appel reseau pour que le branchement backend ne change rien.
 */
export async function listDriverEarnings(): Promise<DriverEarning[]> {
  await new Promise((resolve) => setTimeout(resolve, LIST_DELAY_MS));

  return [...earnings];
}

/**
 * Archive une course encaissee. Renvoie la course creee, ou `null` si elle
 * etait deja archivee : l'ecran peut appeler la fin de course deux fois.
 */
export function recordDriverEarning(
  input: RecordDriverEarningInput,
): DriverEarning | null {
  if (earnings.some((item) => item.id === input.id)) return null;

  const earning: DriverEarning = { ...input, completedAt: Date.now() };
  earnings = [earning, ...earnings];

  return earning;
}

/** Total encaisse sur les courses listees, en francs CFA. */
export function totalEarned(items: DriverEarning[]): number {
  return items.reduce((sum, item) => sum + item.amountXaf, 0);
}

/** Distance totale parcourue en course, en metres. */
export function totalEarnedDistance(items: DriverEarning[]): number {
  return items.reduce((sum, item) => sum + item.distanceMeters, 0);
}

/** Heure d'une course : "14:20". Toutes les courses listees sont du jour. */
export function formatEarningTime(completedAt: number): string {
  return new Date(completedAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Mode d'encaissement affiche sur la ligne.
 *
 * Les especes sont encaissees a la descente, le reste est verse par la
 * plateforme : la distinction change ce que le chauffeur a en poche le soir.
 */
export function earningMethodLabel(method: PaymentMethod): string {
  return method === 'cash'
    ? `${METHOD_LABELS[method]} — encaissé`
    : `${METHOD_LABELS[method]} — versé`;
}
