import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  LogManager,
  Map,
  Marker,
  type CameraRef,
  type MapRef,
} from '@maplibre/maplibre-react-native';

import { colors, spacing, typography } from '../../theme';
import { env } from '../../config/env';
import { useDriverMapStyle } from './useDriverMapStyle';
import { DriverApproachLine, DriverRouteLine } from './DriverRouteLine';

/**
 * Carte du mode chauffeur (R11, R16).
 *
 * Copie dediee de `MapCanvas` : le dashboard et la course chauffeur n'ont
 * besoin ni des vehicules alentour, ni du cap oriente des marqueurs, ni des
 * cadrages multi-points du suivi passager — seulement d'un centre, d'un
 * marqueur et d'un trace d'itineraire. Ajouter ces props au `MapCanvas`
 * passager pour ce seul besoin l'aurait complique pour un cas qu'il ne sert
 * pas ; on duplique a la place.
 */

LogManager.setLogLevel('error');

export type DriverMapMarker = {
  id: string;
  longitude: number;
  latitude: number;
  render: () => React.ReactElement;
};

type Props = {
  center: { longitude: number; latitude: number };
  zoom: number;
  markers: DriverMapMarker[];
  pitch?: number;
  bottomPadding?: number;
  /** Itineraire de la course : du client a sa destination. */
  route?: { longitude: number; latitude: number }[];
  /** Trajet d'approche du chauffeur vers son client, en pointilles. */
  approach?: { longitude: number; latitude: number }[];
  /** Increment pour recentrer la camera sur `center`. */
  recenterToken?: number;
  /** Increment pour cadrer la camera sur `approach` + `route`. */
  fitRouteToken?: number;
};

const DriverMapBearingContext = createContext(0);

/**
 * Cap courant de la camera, a lire depuis un marqueur oriente : son contenu
 * est pose a plat sur l'ecran et doit compenser la rotation de la carte pour
 * rester aligne sur sa rue.
 */
export function useDriverMapBearing(): number {
  return useContext(DriverMapBearingContext);
}

/**
 * Meme inclinaison que la carte passager : a plat, la carte se lit comme un
 * plan et non comme une vue de conduite, et le vehicule vu de dessus perd son
 * relief. Le chauffeur doit retrouver la meme carte que son client.
 */
const DEFAULT_PITCH = 25;
const RECENTER_DURATION_MS = 1200;
const FIT_PADDING_TOP = 100;
const FIT_PADDING_SIDE = 60;
const FIT_PADDING_BOTTOM = 280;


