import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { MapCanvas, type MapMarker } from '../map/MapCanvas';
import { colors, radius, shadows, spacing } from '../../theme';
import { DEFAULT_REGION } from '../../config/env';

import { useUserLocation } from './useUserLocation';
import { HomeHeader } from './components/HomeHeader';
import { DestinationSheet, type Shortcut } from './components/DestinationSheet';
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

  // Les vehicules de demo sont positionnes RELATIVEMENT a l'utilisateur, pour
  // rester visibles quelle que soit la ville affichee.
  const markers = useMemo<MapMarker[]>(() => {
    const vehicles: MapMarker[] = NEARBY_VEHICLES.map((vehicle) => ({
      id: vehicle.id,
      longitude: location.coords.longitude + vehicle.offsetLng,
      latitude: location.coords.latitude + vehicle.offsetLat,
      render: () => <VehicleMarker kind={vehicle.kind} />,
    }));

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

    return vehicles;
  }, [location.coords, location.isFallback]);

  const handleSearchPress = () => {
    // TODO: naviguer vers l'ecran de recherche de destination.
  };

  const handleShortcutPress = (_shortcut: Shortcut) => {
    // TODO: pre-remplir la destination puis ouvrir l'estimation.
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <MapCanvas
        center={location.coords}
        zoom={DEFAULT_REGION.zoom}
        markers={markers}
      />

      <HomeHeader
        nearbyCount={NEARBY_VEHICLES.length}
        areaLabel={location.isFallback ? DEFAULT_REGION.cityLabel : DEMO_AREA_LABEL}
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
            accessibilityRole="button"
            accessibilityLabel="Recentrer sur ma position"
          >
            <Ionicons name="locate" size={20} color={colors.text} />
          </Pressable>
        </View>

        <DestinationSheet
          shortcuts={SHORTCUTS}
          onSearchPress={handleSearchPress}
          onShortcutPress={handleShortcutPress}
        />
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
