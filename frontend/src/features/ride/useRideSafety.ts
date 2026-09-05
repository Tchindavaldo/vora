import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Share } from 'react-native';

import {
  alertMessage,
  buildReport,
  sendEmergencyAlert,
  submitReport,
  SUPPORT_PHONE,
  type ReportReason,
} from '../../services/safety';
import { getEmergencyContacts } from '../profile/useEmergencyContacts';
import type { Ride } from '../../services/rides';
import type { RoutePoint } from '../../services/routing';

/**
 * Actions de securite pendant la course (R10, brief §10) : partage de course,
 * alerte d'urgence, appel de l'assistance et signalement du chauffeur.
 *
 * Sorties de `HomeScreen` pour qu'il reste sous le plafond de taille (R4) et
 * parce qu'elles appartiennent a la course, pas a l'accueil.
 */

/** `idle` rien en cours · `sending` envoi · `sent` confirmation affichee. */
type SafetyStep = 'idle' | 'sending' | 'sent';

export type RideSafety = {
  share: () => void;
  /** Ouvre le panneau d'urgence (contacts, assistance, alerte). */
  openSos: () => void;
  /** Ouvre le signalement du chauffeur. */
  openReport: () => void;
  /** Ferme le panneau ouvert et remet son etat a zero. */
  close: () => void;
  /** Panneau affiche, `null` si aucun. */
  panel: 'sos' | 'report' | null;
  alertStep: SafetyStep;
  alertError: string | null;
  /** Declenche l'alerte vers les contacts d'urgence. */
  triggerAlert: () => void;
  /** Appelle l'assistance VORA depuis le telephone. */
  callSupport: () => void;
  /** Appelle un contact d'urgence. */
  callContact: (phone: string) => void;
  reportReason: ReportReason | null;
  setReportReason: (reason: ReportReason) => void;
  reportDetails: string;
  setReportDetails: (details: string) => void;
  reportStep: SafetyStep;
  reportError: string | null;
  sendReport: () => void;
};

export function useRideSafety(
  ride: Ride | null,
  coords: RoutePoint | null = null,
): RideSafety {
  const [panel, setPanel] = useState<'sos' | 'report' | null>(null);

  const [alertStep, setAlertStep] = useState<SafetyStep>('idle');
  const [alertError, setAlertError] = useState<string | null>(null);

  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [reportStep, setReportStep] = useState<SafetyStep>('idle');
  const [reportError, setReportError] = useState<string | null>(null);

  // Le panneau peut etre ferme pendant un envoi : un `setState` sur un
  // composant demonte n'a pas de sens (R8).
  const isOpenRef = useRef(true);

  /**
   * Le passager envoie a un proche le chauffeur, sa plaque et sa destination.
   * La feuille de partage du systeme est utilisee plutot qu'un service maison —
   * elle atteint tous les canaux deja installes sur le telephone (WhatsApp en
   * tete, a Douala).
   */
  const share = useCallback(() => {
    if (ride === null || ride.driver === null) return;

    const message =
      `Je suis en course VORA vers ${ride.destinationLabel}. ` +
      `Chauffeur : ${ride.driver.name}, ${ride.driver.vehicleModel} ` +
      `(${ride.driver.plate}).`;

    Share.share({ message }).catch(() => {
      // Feuille de partage indisponible : on le dit plutot que d'echouer en
      // silence (R8).
      console.warn('[safety] partage de course indisponible');
      Alert.alert('Partage indisponible', 'Impossible d’ouvrir le partage.');
    });
  }, [ride]);

  const openSos = useCallback(() => {
    isOpenRef.current = true;
    setPanel('sos');
  }, []);

  const openReport = useCallback(() => {
    isOpenRef.current = true;
    setPanel('report');
  }, []);

  const close = useCallback(() => {
    isOpenRef.current = false;
    setPanel(null);
    setAlertStep('idle');
    setAlertError(null);
    setReportReason(null);
    setReportDetails('');
    setReportStep('idle');
    setReportError(null);
  }, []);

  /**
   * Ouvre le composeur telephonique.
   *
   * On ne compose PAS l'appel a la place de l'utilisateur : le numero est
   * pre-rempli et c'est lui qui declenche. Un appel parti tout seul depuis une
   * app est une surprise, y compris quand l'intention etait bonne.
   */
  const dial = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      console.warn('[safety] appel impossible', phone);
      Alert.alert(
        'Appel impossible',
        `Impossible d’ouvrir le téléphone. Composez le ${phone}.`,
      );
    });
  }, []);

  const callSupport = useCallback(() => dial(SUPPORT_PHONE), [dial]);
  const callContact = useCallback((phone: string) => dial(phone), [dial]);

  /**
   * Envoie l'alerte a tous les contacts d'urgence, avec la position courante.
   *
   * ⚠️ SIMULE : rien n'est reellement transmis, et le panneau le dit. Le
   * message construit est celui qui partirait en production (brief §23).
   */
  const triggerAlert = useCallback(async () => {
    if (ride === null || alertStep === 'sending') return;

    setAlertStep('sending');
    setAlertError(null);

    try {
      await sendEmergencyAlert({
        rideId: ride.id,
        driverId: ride.driver?.id ?? null,
        coords,
        // Les contacts definis dans les parametres, pas une liste figee : c'est
        // le meme registre des deux cotes.
        contactIds: getEmergencyContacts().map((contact) => contact.id),
      });
      console.log('[safety] message qui serait envoye', alertMessage(ride, coords));
      if (!isOpenRef.current) return;
      setAlertStep('sent');
    } catch (cause) {
      console.warn('[safety] alerte non transmise', cause);
      if (!isOpenRef.current) return;
      setAlertStep('idle');
      // Une alerte qui echoue doit laisser une porte de sortie : l'appel direct
      // reste disponible sous le message (R8).
      setAlertError(
        'Alerte non transmise. Appelez directement un contact ci-dessous.',
      );
    }
  }, [ride, coords, alertStep]);

  /** Envoie le signalement. Sans motif choisi, il n'y a rien a envoyer. */
  const sendReport = useCallback(async () => {
    if (ride === null || reportReason === null || reportStep === 'sending') return;

    const report = buildReport(ride, reportReason, reportDetails);
    if (report === null) {
      setReportError("Cette course n'a pas de chauffeur à signaler.");
      return;
    }

    setReportStep('sending');
    setReportError(null);

    try {
      await submitReport(report);
      if (!isOpenRef.current) return;
      setReportStep('sent');
    } catch (cause) {
      console.warn('[safety] signalement non transmis', cause);
      if (!isOpenRef.current) return;
      setReportStep('idle');
      setReportError("Impossible d'envoyer le signalement. Réessayez.");
    }
  }, [ride, reportReason, reportDetails, reportStep]);

  return {
    share,
    openSos,
    openReport,
    close,
    panel,
    alertStep,
    alertError,
    triggerAlert,
    callSupport,
    callContact,
    reportReason,
    setReportReason,
    reportDetails,
    setReportDetails,
    reportStep,
    reportError,
    sendReport,
  };
}
