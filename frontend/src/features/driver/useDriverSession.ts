/**
 * Etat du parcours chauffeur : statut en ligne, gains du jour, ecran affiche
 * et course en cours (R17 etape 9).
 *
 * Meme parti pris que `useHomeNavigation` cote passager : pas de librairie de
 * navigation (R18), un etat local qui dit quel ecran plein afficher. Regroupe
 * ici pour que `DriverApp` reste lisible (R4).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createDemoRequest,
  REQUEST_TIMEOUT_SECONDS,
  type DriverRideRequest,
  type DriverTripStage,
} from './driverRequests';
import { recordDriverEarning } from '../../services/driverEarnings';
import { recordDriverRide } from '../../services/driverRides';

export type DriverRoute =
  | 'dashboard'
  | 'incoming_request'
  | 'trip'
  | 'profile'
  | 'earnings'
  | 'ride_history'
  | 'emergency_contacts';

/** Chauffeur de demonstration : identite affichee sur le tableau de bord et le profil. */
export const DEMO_DRIVER = {
  name: 'Alain Mbarga',
  initial: 'A',
  vehicleTier: 'eco' as const,
  vehicleModel: 'Toyota Corolla',
  plate: 'CE 2094 XY',
  phone: '+237 600 00 00 02',
  rating: 4.8,
};

export function useDriverSession() {
  const [route, setRoute] = useState<DriverRoute>('dashboard');
  const [isOnline, setIsOnline] = useState(false);
  const [earningsTodayXaf, setEarningsTodayXaf] = useState(0);
  const [ridesToday, setRidesToday] = useState(0);
  const [distanceTodayMeters, setDistanceTodayMeters] = useState(0);

  const [request, setRequest] = useState<DriverRideRequest | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REQUEST_TIMEOUT_SECONDS);
  const [stage, setStage] = useState<DriverTripStage>('to_pickup');

  const requestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRequestTimer = () => {
    if (requestTimerRef.current !== null) {
      clearInterval(requestTimerRef.current);
      requestTimerRef.current = null;
    }
  };

  useEffect(() => clearRequestTimer, []);

  /** Bascule en ligne : declenche une demande de demonstration apres un court delai. */
  const goOnline = useCallback(() => {
    setIsOnline(true);
  }, []);

  const goOffline = useCallback(() => {
    setIsOnline(false);
    clearRequestTimer();
    setRequest(null);
    setRoute('dashboard');
  }, []);

  // Une demande arrive peu apres le passage en ligne, avec son compte a
  // rebours : c'est ce qui cree la tension en demonstration (Yango/Uber).
  useEffect(() => {
    if (!isOnline || route !== 'dashboard') return;

    const delay = setTimeout(() => {
      setRequest(createDemoRequest());
      setSecondsLeft(REQUEST_TIMEOUT_SECONDS);
      setRoute('incoming_request');
    }, 2500);

    return () => clearTimeout(delay);
  }, [isOnline, route]);

  // Compte a rebours de la demande affichee : au bout de 15 s sans reponse,
  // elle est retiree comme un vrai chauffeur qui n'a pas repondu a temps.
  useEffect(() => {
    if (route !== 'incoming_request') return;

    requestTimerRef.current = setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          clearRequestTimer();
          setRequest(null);
          setRoute('dashboard');
          return REQUEST_TIMEOUT_SECONDS;
        }
        return seconds - 1;
      });
    }, 1000);

    return clearRequestTimer;
  }, [route]);

  const acceptRequest = useCallback(() => {
    clearRequestTimer();
    setStage('to_pickup');
    setRoute('trip');
  }, []);

  const refuseRequest = useCallback(() => {
    clearRequestTimer();
    setRequest(null);
    setRoute('dashboard');
  }, []);

  const advanceStage = useCallback(() => {
    setStage((current) => {
      if (current === 'to_pickup') return 'arrived';
      if (current === 'arrived') return 'in_progress';
      return 'completed';
    });
  }, []);

  /** Course encaissee : les gains et le compteur du jour se mettent a jour, puis retour au tableau de bord. */
  const finishTrip = useCallback(() => {
    setEarningsTodayXaf((total) => total + (request?.earningsXaf ?? 0));
    setRidesToday((count) => count + 1);
    setDistanceTodayMeters((total) => total + (request?.distanceMeters ?? 0));

    // La course rejoint les revenus du jour : c'est le dernier moment ou le
    // trajet, le montant et le mode d'encaissement sont connus ensemble.
    if (request !== null) {
      recordDriverEarning({
        id: request.id,
        pickupLabel: request.pickupLabel,
        destinationLabel: request.destinationLabel,
        tier: request.tier,
        distanceMeters: request.distanceMeters,
        amountXaf: request.earningsXaf,
        method: request.method,
      });

      // La meme course rejoint l'historique, qui la gardera au-dela du jour.
      // Deux archivages et non un seul relais : les revenus du jour et
      // l'historique seront deux endpoints distincts (R12).
      recordDriverRide({
        id: request.id,
        pickupLabel: request.pickupLabel,
        destinationLabel: request.destinationLabel,
        tier: request.tier,
        distanceMeters: request.distanceMeters,
        durationMinutes: request.durationMinutes,
        amountXaf: request.earningsXaf,
        method: request.method,
        // La note arrive quand le passager evalue, apres la fin de course.
        passengerRating: null,
      });
    }

    setRequest(null);
    setStage('to_pickup');
    setRoute('dashboard');
  }, [request]);

  const openProfile = useCallback(() => setRoute('profile'), []);
  const closeProfile = useCallback(() => setRoute('dashboard'), []);

  /**
   * Ecran d'ou les revenus ont ete ouverts : la fermeture y revient. Sans
   * cela, un chauffeur parti de son profil se retrouvait sur le tableau de
   * bord, avec l'impression d'avoir quitte son profil sans le demander.
   */
  const earningsOriginRef = useRef<DriverRoute>('dashboard');

  const openEarnings = useCallback((from: DriverRoute = 'dashboard') => {
    earningsOriginRef.current = from;
    setRoute('earnings');
  }, []);

  const closeEarnings = useCallback(() => {
    setRoute(earningsOriginRef.current);
  }, []);

  /**
   * Ecran d'ou l'historique a ete ouvert : sa fermeture y revient. Meme raison
   * que pour les revenus — le profil et l'ecran des revenus y menent tous deux.
   */
  const historyOriginRef = useRef<DriverRoute>('profile');

  const openRideHistory = useCallback((from: DriverRoute = 'profile') => {
    historyOriginRef.current = from;
    setRoute('ride_history');
  }, []);

  const closeRideHistory = useCallback(() => {
    setRoute(historyOriginRef.current);
  }, []);

  // Les contacts d'urgence ne s'ouvrent que depuis le profil : leur fermeture y
  // revient, sans avoir a memoriser d'ou l'on vient.
  const openEmergencyContacts = useCallback(() => setRoute('emergency_contacts'), []);
  const closeEmergencyContacts = useCallback(() => setRoute('profile'), []);

  return {
    route,
    isOnline,
    earningsTodayXaf,
    ridesToday,
    distanceTodayMeters,
    request,
    secondsLeft,
    stage,
    goOnline,
    goOffline,
    acceptRequest,
    refuseRequest,
    advanceStage,
    finishTrip,
    openProfile,
    closeProfile,
    openEarnings,
    closeEarnings,
    openRideHistory,
    closeRideHistory,
    openEmergencyContacts,
    closeEmergencyContacts,
  };
}

export type DriverSession = ReturnType<typeof useDriverSession>;