export function DriverMapCanvas({
  center,
  zoom,
  markers,
  pitch = DEFAULT_PITCH,
  bottomPadding = 0,
  route,
  approach,
  recenterToken = 0,
  fitRouteToken = 0,
}: Props) {
  const mapStyle = useDriverMapStyle();
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);

  const bottomPaddingRef = useRef(bottomPadding);
  bottomPaddingRef.current = bottomPadding;

  useEffect(() => {
    if (recenterToken === 0) return;
    try {
      cameraRef.current?.flyTo({
        center: [center.longitude, center.latitude],
        zoom,
        pitch,
        bearing: 0,
        padding: { top: 0, right: 0, bottom: bottomPaddingRef.current, left: 0 },
        duration: RECENTER_DURATION_MS,
      });
    } catch (error) {
      console.warn('Recentrage ignore : camera indisponible', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterToken]);

  const routeRef = useRef(route);
  routeRef.current = route;
  const approachRef = useRef(approach);
  approachRef.current = approach;

  // Vrai des qu'un cadrage a eu lieu : la camera cesse alors de suivre
  // `center`/`zoom` (voir le commentaire sur `<Camera>`).
  const [hasFitted, setHasFitted] = useState(false);

  // Retour hors course : la camera reprend le suivi de la position.
  useEffect(() => {
    if (fitRouteToken === 0) setHasFitted(false);
  }, [fitRouteToken]);

  // Valeurs figees au moment du cadrage : la camera garde des props stables
  // (voir `<Camera>`) au lieu de les voir bouger avec le vehicule.
  const lastCenter = useRef<[number, number]>([center.longitude, center.latitude]);
  const lastZoom = useRef(zoom);
  if (!hasFitted) {
    lastCenter.current = [center.longitude, center.latitude];
    lastZoom.current = zoom;
  }
  const frozenCenter = lastCenter.current;
  const frozenZoom = lastZoom.current;

  useEffect(() => {
    if (fitRouteToken === 0) return;

    // Les deux traces sont cadres ensemble : le chauffeur doit voir d'un coup
    // tout son trajet, de sa position jusqu'a la destination du client.
    const points = [...(approachRef.current ?? []), ...(routeRef.current ?? [])];
    if (points.length < 2) return;

    setHasFitted(true);

    let west = points[0].longitude;
    let east = points[0].longitude;
    let south = points[0].latitude;
    let north = points[0].latitude;

    for (const point of points) {
      if (point.longitude < west) west = point.longitude;
      if (point.longitude > east) east = point.longitude;
      if (point.latitude < south) south = point.latitude;
      if (point.latitude > north) north = point.latitude;
    }

    // UN SEUL cadrage, anime. Un second `fitBounds` enchaine ne resserrait
    // rien : ajouter de la marge sur les quatre cotes ELARGIT le cadre, donc
    // la carte se dezoomait au moment meme ou le vehicule demarrait.
    try {
      cameraRef.current?.fitBounds([west, south, east, north], {
        padding: {
          top: FIT_PADDING_TOP,
          right: FIT_PADDING_SIDE,
          bottom: FIT_PADDING_BOTTOM,
          left: FIT_PADDING_SIDE,
        },
        duration: RECENTER_DURATION_MS,
      });
    } catch (error) {
      console.warn('Cadrage ignore : camera indisponible', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRouteToken]);

  // Cap de la camera, n'est enregistre que s'il a bouge d'au moins un degre :
  // la carte emet un evenement par image pendant un geste, et les repercuter
  // tous re-rendrait l'ecran a la meme cadence.
  const [bearing, setBearing] = useState(0);
  const trackBearing = (next: number) => {
    setBearing((current) => (Math.abs(next - current) < 1 ? current : next));
  };

  if (!env.hasMapStyle) {
    return <MapUnavailable />;
  }

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
      touchPitch={false}
      onRegionIsChanging={(event) => trackBearing(event.nativeEvent.bearing)}
      onRegionDidChange={(event) => trackBearing(event.nativeEvent.bearing)}
    >
      {/*
        IMPORTANT — la camera ne suit `center`/`zoom` que TANT QU'AUCUN
        cadrage n'a eu lieu. Une fois le trajet cadre, on FIGE ces props sur
        leur derniere valeur au lieu de les retirer : chaque nouvelle position
        du vehicule (huit fois par seconde) reappliquerait sinon le zoom par
        defaut et defairait le cadrage — la carte se dezoomait des que la
        voiture demarrait. Les retirer purement et simplement ne marche pas
        non plus : MapLibre lit l'absence de prop comme une remise a zero et
        la camera saute. Elle est ensuite pilotee par `flyTo` / `fitBounds`.
      */}
      <Camera
        ref={cameraRef}
        center={frozenCenter}
        zoom={frozenZoom}
        pitch={pitch}
        padding={{ top: 0, right: 0, bottom: bottomPadding, left: 0 }}
        duration={600}
      />

      <DriverApproachLine points={approach ?? []} />
      <DriverRouteLine points={route ?? []} />

      <DriverMapBearingContext.Provider value={bearing}>
        {markers.map((marker) => (
          <Marker key={marker.id} id={marker.id} lngLat={[marker.longitude, marker.latitude]}>
            {marker.render()}
          </Marker>
        ))}
      </DriverMapBearingContext.Provider>
    </Map>
  );
}

function MapUnavailable() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.fallback]}>
      <Text style={styles.fallbackTitle}>Carte indisponible</Text>
      <Text style={styles.fallbackBody}>
        Renseignez EXPO_PUBLIC_MAPTILER_KEY dans .env, puis relancez l'application.
      </Text>
    </View>
  );
}

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
