import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapCanvas } from '../map/MapCanvas';
import { colors, shadows, SHEET_HEIGHT, spacing } from '../../theme';
import { DEFAULT_REGION } from '../../config/env';

import type { RoadPoint } from '../../services/roads';
import {
  fetchRoadPointsFromMap,
  type RoadQueryTarget,
} from '../../services/roadsFromMap';
import { useUserLocation } from './useUserLocation';
import { useVehicleMotion } from './useVehicleMotion';
import { HomeHeader } from './components/HomeHeader';
import { DestinationSheet, type Shortcut } from './components/DestinationSheet';
import {
  DestinationSearchScreen,
  type DestinationChoice,
} from '../search/DestinationSearchScreen';
import { useBookingFlow } from '../booking/useBookingFlow';
import { FareSheet } from '../booking/components/FareSheet';
import { usePayment } from '../payment/usePayment';
import { PaymentSheet } from '../payment/components/PaymentSheet';
import { CashChangeSheet } from '../payment/components/CashChangeSheet';
import { computeCashOffer } from '../../services/payment';
import { useRideRequest } from '../ride/useRideRequest';
import { SearchingDriverSheet } from '../ride/components/SearchingDriverSheet';
import { RideTrackingSheet } from '../ride/components/RideTrackingSheet';
import { useDriverApproach } from '../ride/useDriverApproach';
import { useApproachRoute } from '../ride/useApproachRoute';
import { useRideCamera } from '../ride/useRideCamera';
import { useRideSafety } from '../ride/useRideSafety';
import { LocationNotice } from './components/LocationNotice';
import { useHomeMarkers } from './useHomeMarkers';
import { DEMO_USER_INITIAL, NEARBY_VEHICLES, SHORTCUTS } from './demoData';

/**
 * Ecran d'accueil passager.
 *
 * Parti pris de mise en page : la carte occupe TOUTE la hauteur et passe sous
 * le header comme sous le bottom sheet. Aucune bande blanche, aucune carte
 * encadree — c'est ce qui separe une app de mobilite credible d'une maquette.
 */
