/**
 * Lecture centralisee des variables d'environnement (R9).
 *
 * AUCUNE cle ne doit apparaitre en dur ailleurs dans le code. Les valeurs
 * viennent de `.env` (gitignore) via les variables EXPO_PUBLIC_*, qu'Expo
 * injecte au build.
 *
 * ATTENTION : une variable EXPO_PUBLIC_* est embarquee dans le bundle et
 * donc LISIBLE par n'importe qui installe l'app. On n'y met que des cles
 * publiques a quota (tuiles, geocodage). Toute cle sensible (paiement,
 * cle serveur) reste cote backend.
 */

const raw = {
  maptilerKey: process.env.EXPO_PUBLIC_MAPTILER_KEY,
  mapStyleUrl: process.env.EXPO_PUBLIC_MAP_STYLE_URL,
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
};

/**
 * Style de carte MapLibre.
 *
 * Priorite :
 *   1. EXPO_PUBLIC_MAP_STYLE_URL si fourni (permet de basculer sur
 *      Protomaps/OpenFreeMap sans toucher au code) ;
 *   2. sinon le style MapTiler construit depuis la cle ;
 *   3. sinon `null` -> l'ecran affiche son fond de secours au lieu de
 *      planter (R8).
 */
function resolveMapStyleUrl(): string | null {
  if (raw.mapStyleUrl) return raw.mapStyleUrl;
  if (raw.maptilerKey) {
    return `https://api.maptiler.com/maps/${DEFAULT_MAP_STYLE}/style.json?key=${raw.maptilerKey}`;
  }
  return null;
}

/**
 * Style de carte par defaut.
 *
 * `streets-v4` sert de base, puis `useMapStyle` en retire les categories
 * inutiles au VTC. Cette version range chaque famille de POI dans son propre
 * `source-layer` (`poi_healthcare`, `poi_food`...), ce qui permet de filtrer
 * par categorie plutot que par nom de couche — une regle qui survit aux
 * renommages. Elle apporte aussi passages pietons et feux tricolores, absents
 * de la v2.
 *
 * Ecartes apres mesure : `dataviz-light` et `backdrop` (0 POI, carte vide,
 * concus pour de la data-visualisation), `basic-v2` (1 POI, fond beige et
 * vegetation qui donnent un aspect de foret), `bright-v2` (12 categories de
 * POI, trop charge), `outdoor-v4` et `landscape-v4` (topographiques : courbes
 * de niveau et sentiers de randonnee, hors sujet en ville).
 */
const DEFAULT_MAP_STYLE = 'streets-v4';

export const env = {
  mapStyleUrl: resolveMapStyleUrl(),
  apiUrl: raw.apiUrl ?? null,

  /** true quand la carte est utilisable. Sert a afficher l'etat degrade. */
  get hasMapStyle(): boolean {
    return this.mapStyleUrl !== null;
  },
} as const;

/**
 * Ville par defaut quand la geolocalisation est refusee ou indisponible
 * (R8). Douala, centre-ville.
 */
export const DEFAULT_REGION = {
  longitude: 9.7085,
  latitude: 4.0483,
  // 13 cadrait trop large : les chauffeurs paraissaient loin de l'utilisateur.
  // 14.5 rapproche la camera — les vehicules restent lisibles et donnent
  // l'impression d'un service disponible tout de suite, a quelques rues.
  zoom: 14.5,
  cityLabel: 'Douala',
} as const;
