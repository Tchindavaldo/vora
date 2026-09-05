import { useEffect, useState } from 'react';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { env } from '../../config/env';

/**
 * Categories de POI retirees du style.
 *
 * Un style tout pret est calibre pour une carte generaliste, pas pour du VTC.
 * On garde ce qui sert de repere pour situer une destination — sante,
 * transports, gares et arrets, education, services publics et parcs — et on
 * retire ce qui n'ajoute que du bruit autour des vehicules.
 *
 * Le filtrage porte sur le `source-layer` et non sur le nom de la couche :
 * `streets-v4` range chaque famille de POI dans sa propre source, ce qui rend
 * la regle stable si MapTiler renomme une couche.
 */
const HIDDEN_SOURCE_LAYERS = [
  'poi_food',
  'poi_shopping',
  'poi_culture',
  'poi_tourism',
  'poi_sport',
  'poi_accommodation',
  'building_number',
  'tree',
];

/**
 * Couches retirees par identifiant, quand la source entiere doit rester.
 * `poi_public` porte a la fois Public et Park : on garde les deux, mais les
 * ecussons d'autoroute americains n'ont aucun sens ici.
 */
const HIDDEN_LAYER_IDS = [
  'Highway shields bicolor',
  'Highway shields bicolor top',
  'Roller coaster labels',
];

type State =
  | { status: 'loading'; style: null }
  | { status: 'ready'; style: StyleSpecification }
  /** Le style n'a pas pu etre allege : on retombe sur l'URL brute. */
  | { status: 'fallback'; style: string };

/**
 * Charge le style de carte et en retire les couches inutiles au VTC.
 *
 * MapLibre accepte une specification de style complete, pas seulement une URL :
 * on telecharge donc le JSON une fois, on filtre ses couches, et on passe
 * l'objet resultant. C'est le seul moyen de masquer des couches d'un style
 * distant — `Layer` sert a en AJOUTER, pas a en cacher.
 *
 * En cas d'echec reseau, on renvoie l'URL d'origine : une carte un peu chargee
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

        setState({
          status: 'ready',
          style: {
            ...style,
            layers: style.layers.filter((layer) => {
              const source = (layer as { 'source-layer'?: string })[
                'source-layer'
              ];
              if (source && HIDDEN_SOURCE_LAYERS.includes(source)) return false;
              return !HIDDEN_LAYER_IDS.includes(layer.id);
            }),
          },
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
