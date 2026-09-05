/**
 * Recuperation du reseau routier autour d'un point, via l'API Overpass
 * (OpenStreetMap).
 *
 * Sert a poser les vehicules de demonstration SUR des rues reelles, avec le cap
 * de la voie qui les porte. Sans cela, des positions choisies a la main tombent
 * au milieu des pates de maisons et orientees au hasard — ce que le jury verra
 * immediatement.
 *
 * En production, ce service disparait : les positions viendront du GPS des
 * chauffeurs, naturellement sur la chaussee.
 */

export type Coordinates = {
  longitude: number;
  latitude: number;
};

/** Un point sur une route, avec l'orientation de la voie a cet endroit. */
export type RoadPoint = Coordinates & {
  /** Cap en degres, 0 = nord, sens de la voie. */
  bearing: number;
  /**
   * Trace complet de la voie qui porte ce point, dans l'ordre de parcours.
   *
   * Permet d'animer un vehicule le long de SA rue : sans le trace, on ne
   * saurait que translater le marqueur en ligne droite, et il quitterait la
   * chaussee au premier virage.
   */
  path: Coordinates[];
};

type OverpassWay = {
  geometry?: { lat: number; lon: number }[];
};

type OverpassResponse = {
  elements?: OverpassWay[];
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Delai au-dela duquel on abandonne la requete.
 *
 * 20 s et non 5 : Overpass est lent par nature sur une zone dense, et couper
 * trop tot priverait de vraies routes une connexion simplement mediocre.
 */
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Classes de voies retenues : celles qu'un vehicule emprunte reellement. On
 * ecarte chemins pietons, pistes et voies de service.
 */
const HIGHWAY_FILTER = '^(primary|secondary|tertiary|residential|unclassified)$';

/**
 * Cap d'un segment, en degres depuis le nord.
 *
 * On corrige la longitude par le cosinus de la latitude : a Yaounde, un degre
 * de longitude est plus court qu'un degre de latitude, et l'ignorer fausserait
 * l'angle.
 */
function bearingBetween(from: Coordinates, to: Coordinates): number {
  const toRad = Math.PI / 180;
  const dLng =
    (to.longitude - from.longitude) * Math.cos(from.latitude * toRad);
  const dLat = to.latitude - from.latitude;
  const degrees = Math.atan2(dLng, dLat) / toRad;
  return (degrees + 360) % 360;
}

/**
 * Points repartis sur les routes autour d'un centre.
 *
 * @param center  position de reference
 * @param count   nombre de points souhaites
 * @param radius  rayon de recherche en metres
 *
 * Renvoie un tableau vide en cas d'echec : l'appelant retombe alors sur ses
 * positions de secours plutot que d'afficher une carte vide (R8).
 */
export async function fetchRoadPoints(
  center: Coordinates,
  count: number,
  radius = 1200,
): Promise<RoadPoint[]> {
  const query = `[out:json][timeout:15];
way(around:${radius},${center.latitude},${center.longitude})["highway"~"${HIGHWAY_FILTER}"];
out geom ${count * 8};`;

  // Sans borne cote client, une connexion tres degradee (cas courant du
  // contexte visE) laisse la requete pendre sans jamais rendre la main : les
  // vehicules resteraient absents de la carte indefiniment. Passe ce delai, on
  // abandonne et l'appelant retombe sur ses positions de secours (R8).
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: query,
      signal: abort.signal,
    });
    if (!response.ok) {
      console.warn(`[roads] Overpass a repondu ${response.status}`);
      return [];
    }

    const data = (await response.json()) as OverpassResponse;
    const ways = (data.elements ?? []).filter(
      (way): way is Required<OverpassWay> =>
        Array.isArray(way.geometry) && way.geometry.length > 1,
    );

    if (ways.length === 0) {
      console.warn('[roads] aucune route exploitable autour de la position');
      return [];
    }

    // Tous les segments candidats, avec leur position vue depuis le centre.
    // Overpass renvoie les voies dans son propre ordre, sans rapport avec la
    // geographie : les prendre a la suite regroupe les vehicules d'un seul
    // cote de l'utilisateur. On raisonne donc sur la direction de chacun.
    const candidates = ways.flatMap((way) => {
      const geometry = way.geometry;
      const segments: (RoadPoint & { azimuth: number })[] = [];

      const path: Coordinates[] = geometry.map((node) => ({
        longitude: node.lon,
        latitude: node.lat,
      }));

      // Un point tous les quelques noeuds : inutile d'echantillonner chaque
      // sommet d'une meme rue, ils pointent tous dans la meme direction.
      for (let at = 0; at < geometry.length - 1; at += 3) {
        const from = { longitude: geometry[at].lon, latitude: geometry[at].lat };
        const to = {
          longitude: geometry[at + 1].lon,
          latitude: geometry[at + 1].lat,
        };

        segments.push({
          ...from,
          path,
          bearing: bearingBetween(from, to),
          // Direction du point vu du centre : c'est ce qui repartit les
          // vehicules autour de l'utilisateur.
          azimuth: bearingBetween(center, from),
        });
      }

      return segments;
    });

    if (candidates.length === 0) return [];

    // Un secteur angulaire par vehicule, et dans chaque secteur le segment le
    // mieux aligne. Un segment deja pris est retire : deux vehicules au meme
    // endroit se chevaucheraient.
    const remaining = [...candidates];
    const points: RoadPoint[] = [];

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
  } catch (error) {
    // Reseau coupe, DNS en echec, ou depassement du delai ci-dessus. On le dit
    // dans les logs : sans cela, des vehicules sur des positions de secours
    // ressemblent a s'y meprendre a des vehicules sur de vraies routes, et le
    // probleme passe inapercu jusqu'a la demo.
    const reason =
      error instanceof Error && error.name === 'AbortError'
        ? `pas de reponse en ${REQUEST_TIMEOUT_MS / 1000} s`
        : String(error);
    console.warn(`[roads] routes indisponibles (${reason}) — positions de secours`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
