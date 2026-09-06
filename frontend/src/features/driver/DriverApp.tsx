import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, SHEET_HEIGHT, spacing } from '../../theme';
import { DEFAULT_REGION } from '../../config/env';
import { useDriverSession, DEMO_DRIVER } from './useDriverSession';
import { useDriverTripGeometry } from './useDriverTripGeometry';
import { DriverMapCanvas, type DriverMapMarker } from './DriverMapCanvas';
import { DriverVehicleMarker } from './DriverVehicleMarker';
import { DriverMapControls } from './DriverMapControls';
import { DriverDashboardScreen } from './DriverDashboardScreen';
import { IncomingRequestOverlay } from './IncomingRequestOverlay';
import { DriverTripScreen } from './DriverTripScreen';
import { DriverProfileScreen } from './DriverProfileScreen';
import { DriverEarningsScreen } from './DriverEarningsScreen';

/**
 * Racine du parcours chauffeur.
 *
 * Tableau de bord (statut, gains, vehicule) -> demande entrante en overlay
 * avec compte a rebours -> course en 4 etapes jusqu'a l'encaissement ->
 * retour au tableau de bord, gains mis a jour. Le profil chauffeur est le
 * seul endroit d'ou l'on se deconnecte (R6 : pas de navigation par
 * bibliotheque, un etat local par ecran, comme `useHomeNavigation`).
 *
 * IMPORTANT — la carte est montee ICI, une seule fois, et non dans chaque
 * ecran : le tableau de bord et la course partagent la MEME instance. Le
 * chauffeur voit donc son vehicule se mettre en route depuis sa position
 * actuelle a l'acceptation, sans que la carte ne disparaisse et ne se
 * recharge entre les deux ecrans.
 */
export function DriverApp() {
  const session = useDriverSession();
  const insets = useSafeAreaInsets();

  const hasTrip = session.route === 'trip' && session.request !== null;
  const { points, routes, vehiclePosition } = useDriverTripGeometry(
    hasTrip,
    session.stage,
  );

  // La camera cadre les deux traces des qu'ils sont calcules : le chauffeur
  // voit d'un coup son trajet vers le client ET la course qui suit. Le meme
  // jeton sert au bouton "afficher tout l'itineraire" (R11 : un increment,
  // pas un appel direct a la camera depuis un ecran).
  const [fitToken, setFitToken] = useState(0);
  const hasRoutes = routes.toPickup.length >= 2 && routes.toDestination.length >= 2;
  useEffect(() => {
    if (!hasRoutes) return;
    setFitToken((token) => token + 1);
  }, [hasRoutes]);

  // Recentrage sur le vehicule, a la demande du chauffeur.
  const [recenterToken, setRecenterToken] = useState(0);

  // Revenus du jour : ecran plein, comme le profil. La carte est demontee le
  // temps de la consultation — le chauffeur lit une liste, pas un plan.
  if (session.route === 'earnings') {
    return <DriverEarningsScreen onClose={session.closeEarnings} />;
  }

  if (session.route === 'profile') {
    return (
      <DriverProfileScreen
        earningsTodayXaf={session.earningsTodayXaf}
        ridesToday={session.ridesToday}
        onClose={session.closeProfile}
        onOpenEarnings={() => session.openEarnings('profile')}
      />
    );
  }

  const markers: DriverMapMarker[] = [];

  if (hasTrip) {
    markers.push(
      {
        id: 'driver-pickup',
        longitude: points.pickup.longitude,
        latitude: points.pickup.latitude,
        render: () => <Ionicons name="person-circle" size={26} color={colors.text} />,
      },
      {
        id: 'driver-destination',
        longitude: points.destination.longitude,
        latitude: points.destination.latitude,
        render: () => <Ionicons name="location" size={26} color={colors.primary} />,
      },
    );
  }

  markers.push({
    id: 'driver-vehicle',
    longitude: vehiclePosition.longitude,
    latitude: vehiclePosition.latitude,
    render: () => (
      <DriverVehicleMarker
        kind={DEMO_DRIVER.vehicleTier}
        bearing={vehiclePosition.bearing}
      />
    ),
  });

  return (
    <View style={styles.root}>
      <DriverMapCanvas
        center={vehiclePosition}
        zoom={DEFAULT_REGION.zoom}
        markers={markers}
        approach={hasTrip ? routes.toPickup : undefined}
        route={hasTrip ? routes.toDestination : undefined}
        fitRouteToken={hasTrip ? fitToken : 0}
        recenterToken={recenterToken}
        bottomPadding={SHEET_HEIGHT + insets.bottom}
      />

      {hasTrip && session.request !== null ? (
        <DriverTripScreen
          request={session.request}
          stage={session.stage}
          isRouteLoading={routes.isLoading}
          onAdvance={session.advanceStage}
          onFinish={session.finishTrip}
        />
      ) : (
        <DriverDashboardScreen
          isOnline={session.isOnline}
          earningsTodayXaf={session.earningsTodayXaf}
          ridesToday={session.ridesToday}
          distanceTodayMeters={session.distanceTodayMeters}
          onToggleOnline={(value) => (value ? session.goOnline() : session.goOffline())}
          onOpenProfile={session.openProfile}
          onOpenEarnings={() => session.openEarnings('dashboard')}
        />
      )}

      {/*
        Poses juste au-dessus du panneau, APRES les ecrans pour rester
        au-dessus d'eux, et valables sur les DEUX : la carte etant partagee,
        les commandes de cadrage le sont aussi.
      */}
      <View
        style={[styles.controls, { bottom: SHEET_HEIGHT + insets.bottom + spacing.md }]}
        pointerEvents="box-none"
      >
        <DriverMapControls
          onFitRoute={
            hasTrip && hasRoutes ? () => setFitToken((token) => token + 1) : undefined
          }
          onRecenter={() => setRecenterToken((token) => token + 1)}
        />
      </View>

      {session.route === 'incoming_request' && session.request !== null && (
        <IncomingRequestOverlay
          request={session.request}
          secondsLeft={session.secondsLeft}
          onAccept={session.acceptRequest}
          onRefuse={session.refuseRequest}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mapFallback,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
