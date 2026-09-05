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
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${raw.maptilerKey}`;
  }
  return null;
}

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
  zoom: 13,
  cityLabel: 'Douala',
} as const;
