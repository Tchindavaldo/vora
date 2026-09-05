import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapCanvas, type MapMarker } from '../map/MapCanvas';
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
import { DestinationPin } from '../booking/components/DestinationPin';
import { useRideRequest } from '../ride/useRideRequest';
import { SearchingDriverSheet } from '../ride/components/SearchingDriverSheet';
import { RideTrackingSheet } from '../ride/components/RideTrackingSheet';
import { useDriverApproach } from '../ride/useDriverApproach';
import { useApproachRoute } from '../ride/useApproachRoute';
import { LocationNotice } from './components/LocationNotice';
import { UserLocationDot } from './components/UserLocationDot';
import { VehicleMarker } from './components/VehicleMarker';
import {
  DEMO_AREA_LABEL,
  DEMO_USER_INITIAL,
  NEARBY_VEHICLES,
  SHORTCUTS,
} from './demoData';

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

  // Une fois un chauffeur assigne, la carte ne montre plus QUE le sien : les
  // vehicules disponibles alentour n'ont plus rien a dire, et les laisser
  // rendrait impossible de suivre celui qui vient vous chercher.
  const hasAssignedDriver = driverPosition !== null;

  const markers = useMemo<MapMarker[]>(() => {
    // Tant que les positions ne sont pas arretees, aucun vehicule : voir le
    // commentaire sur `roadPoints`.
    const vehicles: MapMarker[] =
      roadPoints === null || hasAssignedDriver
        ? []
        : NEARBY_VEHICLES.map((vehicle, index) => {
            // Position animee si elle existe, sinon la position posee sur la
            // route, sinon l'offset de demonstration (Overpass en echec, R8).
            const onRoad = motions[index] ?? roadPoints[index];

            return {
              id: vehicle.id,
              longitude:
                onRoad?.longitude ??
                location.coords.longitude + vehicle.offsetLng,
              latitude:
                onRoad?.latitude ?? location.coords.latitude + vehicle.offsetLat,
              render: () => (
                <VehicleMarker
                  kind={vehicle.kind}
                  bearing={onRoad?.bearing ?? vehicle.bearing}
                />
              ),
            };
          });

    // La position utilisateur n'est affichee que si elle est reelle : montrer
    // un point "vous etes ici" sur une ville par defaut serait un mensonge.
    if (!location.isFallback) {
      vehicles.push({
        id: 'user',
        longitude: location.coords.longitude,
        latitude: location.coords.latitude,
        render: () => <UserLocationDot />,
      });
    }

    // Destination de la course en preparation, a l'autre bout du trace.
    if (booking.choice !== null) {
      vehicles.push({
        id: 'destination',
        longitude: booking.choice.place.longitude,
        latitude: booking.choice.place.latitude,
        render: () => <DestinationPin />,
      });
    }

    // Chauffeur de la course : seul vehicule affiche a partir de son
    // affectation, oriente dans son sens de marche.
    if (driverPosition !== null) {
      vehicles.push({
        id: 'driver',
        longitude: driverPosition.longitude,
        latitude: driverPosition.latitude,
        render: () => (
          <VehicleMarker
            kind={ride.ride?.tier ?? 'eco'}
            bearing={driverPosition.bearing}
          />
        ),
      });
    }

    return vehicles;
  }, [
    location.coords,
    location.isFallback,
    roadPoints,
    motions,
    booking.choice,
    hasAssignedDriver,
    driverPosition,
    ride.ride?.tier,
  ]);

  /**
   * Recadrages de la carte pendant le suivi de course.
   *
   * Deux moments seulement, sur CHANGEMENT DE STATUT et non a chaque position
   * du vehicule : recadrer en continu empecherait l'utilisateur de deplacer la
   * carte, la camera lui reprenant la main a chaque image.
   *
   * - a l'acceptation : le chauffeur qui arrive ET la position du passager,
   *   pour voir l'approche se faire ;
   * - au demarrage : le vehicule ET la destination, vue globale du trajet.
   */
  const [fitPoints, setFitPoints] = useState<{ longitude: number; latitude: number }[]>(
    [],
  );
  const [fitPointsToken, setFitPointsToken] = useState(0);

  const rideStatus = ride.ride?.status ?? null;
  const approachReady = approach.points.length >= 2;

  useEffect(() => {
    if (rideStatus === 'accepted' && approachReady) {
      // Tout le trajet d'approche : ses extremites sont le chauffeur et le
      // passager, les points intermediaires evitent que la route sorte du
      // cadre dans un contournement.
      setFitPoints(approach.points);
      setFitPointsToken((token) => token + 1);
      return;
    }

    if (rideStatus === 'in_progress') {
      setFitPoints(booking.routePoints);
      setFitPointsToken((token) => token + 1);
    }
    // Sur le seul statut : voir le commentaire ci-dessus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideStatus, approachReady]);

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
  const handleOrder = () => {
    const choice = booking.choice;
    const fare = booking.fares.find((item) => item.tier === booking.selectedTier);
    if (choice === null || fare === undefined) return;

    ride.request({
      origin: location.coords,
      destination: {
        longitude: choice.place.longitude,
        latitude: choice.place.latitude,
      },
      destinationLabel: choice.place.label,
      tier: fare.tier,
      amountXaf: fare.amountXaf,
    });
  };

  /** Annule la course et revient a l'estimation, itineraire conserve. */
  const handleCancelRide = () => ride.cancel();

  /** Course terminee : on efface tout et on revient a l'accueil. */
  const handleRideDone = () => {
    ride.cancel();
    booking.cancel();
  };

  /**
   * Partage de course (R10) : le passager envoie a un proche le chauffeur, sa
   * plaque et sa destination. La feuille de partage du systeme est utilisee
   * plutot qu'un service maison — elle atteint tous les canaux deja installes
   * sur le telephone (WhatsApp en tete, a Douala).
   */
  const handleShareRide = () => {
    const current = ride.ride;
    if (current === null || current.driver === null) return;

    const message =
      `Je suis en course VORA vers ${current.destinationLabel}. ` +
      `Chauffeur : ${current.driver.name}, ${current.driver.vehicleModel} ` +
      `(${current.driver.plate}).`;

    Share.share({ message }).catch(() => {
      // Feuille de partage indisponible : on le dit plutot que d'echouer en
      // silence (R8).
      console.warn('[ride] partage de course indisponible');
      Alert.alert('Partage indisponible', 'Impossible d’ouvrir le partage.');
    });
  };

  /**
   * SOS (R10). ⚠️ SIMULE : sans backend, aucune alerte n'est reellement
   * transmise. On l'annonce a l'utilisateur au lieu de laisser croire qu'un
   * secours a ete prevenu (brief §23).
   */
  const handleSos = () => {
    Alert.alert(
      'Alerte d’urgence',
      'Démonstration : aucune alerte n’est réellement transmise. En production, ' +
        'votre position et les informations du chauffeur seraient envoyées à ' +
        'votre contact d’urgence et à l’assistance VORA.',
      [{ text: 'Fermer' }],
    );
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
        fitPoints={fitPoints}
        fitPointsToken={fitPointsToken}
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
          Une fois la course commandee, le panneau d'estimation cede la place a
          la recherche de chauffeur puis a sa fiche : trois etats successifs
          d'une meme question, jamais empiles.
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
            onRetry={handleOrder}
            onCancel={handleCancelRide}
          />
        ) : ride.ride !== null && ride.ride.driver !== null ? (
          <RideTrackingSheet
            ride={ride.ride}
            driver={ride.ride.driver}
            onCancel={handleCancelRide}
            onSos={handleSos}
            onShare={handleShareRide}
            onDone={handleRideDone}
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
            onConfirm={handleOrder}
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
  recenterRow: {
    alignItems: 'flex-end',
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