export function HomeScreen() {
  const location = useUserLocation();
  const insets = useSafeAreaInsets();

  // Positions posees sur de vraies rues, recuperees une fois la geolocalisation
  // resolue.
  //
  // `null` = on ne sait pas encore. On n'affiche AUCUN vehicule dans cet etat :
  // montrer les offsets de demonstration puis les deplacer quand Overpass
  // repond produirait un saut visible a l'ecran. Une fois la reponse connue —
  // vraies rues, ou tableau vide en cas d'echec (R8) — les vehicules
  // apparaissent a leur place definitive et n'en bougent plus.
  const [roadPoints, setRoadPoints] = useState<RoadPoint[] | null>(null);

  // Meme information que `roadPoints`, lisible sans attendre un nouveau rendu :
  // la carte peut signaler deux fins de rendu avant que l'etat ne soit a jour.
  const roadPointsRef = useRef<RoadPoint[] | null>(null);

  // On depend des COORDONNEES, pas de l'objet `location.coords` : celui-ci est
  // recree a chaque rendu, et la carte en declenche beaucoup (le suivi du cap
  // en produit un par image pendant une rotation).
  const { longitude, latitude } = location.coords;

  /**
   * Les routes viennent de la carte elle-meme, une fois ses tuiles dessinees.
   *
   * On n'interroge PAS de service exterieur (Overpass) : il est injoignable
   * depuis certains reseaux, et la carte a de toute facon deja telecharge la
   * geometrie des routes pour les afficher. Les vehicules tombent ainsi
   * exactement sur le trace visible, et non a cote.
   *
   * `useCallback` car la valeur est passee en prop a la carte : sans elle, une
   * nouvelle fonction a chaque rendu.
   */
  const handleRoadsAvailable = useCallback(
    (map: RoadQueryTarget) => {
      // Une seule fois : la carte signale chaque fin de rendu, et refaire le
      // placement a chaque geste ferait sauter les vehicules d'une rue a
      // l'autre sous les yeux de l'utilisateur.
      if (roadPointsRef.current) return;

      fetchRoadPointsFromMap(map, { longitude, latitude }, NEARBY_VEHICLES.length)
        .then((points) => {
          if (points.length === 0) return;
          roadPointsRef.current = points;
          setRoadPoints(points);
        });
    },
    [longitude, latitude],
  );

  // Les vehicules roulent le long de leur rue. Tant que les positions ne sont
  // pas connues, le hook ne renvoie rien et la carte reste sans vehicule.
  const motions = useVehicleMotion(roadPoints);

  // Course en preparation : destination, itineraire et tarifs (R17 etapes 4-5).
  const booking = useBookingFlow(location.coords);

  // Course commandee : creation, chauffeur, suivi (R17 etapes 6-8).
  const ride = useRideRequest();

  // Mode de paiement, choisi entre l'estimation et la recherche de chauffeur.
  const payment = usePayment();

  // Partage de course et SOS (R10).
  const safety = useRideSafety(ride.ride);

  /**
   * Etape de paiement ouverte : le tarif est retenu, la course n'est pas encore
   * demandee. Un booleen d'ecran plutot qu'un etat dans `useBookingFlow` : la
   * reservation s'arrete au choix du tarif (voir architecture/ride.md).
   */
  const [isPaying, setIsPaying] = useState(false);

  // Vrai itineraire du chauffeur vers le passager : le vehicule doit rouler sur
  // la chaussee, pas couper a vol d'oiseau.
  const approach = useApproachRoute(ride.ride);

  // Position animee du chauffeur, sur le trace d'approche puis sur celui de la
  // course.
  const driverPosition = useDriverApproach(
    ride.ride,
    approach.points,
    booking.routePoints,
  );

  // Composition de la carte : vehicules alentour, position, destination,
  // chauffeur. Sortie de l'ecran pour qu'il reste lisible (R4).
  const markers = useHomeMarkers({
    coords: location.coords,
    isFallbackLocation: location.isFallback,
    roadPoints,
    motions,
    destination:
      booking.choice === null
        ? null
        : {
            longitude: booking.choice.place.longitude,
            latitude: booking.choice.place.latitude,
          },
    driverPosition,
    driverKind: ride.ride?.tier ?? 'eco',
  });

  const rideStatus = ride.ride?.status ?? null;

  // Cadrages de la carte pendant le suivi : recadrages automatiques aux
  // changements de statut, et retour a la vue d'ensemble a la demande.
  const camera = useRideCamera(rideStatus, approach.points, booking.routePoints);

  // Incremente a chaque appui sur "recentrer" : voir `recenterToken` dans
  // MapCanvas.
  const [recenterToken, setRecenterToken] = useState(0);

  const handleRecenter = () => setRecenterToken((token) => token + 1);

  /**
   * Ecran de recherche de destination.
   *
   * Pas de librairie de navigation pour l'instant (R18 : aucune dependance
   * sans necessite) — l'app n'a que deux ecrans et la recherche se superpose a
   * l'accueil. `null` = accueil seul ; une chaine = recherche ouverte, avec la
   * saisie initiale venant eventuellement d'un raccourci.
   */
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  const handleSearchPress = () => setSearchQuery('');

  const handleShortcutPress = (shortcut: Shortcut) => {
    // Le libelle du raccourci sert d'amorce de recherche. Quand le profil
    // utilisateur existera, un raccourci portera son adresse enregistree et
    // ouvrira directement l'estimation.
    setSearchQuery(shortcut.label);
  };

  const handleDestinationConfirm = (choice: DestinationChoice) => {
    setSearchQuery(null);
    booking.start(choice);
  };

  /**
   * "Commander" : cree la course et lance la recherche d'un chauffeur.
   *
   * Le montant envoye est celui du palier retenu. Il sera recalcule par le
   * backend a l'arrivee de l'API : un prix venu du telephone ne fait pas foi
   * (R13).
   */
  const selectedFare = booking.fares.find(
    (item) => item.tier === booking.selectedTier,
  );

  /** "Commander" (estimation) : passe au choix du mode de paiement. */
  const handleGoToPayment = () => {
    payment.reset();
    setIsPaying(true);
  };

  /** Ferme le paiement et revient a l'estimation, itineraire conserve. */
  const handleCancelPayment = () => {
    payment.reset();
    setIsPaying(false);
  };

  /**
   * Monnaie en especes, recalculee a chaque frappe : le passager voit ce que le
   * chauffeur devra lui rendre avant meme de commander. `null` tant qu'aucune
   * somme n'est saisie.
   */
  const cashOffer = useMemo(() => {
    const bill = Number.parseInt(payment.billInput, 10);
    if (!Number.isFinite(bill) || bill <= 0 || selectedFare === undefined) {
      return null;
    }
    return computeCashOffer(selectedFare.amountXaf, bill);
  }, [payment.billInput, selectedFare]);

  /**
   * "Suivant" : les especes ouvrent la saisie de la monnaie, les autres modes
   * declenchent directement le debit — eux n'ont rien a annoncer au chauffeur.
   */
  const handleNextFromPayment = () => {
    if (selectedFare === undefined) return;

    if (payment.method === 'cash') {
      payment.openCash();
      return;
    }

    payment.confirm(selectedFare.amountXaf);
  };

  /**
   * Especes : la somme annoncee validee, on commande sans etape de paiement.
   * Le verdict `due` est enregistre au passage — c'est lui qui porte la monnaie
   * dans l'historique du paiement.
   */
  const handleOrderWithCash = () => {
    if (selectedFare === undefined) return;
    payment.confirm(selectedFare.amountXaf, cashOffer);
    handleOrder();
  };

  const handleOrder = () => {
    const choice = booking.choice;
    const fare = selectedFare;
    if (choice === null || fare === undefined) return;

    setIsPaying(false);

    ride.request({
      origin: location.coords,
      destination: {
        longitude: choice.place.longitude,
        latitude: choice.place.latitude,
      },
      destinationLabel: choice.place.label,
      tier: fare.tier,
      amountXaf: fare.amountXaf,
      // Le chauffeur voit la monnaie a prevoir sur la demande de course : s'il
      // ne peut pas rendre, il refuse et la course repart vers un autre.
      cash: payment.method === 'cash' ? cashOffer : null,
    });
  };

  /** Annule la course et revient a l'estimation, itineraire conserve. */
  const handleCancelRide = () => ride.cancel();

  /** Course terminee : on efface tout et on revient a l'accueil. */
  const handleRideDone = () => {
    ride.cancel();
    booking.cancel();
    payment.reset();
  };

  if (searchQuery !== null) {
    return (
      <DestinationSearchScreen
        origin={location.coords}
        initialQuery={searchQuery}
        onClose={() => setSearchQuery(null)}
        onConfirm={handleDestinationConfirm}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <MapCanvas
        center={location.coords}
        zoom={DEFAULT_REGION.zoom}
        markers={markers}
        onRoadsAvailable={handleRoadsAvailable}
        recenterToken={recenterToken}
        // Le sheet masque le bas de l'ecran : la carte reste plein ecran et
        // passe dessous, mais son centre optique remonte au milieu de la zone
        // visible pour que la position de l'utilisateur y soit centree.
        bottomPadding={SHEET_HEIGHT + insets.bottom}
        route={booking.routePoints}
        fitRouteToken={booking.fitRouteToken}
        // Le trajet d'approche n'est trace que pendant qu'il sert : une fois le
        // passager a bord, il n'a plus rien a dire et encombrerait la carte.
        approach={rideStatus === 'accepted' ? approach.points : undefined}
        fitPoints={camera.fitPoints}
        fitPointsToken={camera.fitPointsToken}
        fitPointsPadding={camera.fitPointsPadding}
      />

      <HomeHeader
        nearbyCount={NEARBY_VEHICLES.length}
        userInitial={DEMO_USER_INITIAL}
        onMenuPress={() => {}}
        onProfilePress={() => {}}
      />

      <View style={styles.bottomStack} pointerEvents="box-none">
        <LocationNotice
          status={location.status}
          cityLabel={DEFAULT_REGION.cityLabel}
        />

        <View style={styles.recenterRow} pointerEvents="box-none">
          {/*
            Cadrage sur l'itineraire en cours, a cote du recentrage : les deux
            repondent a la meme envie — "remets la carte comme il faut" — l'un
            sur soi, l'autre sur le trajet. Il n'apparait que s'il y a un trajet
            a cadrer.
          */}
          {camera.activeRoutePoints.length >= 2 && (
            <Pressable
              style={styles.recenterButton}
              onPress={camera.fitActiveRoute}
              accessibilityRole="button"
              accessibilityLabel="Afficher tout l’itinéraire"
            >
              <Ionicons name="git-branch" size={20} color={colors.text} />
            </Pressable>
          )}

          <Pressable
            style={styles.recenterButton}
            onPress={handleRecenter}
            accessibilityRole="button"
            accessibilityLabel="Recentrer sur ma position"
          >
            <Ionicons name="locate" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/*
          Une course en preparation remplace le sheet de saisie par
          l'estimation : les deux repondent a la meme question, "ou va-t-on",
          et les empiler laisserait un champ de recherche sous un trajet deja
          choisi.
        */}
        {/*
          Une fois le tarif retenu, l'estimation cede la place au paiement puis,
          la course commandee, a la recherche de chauffeur et a sa fiche :
          quatre etats successifs d'une meme question, jamais empiles.
        */}
        {ride.isCreating || ride.error !== null ||
        (ride.ride !== null && ride.ride.status === 'searching') ? (
          <SearchingDriverSheet
            destinationLabel={booking.choice?.place.label ?? ''}
            tier={booking.selectedTier}
            amountXaf={
              booking.fares.find((item) => item.tier === booking.selectedTier)
                ?.amountXaf ?? 0
            }
            error={ride.error}
            notice={ride.ride?.declineReason ?? null}
            onRetry={handleOrder}
            onCancel={handleCancelRide}
          />
        ) : ride.ride !== null && ride.ride.driver !== null ? (
          <RideTrackingSheet
            ride={ride.ride}
            driver={ride.ride.driver}
            onCancel={handleCancelRide}
            onSos={safety.sos}
            onShare={safety.share}
            onDone={handleRideDone}
          />
        ) : isPaying && payment.step === 'cash' && booking.choice !== null ? (
          <CashChangeSheet
            destinationLabel={booking.choice.place.label}
            distanceMeters={booking.distanceMeters}
            tier={booking.selectedTier}
            amountXaf={selectedFare?.amountXaf ?? 0}
            billInput={payment.billInput}
            onChangeBill={payment.setBillInput}
            offer={cashOffer}
            onOrder={handleOrderWithCash}
            onBack={payment.back}
          />
        ) : isPaying && booking.choice !== null ? (
          <PaymentSheet
            destinationLabel={booking.choice.place.label}
            distanceMeters={booking.distanceMeters}
            tier={booking.selectedTier}
            amountXaf={selectedFare?.amountXaf ?? 0}
            selectedMethod={payment.method}
            onSelectMethod={payment.selectMethod}
            payment={payment.payment}
            isProcessing={payment.isProcessing}
            isSettled={payment.isSettled}
            onNext={handleNextFromPayment}
            onContinue={handleOrder}
            onBack={handleCancelPayment}
          />
        ) : booking.choice === null ? (
          <DestinationSheet
            shortcuts={SHORTCUTS}
            onSearchPress={handleSearchPress}
            onShortcutPress={handleShortcutPress}
          />
        ) : (
          <FareSheet
            destinationLabel={booking.choice.place.label}
            fares={booking.fares}
            selectedTier={booking.selectedTier}
            onSelectTier={booking.selectTier}
            distanceMeters={booking.distanceMeters}
            isLoading={booking.isLoading}
            error={booking.error}
            onRetry={booking.retry}
            onConfirm={handleGoToPayment}
            onCancel={booking.cancel}
          />
        )}
      </View>
    </View>
  );
}

const RECENTER = 46;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mapFallback,
  },
  // Empile bandeau + bouton recentrer + sheet, ancres en bas de l'ecran.
  bottomStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
  },
  // Les boutons de cadrage, alignes a droite : itineraire puis position.
  recenterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  recenterButton: {
    width: RECENTER,
    height: RECENTER,
    borderRadius: RECENTER / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
});
