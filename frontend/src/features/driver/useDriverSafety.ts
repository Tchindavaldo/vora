import { useCallback, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';

import {
  buildDriverReport,
  driverAlertMessage,
  DRIVER_SUPPORT_PHONE,
  sendDriverAlert,
  submitDriverReport,
  type DriverReportReason,
} from '../../services/driverSafety';
import { getDriverEmergencyContacts } from './useDriverEmergencyContacts';
import type { DriverRideRequest } from './driverRequests';
import type { RoutePoint } from '../../services/routing';

/**
 * Assistance du CHAUFFEUR (R10, brief §10.3) : alerte d'urgence, contact
 * assistance, signalement d'un passager.
 *
 * Copie dediee de `useRideSafety` (feature `ride`, cote passager) — R16. Meme
 * machine d'etat, mais pas de partage de course (le chauffeur n'a personne a
 * qui envoyer son trajet) et un signalement qui vise le passager.
 */

/** `idle` rien en cours · `sending` envoi · `sent` confirmation affichee. */
type SafetyStep = 'idle' | 'sending' | 'sent';

export type DriverSafety = {
  /** Ouvre le panneau d'urgence (contacts, assistance, alerte). */
  openSos: () => void;
  /** Ouvre le signalement du passager. */
  openReport: () => void;
  /** Ferme le panneau ouvert et remet son etat a zero. */
  close: () => void;
  /** Panneau affiche, `null` si aucun. */
  panel: 'sos' | 'report' | null;
  alertStep: SafetyStep;
  alertError: string | null;
  /** Declenche l'alerte vers les contacts d'urgence du chauffeur. */
  triggerAlert: () => void;
  /** Appelle l'assistance chauffeur VORA depuis le telephone. */
  callSupport: () => void;
  /** Appelle un contact d'urgence. */
  callContact: (phone: string) => void;
  reportReason: DriverReportReason | null;
  setReportReason: (reason: DriverReportReason) => void;
  reportDetails: string;
  setReportDetails: (details: string) => void;
  reportStep: SafetyStep;
  reportError: string | null;
  sendReport: () => void;
};

export function useDriverSafety(
  request: DriverRideRequest | null,
  coords: RoutePoint | null = null,
): DriverSafety {
  const [panel, setPanel] = useState<'sos' | 'report' | null>(null);

  const [alertStep, setAlertStep] = useState<SafetyStep>('idle');
  const [alertError, setAlertError] = useState<string | null>(null);

  const [reportReason, setReportReason] = useState<DriverReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [reportStep, setReportStep] = useState<SafetyStep>('idle');
  const [reportError, setReportError] = useState<string | null>(null);

  // Le panneau peut etre ferme pendant un envoi : un `setState` sur un
  // composant demonte n'a pas de sens (R8).
  const isOpenRef = useRef(true);

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
   * On ne compose PAS l'appel a la place du chauffeur : le numero est
   * pre-rempli et c'est lui qui declenche. Un appel parti tout seul depuis une
   * app est une surprise, y compris quand l'intention etait bonne.
   */
  const dial = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      console.warn('[driver-safety] appel impossible', phone);
      Alert.alert(
        'Appel impossible',
        `Impossible d’ouvrir le téléphone. Composez le ${phone}.`,
      );
    });
  }, []);

  const callSupport = useCallback(() => dial(DRIVER_SUPPORT_PHONE), [dial]);
  const callContact = useCallback((phone: string) => dial(phone), [dial]);

  /**
   * Envoie l'alerte aux contacts d'urgence du chauffeur, avec sa position.
   *
   * Contrairement au passager, elle reste disponible HORS course : un chauffeur
   * peut etre agresse a l'arret, entre deux courses.
   *
   * ⚠️ SIMULE : rien n'est reellement transmis, et le panneau le dit (§23).
   */
  const triggerAlert = useCallback(async () => {
    if (alertStep === 'sending') return;

    setAlertStep('sending');
    setAlertError(null);

    try {
      await sendDriverAlert({
        rideId: request?.id ?? null,
        coords,
        // Les contacts definis dans le profil chauffeur, pas une liste figee :
        // c'est le meme registre des deux cotes.
        contactIds: getDriverEmergencyContacts().map((contact) => contact.id),
      });
      console.log(
        '[driver-safety] message qui serait envoye',
        driverAlertMessage(request, coords),
      );
      if (!isOpenRef.current) return;
      setAlertStep('sent');
    } catch (cause) {
      console.warn('[driver-safety] alerte non transmise', cause);
      if (!isOpenRef.current) return;
      setAlertStep('idle');
      // Une alerte qui echoue doit laisser une porte de sortie : l'appel direct
      // reste disponible sous le message (R8).
      setAlertError(
        'Alerte non transmise. Appelez directement un contact ci-dessous.',
      );
    }
  }, [request, coords, alertStep]);

  /** Envoie le signalement. Sans motif choisi, il n'y a rien a envoyer. */
  const sendReport = useCallback(async () => {
    if (reportReason === null || reportStep === 'sending') return;

    const report = buildDriverReport(request, reportReason, reportDetails);
    if (report === null) {
      setReportError("Aucune course en cours : il n'y a pas de passager à signaler.");
      return;
    }

    setReportStep('sending');
    setReportError(null);

    try {
      await submitDriverReport(report);
      if (!isOpenRef.current) return;
      setReportStep('sent');
    } catch (cause) {
      console.warn('[driver-safety] signalement non transmis', cause);
      if (!isOpenRef.current) return;
      setReportStep('idle');
      setReportError("Impossible d'envoyer le signalement. Réessayez.");
    }
  }, [request, reportReason, reportDetails, reportStep]);

  return {
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
