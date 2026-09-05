import { useEffect, useState } from 'react';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { env } from '../../config/env';

/**
 * Categories de POI retirees du style.
 *
 * Un style tout pret est calibre pour une carte generaliste, pas pour du VTC.
 * On garde ce qui sert de point de repere pour situer une destination — sante,
 * transports, station-service, education, parcs, lieux-dits — et on retire ce
 * qui n'ajoute que du bruit autour des vehicules.
 *
 * Identifiants des couches de `streets-v2` (MapTiler).
 */
const HIDDEN_LAYER_IDS = [
  'Shopping',
  'Food',
  'Culture',
  'Tourism',
  'Sport',
  'Housenumber',
  'Highway shield (US)',
  'Highway shield interstate (US)',
  'Highway shield interstate top (US)',
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
            layers: style.layers.filter(
              (layer) => !HIDDEN_LAYER_IDS.includes(layer.id),
            ),
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
