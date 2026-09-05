import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { MapCanvas, type MapMarker } from '../map/MapCanvas';
import { colors, radius, shadows, spacing } from '../../theme';
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

  const markers = useMemo<MapMarker[]>(() => {
    // Tant que les positions ne sont pas arretees, aucun vehicule : voir le
    // commentaire sur `roadPoints`.
    const vehicles: MapMarker[] =
      roadPoints === null
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

    return vehicles;
  }, [location.coords, location.isFallback, roadPoints, motions]);

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
        onRoadsAvailable={handleRoadsAvailable}
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
