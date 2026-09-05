import React, { createContext, useContext, useState } from 'react';
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

/**
 * Cap de la camera, en degres (0 = le nord est en haut de l'ecran).
 *
 * Le contenu d'un `Marker` est pose a plat sur l'ecran : il ne tourne PAS avec
 * la carte. Un marqueur oriente selon un cap geographique (un vehicule aligne
 * sur sa rue) se desaligne donc des que l'utilisateur fait pivoter la carte.
 *
 * On publie le cap courant pour que ces marqueurs puissent le compenser. Voir
 * `useMapBearing`.
 */
const MapBearingContext = createContext(0);

/**
 * Cap courant de la camera.
 *
 * Un marqueur oriente geographiquement doit tourner de
 * `capGeographique - capCamera` pour rester aligne sur le terrain.
 */
export function useMapBearing(): number {
  return useContext(MapBearingContext);
}


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
 * 25 degres et non 50 : les batiments en volume ayant ete retires du style, une
 * forte inclinaison n'aurait rien a mettre en relief — elle ne ferait qu'etirer
 * les rues vers l'horizon et rapetisser les marqueurs eloignes. Un leger angle
 * suffit a donner de la profondeur sans deformer le plan.
 *
 * Mettre 0 pour une vue strictement verticale.
 */
export const DEFAULT_PITCH = 25;

export function MapCanvas({
  center,
  zoom,
  markers,
  pitch = DEFAULT_PITCH,
}: Props) {
  const mapStyle = useMapStyle();

  // Cap courant de la camera, tenu a jour pendant que l'utilisateur fait
  // pivoter la carte, pour que les marqueurs orientes restent alignes.
  const [bearing, setBearing] = useState(0);

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
      // Pendant le geste de rotation, et non seulement a la fin : sans mise a
      // jour continue, les vehicules resteraient de travers tant que le doigt
      // n'a pas quitte l'ecran.
      onRegionIsChanging={(event) => setBearing(event.nativeEvent.bearing)}
      onRegionDidChange={(event) => setBearing(event.nativeEvent.bearing)}
    >
      <Camera
        center={[center.longitude, center.latitude]}
        zoom={zoom}
        pitch={pitch}
        duration={600}
      />

      <MapBearingContext.Provider value={bearing}>
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            id={marker.id}
            lngLat={[marker.longitude, marker.latitude]}
          >
            {marker.render()}
          </Marker>
        ))}
      </MapBearingContext.Provider>
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
