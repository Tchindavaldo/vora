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
 * `dataviz-light` : fond gris tres clair (97 %) et seulement 2 couches de
 * vegetation. `basic-v2` et `streets-v2` posent un fond beige plus 3 couches
 * vertes, ce qui donne a la ville un aspect de foret et fait disparaitre les
 * marqueurs dans le decor.
 *
 * Autres valeurs testees et disponibles : `backdrop` (fond blanc pur, encore
 * plus sobre), `basic-v2` (beige), `streets-v2` et `bright-v2` (charges en
 * labels), `toner-v2` (noir et blanc contraste).
 */
const DEFAULT_MAP_STYLE = 'dataviz-light';

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
