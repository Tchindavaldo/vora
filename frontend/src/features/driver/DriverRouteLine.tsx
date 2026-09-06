import React from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import { colors } from '../../theme';

/**
 * Trace d'itineraire du mode chauffeur (R16).
 *
 * Copie dediee de `RouteLine` (feature `map`, cote passager) : le trait est
 * identique aujourd'hui, mais reste un composant de rendu propre a l'ecran
 * chauffeur — s'il doit un jour distinguer visuellement l'approche vers le
 * client de la route vers la destination, cette copie evolue seule.
 */

type Point = { longitude: number; latitude: number };

const ROUTE_WIDTH = 5;

function toLineString(points: Point[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: points.map((point) => [point.longitude, point.latitude]),
    },
  };
}

/**
 * Trajet d'approche du chauffeur vers son client.
 *
 * Pointilles sombres, comme cote passager : les deux traces coexistent a
 * l'ecran des l'acceptation, et deux lignes pleines orange seraient
 * indiscernables alors qu'elles n'ont pas le meme sens — l'une est le chemin
 * du chauffeur vers le client, l'autre celui de la course.
 */
export function DriverApproachLine({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  return (
    <GeoJSONSource id="driver-approach" data={toLineString(points)}>
      <Layer
        id="driver-approach-line"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': colors.text,
          'line-width': ROUTE_WIDTH - 1,
          'line-opacity': 0.45,
          'line-dasharray': [1.5, 1.5],
        }}
      />
    </GeoJSONSource>
  );
}

/** Itineraire de la course elle-meme : client -> destination. */
export function DriverRouteLine({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  return (
    <GeoJSONSource id="driver-route" data={toLineString(points)}>
      <Layer
        id="driver-route-casing"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': colors.text,
          'line-width': ROUTE_WIDTH + 3,
          'line-opacity': 0.25,
        }}
      />
      <Layer
        id="driver-route-line"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': colors.primary,
          'line-width': ROUTE_WIDTH,
        }}
      />
    </GeoJSONSource>
  );
}
