/**
 * Etat de l'evaluation du chauffeur : note, commentaire, envoi (R12).
 *
 * Aucun composant n'appelle `submitRating` directement : le hook porte les
 * trois etats attendus d'un appel reseau — en cours, succes, erreur — pour que
 * l'ecran ait toujours quelque chose a montrer, y compris en cas d'echec (R8).
 */

import { useState } from 'react';

import {
  buildRating,
  submitRating,
  type RatingStars,
} from '../../services/ratings';
import type { Ride } from '../../services/rides';

/**
 * `idle` le passager choisit · `sending` envoi en cours · `sent` merci affiche.
 * L'erreur est portee a part : on reste en `idle` pour laisser reessayer avec
 * la note deja saisie.
 */
type RatingStep = 'idle' | 'sending' | 'sent';

export function useRideRating() {
  const [stars, setStars] = useState<RatingStars | null>(null);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<RatingStep>('idle');
  const [error, setError] = useState<string | null>(null);

  /**
   * Envoie la note. Sans etoile choisie, il n'y a rien a envoyer.
   *
   * Renvoie `true` seulement si l'envoi a abouti : l'appelant s'en sert pour
   * decider s'il quitte l'ecran de saisie ou s'il y reste avec le message
   * d'erreur et la note conservee (R8).
   */
  const submit = async (ride: Ride): Promise<boolean> => {
    if (stars === null || step === 'sending') return false;

    const rating = buildRating(ride, stars, comment);
    if (rating === null) {
      setError("Cette course n'a pas de chauffeur à évaluer.");
      return false;
    }

    setStep('sending');
    setError(null);

    try {
      await submitRating(rating);
      setStep('sent');
      return true;
    } catch (cause) {
      console.warn('[useRideRating] envoi impossible', cause);
      setStep('idle');
      setError("Impossible d'envoyer votre note. Réessayez.");
      return false;
    }
  };

  /** Remet l'evaluation a zero pour la course suivante. */
  const reset = () => {
    setStars(null);
    setComment('');
    setStep('idle');
    setError(null);
  };

  return {
    stars,
    setStars,
    comment,
    setComment,
    step,
    error,
    isSending: step === 'sending',
    isSent: step === 'sent',
    submit,
    reset,
  };
}
