import React from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import { colors } from '../../theme';

/**
 * Traces poses sur la carte : la course elle-meme et l'approche du chauffeur.
 *
 * Extrait de `MapCanvas` pour le garder sous la limite de taille (R4). Reste le
 * seul autre fichier a importer MapLibre, avec `MapCanvas` : les ecrans, eux,
 * ne manipulent que des listes de points (R11).
 */

type Point = { longitude: number; latitude: number };

/** Epaisseur du trace, en pixels. */
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

/** Itineraire de la course, du depart a la destination. */
export function RouteLine({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  return (
    <GeoJSONSource id="route" data={toLineString(points)}>
      {/*
        Deux couches : un liset sombre sous le trace, pour que la ligne reste
        lisible aussi bien sur l'asphalte gris que sur les zones claires de la
        carte.
      */}
      <Layer
        id="route-casing"
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': colors.text,
          'line-width': ROUTE_WIDTH + 3,
          'line-opacity': 0.25,
        }}
      />
      <Layer
        id="route-line"
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

/** Trajet d'approche du chauffeur vers le passager. */
export function ApproachLine({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  return (
    <GeoJSONSource id="approach" data={toLineString(points)}>
      {/*
        Pointilles sombres : le trajet d'approche coexiste a l'ecran avec celui
        de la course. Une seconde ligne pleine orange les rendrait
        indiscernables, alors qu'ils n'ont pas le meme sens — l'un est le chemin
        du chauffeur vers vous, l'autre le votre.
      */}
      <Layer
        id="approach-line"
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
