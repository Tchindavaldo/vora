import type { RoadPoint, Coordinates } from './roads';

/**
 * Recuperation du reseau routier depuis les tuiles DEJA affichees par la carte.
 *
 * Pourquoi ne pas interroger Overpass : son service est injoignable depuis
 * certains reseaux (c'est le cas du notre), et l'application se retrouve alors
 * a poser les vehicules a cote de la chaussee. Or la carte a deja telecharge la
 * geometrie des routes pour les dessiner : on la lui demande au lieu de la
 * redemander a un tiers.
 *
 * Consequences : aucune requete reseau supplementaire, aucune cle en plus,
 * fonctionne des que la carte est affichee — et les coordonnees viennent de la
 * MEME source que le trace visible, donc les vehicules sont exactement sur la
 * route dessinee, pas approximativement.
 *
 * En production ce service disparait : les positions viendront du GPS des
 * chauffeurs.
 */

/**
 * Couches de routes carrossables du style `streets-v4`.
 *
 * On ecarte les `outline` (le contour d'une meme route, qui doublonnerait la
 * geometrie), les tunnels (invisibles), les chemins pietons et les voies en
 * construction. Restent les classes qu'un vehicule emprunte vraiment.
 */
const ROAD_LAYER_IDS = [
  'Highway',
  'Major road',
  'Minor road z10',
  'Minor road z12',
  'Service road',
  'Highway bridge',
  'Major road bridge',
  'Minor road bridge',
];

/** Ce qu'on attend de la carte : de quoi interroger les routes visibles. */
export type RoadQueryTarget = {
  queryRenderedFeatures: (
    options?: { layers?: string[] },
  ) => Promise<GeoJSON.Feature[]>;
};

/**
 * Cap d'un segment, en degres depuis le nord.
 *
 * La longitude est corrigee par le cosinus de la latitude : pres de l'equateur
 * un degre de longitude et un degre de latitude ne couvrent pas la meme
 * distance, et l'ignorer inclinerait tous les vehicules.
 */
function bearingBetween(from: Coordinates, to: Coordinates): number {
  const toRad = Math.PI / 180;
  const dLng =
    (to.longitude - from.longitude) * Math.cos(from.latitude * toRad);
  const dLat = to.latitude - from.latitude;
  return (Math.atan2(dLng, dLat) / toRad + 360) % 360;
}

/** Distance approximative entre deux points, en degres. */
function distanceBetween(from: Coordinates, to: Coordinates): number {
  const dLat = to.latitude - from.latitude;
  const dLng =
    (to.longitude - from.longitude) *
    Math.cos((from.latitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Traces de routes extraits des features GeoJSON renvoyees par la carte.
 *
 * Une feature de route est une `LineString` ou une `MultiLineString` : on
 * ramene les deux au meme format, une suite de points.
 */
function pathsOf(features: GeoJSON.Feature[]): Coordinates[][] {
  const paths: Coordinates[][] = [];

  for (const feature of features) {
    const geometry = feature.geometry;

    const lines: GeoJSON.Position[][] =
      geometry.type === 'LineString'
        ? [geometry.coordinates]
        : geometry.type === 'MultiLineString'
          ? geometry.coordinates
          : [];

    for (const line of lines) {
      if (line.length < 2) continue;
      paths.push(
        line.map(([longitude, latitude]) => ({ longitude, latitude })),
      );
    }
  }

  return paths;
}

/**
 * Positions de vehicules posees sur les routes visibles a l'ecran.
 *
 * @param map     la carte a interroger
 * @param center  position de reference, pour repartir les vehicules autour
 * @param count   nombre de positions souhaitees
 *
 * Renvoie un tableau vide si la carte n'a encore rien affiche : l'appelant
 * reessaiera ou retombera sur ses positions de secours (R8).
 */
export async function fetchRoadPointsFromMap(
  map: RoadQueryTarget,
  center: Coordinates,
  count: number,
): Promise<RoadPoint[]> {
  let features: GeoJSON.Feature[];

  try {
    features = await map.queryRenderedFeatures({ layers: ROAD_LAYER_IDS });
  } catch (error) {
    console.warn(`[roads] interrogation de la carte impossible: ${error}`);
    return [];
  }

  const paths = pathsOf(features);

  if (paths.length === 0) {
    // Normal tant que les tuiles ne sont pas dessinees ; anormal ensuite.
    return [];
  }

  // Chaque trace donne un point candidat, avec sa direction vue du centre.
  // C'est cette direction qui repartit les vehicules tout autour de
  // l'utilisateur, au lieu de les grouper d'un seul cote.
  const candidates = paths.map((path) => {
    // On vise le milieu du trace : ses extremites sont souvent des carrefours
    // ou un bord de tuile, ou le cap n'est pas representatif de la rue.
    const at = Math.max(0, Math.min(path.length - 2, Math.floor(path.length / 2) - 1));
    const from = path[at];
    const to = path[at + 1];

    return {
      longitude: from.longitude,
      latitude: from.latitude,
      bearing: bearingBetween(from, to),
      path,
      azimuth: bearingBetween(center, from),
      distance: distanceBetween(center, from),
    };
  });

  // On ecarte les routes tres eloignees : une rue visible au bord de l'ecran
  // donnerait un vehicule "proche" a l'autre bout du quartier.
  const sorted = candidates
    .filter((candidate) => candidate.distance > 0)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, Math.max(count * 12, 40));

  const remaining = sorted.length > 0 ? sorted : candidates;
  const points: RoadPoint[] = [];

  // Un secteur angulaire par vehicule, et dans chaque secteur la route la
  // mieux orientee. Une route deja prise est retiree pour eviter deux
  // vehicules superposes.
  for (let index = 0; index < count && remaining.length > 0; index += 1) {
    const wanted = (360 / count) * index;

    let bestAt = 0;
    let bestGap = Infinity;

    remaining.forEach((candidate, at) => {
      const raw = Math.abs(candidate.azimuth - wanted) % 360;
      const gap = raw > 180 ? 360 - raw : raw;

      if (gap < bestGap) {
        bestGap = gap;
        bestAt = at;
      }
    });

    const [chosen] = remaining.splice(bestAt, 1);
    points.push({
      longitude: chosen.longitude,
      latitude: chosen.latitude,
      bearing: chosen.bearing,
      path: chosen.path,
    });
  }

  return points;
}
