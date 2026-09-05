import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';

import { colors, spacing, typography } from '../../theme';
import { env, DEFAULT_REGION } from '../../config/env';
import { useMapStyle } from './useMapStyle';

/**
 * Encapsulation du fournisseur de carte (R11).
 *
 * Aucun autre fichier n'importe MapLibre directement : changer de moteur ou de
 * fournisseur de tuiles ne doit toucher que ce fichier. Les composants
 * appelants manipulent des `MapMarker`, pas des types MapLibre.
 *
 * NOTE : API MapLibre RN v11 — composants nommes `Map` / `Camera` / `Marker`
 * (et non MapView / MarkerView des versions <= 10), et pas de token d'acces a
 * poser : MapLibre est libre, contrairement a Mapbox.
 */

export type MapMarker = {
  id: string;
  longitude: number;
  latitude: number;
  render: () => React.ReactElement;
};


type Props = {
  center: { longitude: number; latitude: number };
  zoom: number;
  markers: MapMarker[];
  /**
   * Inclinaison de la camera en degres. 0 = vue verticale, 50-60 = vue
   * perspective. Voir DEFAULT_PITCH.
   */
  pitch?: number;
};

/**
 * Inclinaison par defaut de la camera.
 *
 * Une carte inclinee donne de la profondeur et rapproche l'app des references
 * du secteur. On reste a 50 : au-dela, l'horizon entre dans le cadre et les
 * marqueurs lointains deviennent minuscules.
 */
export const DEFAULT_PITCH = 50;

export function MapCanvas({
  center,
  zoom,
  markers,
  pitch = DEFAULT_PITCH,
}: Props) {
  const mapStyle = useMapStyle();

  // Pas de style disponible (cle absente) : on affiche un fond neutre plutot
  // que de laisser MapLibre echouer sur une URL nulle (R8).
  if (!env.hasMapStyle) {
    return <MapUnavailable />;
  }

  // Le style est en cours de telechargement : fond neutre, sans message. La
  // carte apparait des qu'il est pret.
  if (mapStyle.status === 'loading') {
    return <View style={[StyleSheet.absoluteFill, styles.loading]} />;
  }

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={mapStyle.style}
      logo={false}
      compass={false}
      attributionPosition={{ bottom: 8, left: 8 }}
      // L'inclinaison est un parti pris de l'ecran, pas un reglage utilisateur :
      // on verrouille le geste a deux doigts qui la modifie. Deplacement, zoom
      // et rotation restent libres.
      touchPitch={false}
    >
      <Camera
        center={[center.longitude, center.latitude]}
        zoom={zoom}
        pitch={pitch}
        duration={600}
      />

      {markers.map((marker) => (
        <Marker
          key={marker.id}
          id={marker.id}
          lngLat={[marker.longitude, marker.latitude]}
        >
          {marker.render()}
        </Marker>
      ))}
    </Map>
  );
}

/**
 * Etat degrade : la cle de tuiles n'est pas configuree. On le dit clairement
 * au lieu d'afficher un ecran blanc muet.
 */
function MapUnavailable() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.fallback]}>
      <Text style={styles.fallbackTitle}>Carte indisponible</Text>
      <Text style={styles.fallbackBody}>
        Renseignez EXPO_PUBLIC_MAPTILER_KEY dans .env, puis relancez
        l'application.
      </Text>
    </View>
  );
}

export { DEFAULT_REGION };

const styles = StyleSheet.create({
  loading: {
    backgroundColor: colors.mapFallback,
  },
  fallback: {
    backgroundColor: colors.mapFallback,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.sm,
  },
  fallbackTitle: {
    ...typography.subtitle,
  },
  fallbackBody: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
