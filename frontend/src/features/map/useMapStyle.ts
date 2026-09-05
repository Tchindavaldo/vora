import { useEffect, useState } from 'react';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { env } from '../../config/env';

/**
 * Sources masquees : TOUS les POI.
 *
 * Parti pris de l'ecran d'accueil : la carte est un decor, pas un contenu a
 * explorer. Seuls les vehicules et la position de l'utilisateur portent de
 * l'information ; commerces, restaurants et equipements leur feraient
 * concurrence. Les noms de rues restent, eux, indispensables pour se situer.
 *
 * Le filtrage porte sur le prefixe du `source-layer` et non sur le nom de la
 * couche : `streets-v4` range chaque famille de POI dans sa propre source
 * (`poi_food`, `poi_healthcare`...), ce qui rend la regle stable si MapTiler
 * en ajoute ou en renomme.
 */
const HIDDEN_SOURCE_PREFIXES = ['poi_'];

/** Sources masquees en entier, hors POI. */
const HIDDEN_SOURCE_LAYERS = [
  // Les numeros de rue saturent la carte a fort zoom sans jamais servir de
  // point de repere a l'echelle d'une course.
  'building_number',
  'tree',
  'street_furniture',
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
 * Les POI etant masques, il ne reste que les noms de rues et de quartiers : ils
 * doivent rester lisibles, on les laisse a leur taille d'origine. Baisser ce
 * facteur les rendait illisibles sans rien degager, puisqu'ils n'ont plus rien
 * a concurrencer.
 */
const TEXT_SCALE = 1;

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
            if (source) {
              if (HIDDEN_SOURCE_LAYERS.includes(source)) return false;
              if (HIDDEN_SOURCE_PREFIXES.some((p) => source.startsWith(p))) {
                return false;
              }
            }
            return !HIDDEN_LAYER_IDS.includes(layer.id);
          })
          .map((layer) => {
            if (layer.type !== 'symbol' || !layer.layout) return layer;

            if (TEXT_SCALE === 1) return layer;

            const layout = layer.layout as Record<string, unknown>;
            return {
              ...layer,
              layout: {
                ...layout,
                'text-size': scaleSize(layout['text-size'], TEXT_SCALE),
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
