import { useEffect, useState } from 'react';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { env } from '../../config/env';

/**
 * Style de carte du mode chauffeur (R11, R16).
 *
 * Copie dediee de `useMapStyle` (feature `map`, cote passager) : meme
 * allegement du style distant, mais gardee independante pour ne jamais faire
 * porter a l'ecran passager un ajustement pense pour l'ecran chauffeur, et
 * inversement.
 */

const HIDDEN_SOURCE_LAYERS = ['building_number', 'tree', 'street_furniture'];

const HIDDEN_LAYER_IDS = [
  'Highway shields bicolor',
  'Highway shields bicolor top',
  'Roller coaster labels',
];

const EXTRUSION_LAYER_ID = 'Building 3D';

const BACKGROUND_COLORS: Record<string, string> = {
  Background: '#F5F5F3',
  Residential: '#ECECE8',
};

const ROAD_LABEL_LAYER_ID = 'Road labels';
const POI_MIN_ZOOM = 15.5;

const ROAD_LABEL_CLASSES = [
  'minor',
  'motorway',
  'primary',
  'raceway',
  'secondary',
  'service',
  'tertiary',
  'trunk',
  'residential',
  'living_street',
  'unclassified',
  'road',
];

const TEXT_SCALE = 0.85;

function scaleSize(value: unknown, factor: number): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === 'number') return value * factor;

  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'stops' in (value as Record<string, unknown>)
  ) {
    const legacy = value as { stops: [number, number][] };
    return {
      ...legacy,
      stops: legacy.stops.map(([zoom, size]) => [zoom, size * factor]),
    };
  }

  if (Array.isArray(value) && value[0] === 'interpolate') {
    return value.map((item, index) =>
      index >= 4 && index % 2 === 0 && typeof item === 'number' ? item * factor : item,
    );
  }

  return value;
}

type State =
  | { status: 'loading'; style: null }
  | { status: 'ready'; style: StyleSpecification }
  | { status: 'fallback'; style: string };

export function useDriverMapStyle(): State {
  const [state, setState] = useState<State>({ status: 'loading', style: null });

  useEffect(() => {
    let cancelled = false;
    const url = env.mapStyleUrl;

    if (!url) return;

    async function load(styleUrl: string) {
      try {
        const response = await fetch(styleUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const style = (await response.json()) as StyleSpecification;
        if (cancelled) return;

        const layers = style.layers
          .filter((layer) => {
            const source = (layer as { 'source-layer'?: string })['source-layer'];
            if (source && HIDDEN_SOURCE_LAYERS.includes(source)) return false;
            return !HIDDEN_LAYER_IDS.includes(layer.id);
          })
          .map((layer) => {
            const background = BACKGROUND_COLORS[layer.id];
            if (background) {
              const key =
                layer.type === 'background'
                  ? 'background-color'
                  : layer.type === 'fill'
                    ? 'fill-color'
                    : null;

              if (!key) return layer;

              return {
                ...layer,
                paint: {
                  ...(layer as { paint?: Record<string, unknown> }).paint,
                  [key]: background,
                },
              };
            }

            if (layer.id === EXTRUSION_LAYER_ID) {
              return {
                ...layer,
                paint: {
                  ...(layer as { paint?: Record<string, unknown> }).paint,
                  'fill-extrusion-height': 0,
                  'fill-extrusion-base': 0,
                  'fill-extrusion-opacity': 0.75,
                },
              };
            }

            if (layer.type !== 'symbol' || !layer.layout) return layer;

            const layout = layer.layout as Record<string, unknown>;

            const scaled =
              layout['text-size'] === undefined
                ? layer
                : {
                    ...layer,
                    layout: {
                      ...layout,
                      'text-size': scaleSize(layout['text-size'], TEXT_SCALE),
                    },
                  };

            if (layer.id === ROAD_LABEL_LAYER_ID) {
              return {
                ...scaled,
                filter: [
                  'all',
                  ['==', ['geometry-type'], 'LineString'],
                  ['match', ['get', 'class'], ROAD_LABEL_CLASSES, true, false],
                ],
                layout: {
                  ...scaled.layout,
                  'symbol-spacing': 700,
                  'text-padding': 14,
                  'symbol-sort-key': ['step', ['zoom'], 0, POI_MIN_ZOOM, 10],
                },
              };
            }

            const source = (layer as { 'source-layer'?: string })['source-layer'];
            if (source?.startsWith('poi_')) {
              return {
                ...scaled,
                minzoom: Math.max(layer.minzoom ?? 0, POI_MIN_ZOOM),
                layout: {
                  ...scaled.layout,
                  'text-optional': false,
                  'icon-optional': false,
                  'symbol-sort-key': ['step', ['zoom'], 10, POI_MIN_ZOOM, 0],
                },
              };
            }

            return scaled;
          });

        setState({
          status: 'ready',
          style: { ...style, layers } as StyleSpecification,
        });
      } catch {
        if (!cancelled) setState({ status: 'fallback', style: styleUrl });
      }
    }

    load(url);

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
