/**
 * Assistance passager (brief §14) : contact du support, questions frequentes
 * et litige sur une course.
 *
 * ⚠️ SIMULE. Aucun backend n'existe encore : l'ouverture d'un litige imite la
 * latence d'un `POST /support/disputes` puis journalise. Rien n'est reellement
 * transmis, et l'ecran le dit (brief §23). C'est le SEUL fichier a remplacer
 * quand l'API arrivera — l'UI n'a pas a changer.
 *
 * SEPARE de `safety.ts` : la securite traite l'urgence et le signalement d'un
 * chauffeur (on est en danger, ou quelqu'un s'est mal comporte) ; l'assistance
 * traite la relation client (une question, un montant conteste). Les melanger
 * enterrerait le SOS sous des questions de facturation.
 *
 * Service pur, sans rendu : partage entre ecrans (R16).
 */

/**
 * Assistance passager VORA. Meme numero que celui affiche pendant la course
 * (`SUPPORT_PHONE` de `safety.ts`), volontairement redefini ici : le jour ou
 * le support passe par une file dediee hors course, seul ce fichier change.
 *
 * Numero de demonstration : il viendra de la configuration d'environnement
 * quand le backend existera (R9).
 */
export const SUPPORT_PHONE = '+237690000000';

/** Adresse de l'assistance, pour les demandes qui ne pressent pas. */
export const SUPPORT_EMAIL = 'support@vora.cm';

/**
 * Plage horaire annoncee. Un passager doit savoir s'il aura quelqu'un au bout
 * du fil avant d'appeler — un appel sans reponse use plus la confiance que
 * l'attente annoncee (R8, contexte camerounais : le credit telephonique coute).
 */
export const SUPPORT_HOURS = 'Tous les jours, 6h – 22h';

/**
 * Question frequente. Le contenu est en dur ICI et non dans le composant :
 * il viendra d'un `GET /support/faq` traduit et modifiable sans livrer une
 * nouvelle version de l'app.
 */
export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
};

/**
 * Questions retenues : celles qui, sinon, deviennent un appel au support.
 * Elles suivent le parcours reel du passager — prix, paiement, attente,
 * securite, annulation — et non un classement par theme abstrait.
 */
export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'faq-price',
    question: 'Comment le prix de ma course est-il calculé ?',
    answer:
      'Le prix dépend de la distance, de la durée estimée et du type de véhicule choisi. Il vous est annoncé AVANT de commander : c’est ce montant que vous payez, même si le trajet dure plus longtemps que prévu.',
  },
  {
    id: 'faq-cash',
    question: 'Le chauffeur n’a pas de monnaie, que faire ?',
    answer:
      'Au moment de payer en espèces, indiquez le billet que vous avez : le chauffeur voit la monnaie à prévoir avant d’accepter la course. S’il ne peut pas rendre la monnaie malgré tout, réglez par Mobile Money depuis l’écran de paiement.',
  },
  {
    id: 'faq-no-driver',
    question: 'Aucun chauffeur ne répond à ma demande.',
    answer:
      'Aux heures de pointe ou dans les zones peu desservies, il peut n’y avoir aucun chauffeur libre à proximité. Attendez quelques minutes puis relancez la demande, ou essayez un autre type de véhicule — les motos sont souvent plus disponibles.',
  },
  {
    id: 'faq-cancel',
    question: 'Puis-je annuler une course ?',
    answer:
      'Oui, tant que le chauffeur n’est pas arrivé au point de prise en charge. L’annulation est gratuite dans les deux minutes qui suivent l’acceptation.',
  },
  {
    id: 'faq-safety',
    question: 'Que faire si je ne me sens pas en sécurité ?',
    answer:
      'Utilisez le bouton SOS pendant la course : il prévient vos contacts d’urgence avec votre position et les informations du chauffeur. Vous pouvez aussi partager votre trajet en direct avec un proche depuis l’écran de suivi.',
  },
  {
    id: 'faq-lost',
    question: 'J’ai oublié un objet dans le véhicule.',
    answer:
      'Ouvrez un litige sur la course concernée depuis cet écran : nous transmettons votre demande au chauffeur et vous rappelons pour organiser la restitution.',
  },
];

/**
 * Motifs de litige sur une course.
 *
 * Liste fermee, comme les motifs de signalement : elle se route
 * automatiquement vers la bonne equipe cote back-office. Elle ne recoupe PAS
 * les motifs de signalement — un litige porte sur la course (montant, trajet,
 * objet oublie), un signalement sur le comportement du chauffeur.
 */
export type DisputeReason =
  | 'wrong_amount'
  | 'route_not_taken'
  | 'ride_not_made'
  | 'lost_item'
  | 'other';

export const DISPUTE_REASONS: DisputeReason[] = [
  'wrong_amount',
  'route_not_taken',
  'ride_not_made',
  'lost_item',
  'other',
];

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  wrong_amount: 'Montant incorrect',
  route_not_taken: 'Trajet non respecté',
  ride_not_made: 'Course non effectuée',
  lost_item: 'Objet oublié',
  other: 'Autre',
};

/** Longueur maximale du message, alignee sur ce qu'un backend accepterait. */
export const DISPUTE_MAX_LENGTH = 500;

export type DisputeInput = {
  /** Course concernee. Un litige porte TOUJOURS sur une course precise. */
  rideId: string;
  reason: DisputeReason;
  /** Precision libre, facultative : `null` quand le passager n'ecrit rien. */
  details: string | null;
};

const DISPUTE_DELAY_MS = 700;

/**
 * Ouvre un litige sur une course.
 *
 * Rejette en cas d'echec : le passager doit savoir si sa demande est partie
 * (R8) — croire qu'un litige est ouvert alors qu'il ne l'est pas fait perdre
 * le delai de reclamation.
 */
export async function submitDispute(input: DisputeInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, DISPUTE_DELAY_MS));

  console.log('[support] litige simule envoye', input);
}

/** Delai de reponse annonce, affiche apres l'envoi. */
export const DISPUTE_REPLY_DELAY = 'sous 48 heures';
