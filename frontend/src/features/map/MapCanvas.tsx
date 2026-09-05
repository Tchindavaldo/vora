import React, { createContext, useContext, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  LogManager,
  Map,
  Marker,
  type MapRef,
} from '@maplibre/maplibre-react-native';

import type { RoadQueryTarget } from '../../services/roadsFromMap';

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

/**
 * Seules les erreurs remontent des couches natives de MapLibre.
 *
 * Le style MapTiler declenche a chaque chargement une dizaine de
 * "ParseStyle: layer doesn't support this property" et un
 * "source must have tiles" (sa source d'attribution ne porte pas de tuiles).
 * Ces avertissements viennent du style amont, pas de notre code, et ne
 * changent rien au rendu : ils ne font que noyer les logs utiles.
 */
LogManager.setLogLevel('error');

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
 * la carte. Un vehicule aligne sur un cap geographique se retrouve donc de
 * travers des que l'utilisateur fait pivoter la vue. On publie le cap courant
 * pour qu'il puisse le compenser.
 */
const MapBearingContext = createContext(0);

/**
 * Cap courant de la camera.
 *
 * Un marqueur oriente geographiquement doit tourner de
 * `capGeographique - capCamera` pour rester parallele a sa rue.
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
  /**
   * Appele quand les tuiles sont dessinees et que la carte peut renseigner sur
   * ce qu'elle affiche — les routes, notamment.
   *
   * L'objet transmis n'expose que l'interrogation des routes : les ecrans ne
   * manipulent jamais l'API MapLibre elle-meme (R11).
   */
  onRoadsAvailable?: (map: RoadQueryTarget) => void;
  /**
   * Compteur de recentrage : chaque increment ramene la camera sur `center`.
   *
   * La `Camera` MapLibre est declarative — elle ne bouge que si une de ses
   * props change. Apres un deplacement au doigt, le centre demande est
   * inchange : repasser la meme valeur ne provoquerait rien. On fait donc
   * varier une prop dont c'est le seul role, plutot que d'exposer aux ecrans
   * une ref imperative sur la camera (R11).
   */
  recenterToken?: number;
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
  onRoadsAvailable,
  recenterToken = 0,
}: Props) {
  const mapStyle = useMapStyle();
  const mapRef = useRef<MapRef>(null);

  // Cap courant de la camera, pour que les marqueurs orientes restent alignes
  // sur leur rue pendant que l'utilisateur fait pivoter la carte.
  const [bearing, setBearing] = useState(0);

  /**
   * N'enregistre le cap que s'il a change de facon perceptible.
   *
   * La carte emet un evenement par image pendant un geste. Repercuter chacun
   * d'eux re-rendrait tout l'ecran a la meme cadence — assez pour empecher les
   * effets asynchrones d'aboutir. Un degre est en-deca de ce qui se voit sur
   * une icone de 38 px.
   */
  const trackBearing = (next: number) => {
    setBearing((current) => (Math.abs(next - current) < 1 ? current : next));
  };

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
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      mapStyle={mapStyle.style}
      logo={false}
      compass={false}
      attributionPosition={{ bottom: 8, left: 8 }}
      // L'inclinaison est un parti pris de l'ecran, pas un reglage utilisateur :
      // on verrouille le geste a deux doigts qui la modifie. Deplacement, zoom
      // et rotation restent libres.
      touchPitch={false}
      // Pendant le geste de rotation, et non seulement a la fin : sinon les
      // vehicules resteraient de travers tant que le doigt est sur l'ecran.
      onRegionIsChanging={(event) => trackBearing(event.nativeEvent.bearing)}
      onRegionDidChange={(event) => trackBearing(event.nativeEvent.bearing)}
      // "Fully" et non "onDidFinishRenderingMap" : c'est le seul moment ou les
      // tuiles sont reellement dessinees et ou les routes peuvent etre
      // interrogees. Plus tot, la carte repondrait une liste vide.
      onDidFinishRenderingMapFully={() => {
        const map = mapRef.current;
        if (map && onRoadsAvailable) {
          onRoadsAvailable({
            queryRenderedFeatures: (options) =>
              map.queryRenderedFeatures(options),
          });
        }
      }}
    >
      <Camera
        // Remonter la camera est ce qui la fait reappliquer son centre : c'est
        // le seul levier declaratif disponible quand seule la vue a bouge.
        key={recenterToken}
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
