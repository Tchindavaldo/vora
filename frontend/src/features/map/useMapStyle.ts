import { useEffect, useState } from 'react';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { env } from '../../config/env';

/**
 * Sources masquees.
 *
 * Les POI sont conserves : bars, restaurants, stations et equipements servent
 * de points de repere pour situer une destination — c'est le coeur du metier
 * dans une ville ou l'adressage formel est incomplet.
 *
 * Ne partent que les elements qui n'aident jamais a s'orienter a l'echelle
 * d'une course.
 */
const HIDDEN_SOURCE_LAYERS = [
  // Numeros de rue : saturent la carte a fort zoom sans servir de repere.
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
 * Couche des batiments en volume.
 *
 * On ne la SUPPRIME pas : le style fait se relayer deux couches — `Building`
 * (2D) s'arrete a maxzoom 15 et `Building 3D` prend la suite au-dela. La
 * retirer laissait donc les batiments disparaitre des qu'on zoomait.
 *
 * On l'aplatit a la place : hauteur d'extrusion forcee a zero, opacite
 * relevee. Les batiments restent visibles a tous les zooms, toujours a plat.
 */
const EXTRUSION_LAYER_ID = 'Building 3D';

/**
 * Teintes de fond substituees a celles du style.
 *
 * `streets-v4` pose un fond creme (`hsl(54, 100%, 97%)`) et des zones bâties
 * beiges, qui donnent a la carte une dominante chaude. On la neutralise en
 * gris tres clair : les vehicules et le trace des rues ressortent mieux sur un
 * fond froid, et l'ensemble s'accorde au bottom sheet blanc.
 *
 * Cle = identifiant de la couche, valeur = couleur de remplacement.
 */
const BACKGROUND_COLORS: Record<string, string> = {
  Background: '#F5F5F3',
  Residential: '#ECECE8',
};

/**
 * Couche des noms de rues.
 *
 * Son filtre d'origine ecarte les classes `residential` et `living_street`,
 * qui forment l'essentiel du tissu urbain camerounais : peu de rues portaient
 * donc un nom a l'ecran. On elargit le filtre a ces classes.
 *
 * Une rue sans `name` dans OpenStreetMap restera muette quoi qu'on fasse —
 * c'est une limite des donnees, pas du style.
 */
const ROAD_LABEL_LAYER_ID = 'Road labels';

/**
 * Zoom a partir duquel les POI apparaissent.
 *
 * Le style les affiche des le zoom 12-14 selon la categorie. A Yaounde, leur
 * densite sature la carte a faible zoom : on les repousse a 15.5, franchement
 * au-dessus du zoom d'accueil (14.5), pour qu'ils n'apparaissent qu'apres un
 * geste de zoom deliberé — et jamais quand on prend du recul.
 */
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
  // Ajouts : le tissu residentiel, majoritaire en ville.
  'residential',
  'living_street',
  'unclassified',
  'road',
];

/**
 * Facteur applique a la taille des textes.
 *
 * Le style est calibre pour une carte plein ecran que l'on consulte ; ici elle
 * sert de fond a des marqueurs. Des noms de rues plus discrets laissent les
 * vehicules au premier plan sans cesser d'etre lisibles.
 *
 * 0.85 et pas moins : MapLibre ecarte les labels trop petits pour rester
 * lisibles, si bien qu'une reduction trop forte les fait disparaitre au lieu
 * de les reduire. A ce facteur, un nom de rue fait environ 11 px au zoom 14.5.
 */
const TEXT_SCALE = 0.85;

/**
 * Multiplie une valeur de taille MapLibre.
 *
 * ⚠️ On ne renvoie JAMAIS `["*", facteur, expression]`. C'est valide sur
 * MapLibre GL JS, mais MapLibre Native rejette l'expression et ignore alors la
 * couche entiere — les labels disparaissent au lieu de retrecir.
 *
 * On met donc a l'echelle les valeurs numeriques a l'interieur de la forme
 * existante : les paires zoom/taille d'un `interpolate`, celles d'un `stops`,
 * ou un nombre simple. Une expression d'une autre forme est laissee intacte
 * plutot que d'etre transformee en quelque chose que le moteur refusera.
 */
function scaleSize(value: unknown, factor: number): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === 'number') return value * factor;

  // Forme historique `{ stops: [[zoom, taille], ...] }`.
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

  // `["interpolate", interpolation, ["zoom"], z1, taille1, z2, taille2, ...]`
  // Les paires commencent a l'index 3 : les zooms tombent sur les indices
  // impairs, les tailles sur les pairs a partir de 4.
  if (Array.isArray(value) && value[0] === 'interpolate') {
    return value.map((item, index) =>
      index >= 4 && index % 2 === 0 && typeof item === 'number'
        ? item * factor
        : item,
    );
  }

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
            // Fond de carte : on substitue la teinte sans toucher au reste du
            // paint (opacite, transitions de zoom).
            const background = BACKGROUND_COLORS[layer.id];
            if (background) {
              const key =
                layer.type === 'background'
                  ? 'background-color'
                  : 'fill-color';
              return {
                ...layer,
                paint: {
                  ...(layer as { paint?: Record<string, unknown> }).paint,
                  [key]: background,
                },
              };
            }

            // Batiments : on aplatit l'extrusion au lieu de retirer la couche.
            if (layer.id === EXTRUSION_LAYER_ID) {
              return {
                ...layer,
                paint: {
                  ...(layer as { paint?: Record<string, unknown> }).paint,
                  'fill-extrusion-height': 0,
                  'fill-extrusion-base': 0,
                  // L'original est a 0.4, pense pour du volume ombre. A plat,
                  // il faut la meme densite que la couche 2D qu'il prolonge.
                  'fill-extrusion-opacity': 0.75,
                },
              };
            }

            if (layer.type !== 'symbol' || !layer.layout) return layer;

            const layout = layer.layout as Record<string, unknown>;
            const scaled = {
              ...layer,
              layout: {
                ...layout,
                'text-size': scaleSize(layout['text-size'], TEXT_SCALE),
              },
            };

            // Noms de rues. Deux corrections au style d'origine :
            //
            // 1. son filtre ecarte les voies residentielles, majoritaires en
            //    ville — on l'elargit ;
            // 2. `text-allow-overlap: false` supprime un nom de rue des qu'il
            //    croise un autre label. Les POI, plus denses, gagnaient
            //    systematiquement et aucune rue ne s'affichait. On autorise le
            //    chevauchement et on rapproche les repetitions le long du
            //    trace.
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
                  // 700 px entre deux occurrences du meme nom, contre 250 par
                  // defaut : une rue n'est ecrite qu'une fois par secteur.
                  'symbol-spacing': 700,
                  // Marge autour de chaque label : deux rues voisines ne
                  // peuvent plus s'ecrire cote a cote.
                  'text-padding': 14,
                  // Priorite haute en vue large (on cherche a s'orienter),
                  // basse une fois zoome (on cherche un lieu precis). Une
                  // valeur BASSE passe devant.
                  'symbol-sort-key': ['step', ['zoom'], 0, POI_MIN_ZOOM, 10],
                },
              };
            }

            // POI : hierarchie inverse de celle des rues. En vue large ils
            // s'effacent devant les noms de rues, une fois zoome ils passent
            // devant.
            //
            // `text-optional` reste a false : autorise, un POI abandonne son
            // texte mais garde son pictogramme, et la carte se couvre de
            // symboles anonymes — des croix rouges sans nom n'apprennent rien.
            // Un POI s'affiche entier ou pas du tout.
            const source = (layer as { 'source-layer'?: string })[
              'source-layer'
            ];
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
