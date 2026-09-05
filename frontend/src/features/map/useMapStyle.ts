import { useEffect, useState } from 'react';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { env } from '../../config/env';

/**
 * Categories de POI retirees du style.
 *
 * Un style tout pret est calibre pour une carte generaliste. On garde les
 * reperes qui aident a situer une destination — commerces, restauration,
 * sante, transports, education, services publics, culture — et on ne retire
 * que ce qui n'aide jamais a s'orienter.
 *
 * Le filtrage porte sur le `source-layer` et non sur le nom de la couche :
 * `streets-v4` range chaque famille de POI dans sa propre source, ce qui rend
 * la regle stable si MapTiler renomme une couche.
 */
const HIDDEN_SOURCE_LAYERS = [
  // Les numeros de rue saturent la carte a fort zoom sans jamais servir de
  // point de repere a l'echelle d'une course.
  'building_number',
  'tree',
];

/** Couches retirees par identifiant, quand la source entiere doit rester. */
const HIDDEN_LAYER_IDS = [
  // Ecussons d'autoroute au format americain : hors contexte.
  'Highway shields bicolor',
  'Highway shields bicolor top',
  'Roller coaster labels',
];

/**
 * Facteur applique a la taille des textes.
 *
 * Le style est calibre pour une carte plein ecran que l'on consulte ; ici elle
 * sert de decor a des marqueurs et a un bottom sheet. Des labels plus discrets
 * laissent les vehicules au premier plan.
 */
const TEXT_SCALE = 0.82;

/** Meme logique pour les pictogrammes de POI. */
const ICON_SCALE = 0.85;

/**
 * Multiplie une valeur de taille MapLibre, qu'elle soit un nombre, une
 * expression `interpolate` / `case` / `match`, ou un objet `stops`.
 *
 * On n'essaie pas d'interpreter l'expression : `["*", facteur, expression]` est
 * une expression valide qui delegue le calcul au moteur. C'est la seule facon
 * robuste de mettre a l'echelle des expressions dont on ne connait pas la
 * forme a l'avance.
 */
function scaleSize(value: unknown, factor: number): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === 'number') return value * factor;

  // Forme historique `{ stops: [[zoom, taille], ...] }` : non composable avec
  // l'operateur `*`, on met les valeurs a l'echelle une par une.
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

  if (Array.isArray(value)) return ['*', factor, value];

  return value;
}

type State =
  | { status: 'loading'; style: null }
  | { status: 'ready'; style: StyleSpecification }
  /** Le style n'a pas pu etre allege : on retombe sur l'URL brute. */
  | { status: 'fallback'; style: string };

/**
 * Charge le style de carte, en retire les couches inutiles au VTC et reduit la
 * taille des labels.
 *
 * MapLibre accepte une specification de style complete, pas seulement une URL :
 * on telecharge donc le JSON une fois, on le transforme, et on passe l'objet
 * resultant. C'est le seul moyen d'agir sur un style distant — `Layer` sert a
 * en AJOUTER des couches, pas a modifier celles qui existent.
 *
 * En cas d'echec reseau, on renvoie l'URL d'origine : une carte non retouchee
 * vaut mieux qu'une absence de carte (R8).
 */
export function useMapStyle(): State {
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
            const source = (layer as { 'source-layer'?: string })[
              'source-layer'
            ];
            if (source && HIDDEN_SOURCE_LAYERS.includes(source)) return false;
            return !HIDDEN_LAYER_IDS.includes(layer.id);
          })
          .map((layer) => {
            if (layer.type !== 'symbol' || !layer.layout) return layer;

            const layout = layer.layout as Record<string, unknown>;
            return {
              ...layer,
              layout: {
                ...layout,
                'text-size': scaleSize(layout['text-size'], TEXT_SCALE),
                'icon-size': scaleSize(layout['icon-size'], ICON_SCALE),
              },
            };
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
