/**
 * Assistance passager : appel du support, questions frequentes depliees et
 * litige sur une course (R12, brief §14).
 *
 * Le hook porte l'etat de l'ecran ET l'appel au service : aucun composant
 * n'appelle `submitDispute` directement, et l'envoi expose ses trois etats —
 * en cours, envoye, erreur (R8).
 *
 * Copie dediee de la partie "signalement" de `useRideSafety` (R16) : meme
 * forme, mais le litige porte sur une course passee, pas sur la course en
 * cours, et il ne cotoie pas le SOS.
 */

import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';

import {
  submitDispute,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  type DisputeReason,
} from '../../services/support';

/** Etapes de l'envoi d'un litige, comme le signalement cote securite. */
export type DisputeStep = 'idle' | 'sending' | 'sent';

export function useSupport() {
  /** Question frequente ouverte, `null` quand tout est replie. */
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  /** Course sur laquelle le litige est ouvert, `null` quand le panneau est ferme. */
  const [disputeRideId, setDisputeRideId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<DisputeReason | null>(null);
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputeStep, setDisputeStep] = useState<DisputeStep>('idle');
  const [disputeError, setDisputeError] = useState<string | null>(null);

  /** Une seule question ouverte a la fois : l'ecran reste parcourable. */
  const toggleFaq = useCallback((id: string) => {
    setOpenFaqId((current) => (current === id ? null : id));
  }, []);

  /**
   * Ouvre le composeur telephonique.
   *
   * On ne compose PAS l'appel a la place du passager : le numero est
   * pre-rempli et c'est lui qui declenche (meme parti pris que `useRideSafety`).
   */
  const dial = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      console.warn('[support] appel impossible', phone);
      Alert.alert(
        'Appel impossible',
        `Impossible d’ouvrir le téléphone. Composez le ${phone}.`,
      );
    });
  }, []);

  const callSupport = useCallback(() => dial(SUPPORT_PHONE), [dial]);

  /** Ouvre le client mail, sujet pre-rempli. Echec signale, jamais silencieux (R8). */
  const emailSupport = useCallback(() => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      'Demande d’assistance VORA',
    )}`;

    Linking.openURL(url).catch(() => {
      console.warn('[support] messagerie indisponible');
      Alert.alert(
        'Messagerie indisponible',
        `Aucune application mail configurée. Écrivez-nous à ${SUPPORT_EMAIL}.`,
      );
    });
  }, []);

  const openDispute = useCallback((rideId: string) => {
    setDisputeRideId(rideId);
    setDisputeReason(null);
    setDisputeDetails('');
    setDisputeStep('idle');
    setDisputeError(null);
  }, []);

  const closeDispute = useCallback(() => {
    setDisputeRideId(null);
  }, []);

  /**
   * Envoie le litige. Sans motif choisi, on ne part pas : le back-office
   * routerait la demande nulle part.
   */
  const sendDispute = useCallback(async () => {
    if (disputeRideId === null || disputeReason === null) return;

    setDisputeStep('sending');
    setDisputeError(null);

    try {
      await submitDispute({
        rideId: disputeRideId,
        reason: disputeReason,
        details: disputeDetails.trim() === '' ? null : disputeDetails.trim(),
      });
      setDisputeStep('sent');
    } catch (cause) {
      console.warn('[support] litige non envoye', cause);
      setDisputeStep('idle');
      setDisputeError('Envoi impossible. Vérifiez votre connexion et réessayez.');
    }
  }, [disputeDetails, disputeReason, disputeRideId]);

  return {
    openFaqId,
    toggleFaq,
    callSupport,
    emailSupport,
    disputeRideId,
    disputeReason,
    setDisputeReason,
    disputeDetails,
    setDisputeDetails,
    disputeStep,
    disputeError,
    openDispute,
    closeDispute,
    sendDispute,
  };
}
