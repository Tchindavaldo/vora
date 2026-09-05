/**
 * Calcul d'itineraire (R11, R12).
 *
 * Fournisseur encapsule ici : aucun ecran n'appelle l'API directement, donc
 * changer de moteur (OSRM auto-heberge, Valhalla) ne touche que ce fichier.
 *
 * OpenRouteService est retenu pour ses profils de vehicule distincts —
 * `driving-car` et `cycling-regular`, ce dernier approchant le comportement
 * d'une moto en ville : il emprunte les axes etroits que le calcul voiture
 * evite, ce qui correspond a l'usage reel des moto-taxis a Douala.
 */

import { env } from '../config/env';

/** Point du trace, dans l'ordre du parcours. */
export type RoutePoint = {
  longitude: number;
  latitude: number;
};

export type Route = {
  /** Geometrie complete, a tracer sur la carte. */
  points: RoutePoint[];
  /** Distance en metres. */
  distanceMeters: number;
  /** Duree estimee en secondes, telle que renvoyee par le fournisseur. */
  durationSeconds: number;
};

/**
 * Profil de deplacement.
 *
 * `moto` utilise le profil velo : plus proche du trajet reel d'un moto-taxi
 * (ruelles, sens uniques traversables) que le profil voiture.
 */
export type RouteProfile = 'car' | 'moto';

const ORS_PROFILE: Record<RouteProfile, string> = {
  car: 'driving-car',
  moto: 'cycling-regular',
};

export type RoutingErrorReason =
  | 'no-key' // cle absente : calcul impossible
  | 'offline' // reseau injoignable
  | 'no-route' // aucun trajet entre les deux points
  | 'server'
  | 'timeout';

export class RoutingError extends Error {
  constructor(readonly reason: RoutingErrorReason) {
    super(reason);
  }
}

/** Au-dela, sur un reseau lent, un message vaut mieux qu'une attente. */
const TIMEOUT_MS = 12000;

/**
 * Calcule l'itineraire entre deux points.
 *
 * L'appel est un POST : passer la geometrie en query string la ferait tronquer
 * par certains proxys, et ORS attend de toute facon un corps JSON.
 */
export async function fetchRoute(
  origin: RoutePoint,
  destination: RoutePoint,
  profile: RouteProfile = 'car',
  signal?: AbortSignal,
): Promise<Route> {
  const key = env.routingKey;
  if (!key) throw new RoutingError('no-key');

  // `api.heigit.org` et non `api.openrouteservice.org` : ce dernier est en
  // cours de retrait, annonce sur le tableau de bord ORS.
  const url = `https://api.heigit.org/openrouteservice/v2/directions/${ORS_PROFILE[profile]}/geojson`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude],
        ],
      }),
      signal: controller.signal,
    });

    // 404 signifie ici "aucun itineraire trouve" et non une URL erronee : ORS
    // renvoie ce code quand les points ne sont relies par aucune route.
    if (response.status === 404) throw new RoutingError('no-route');
    if (!response.ok) throw new RoutingError('server');

    return parseRoute(await response.json());
  } catch (error) {
    if (signal?.aborted) throw error; // demande annulee, pas une panne
    if (error instanceof RoutingError) throw error;
    const aborted = (error as { name?: string })?.name === 'AbortError';
    throw new RoutingError(aborted ? 'timeout' : 'offline');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

type GeoJsonResponse = {
  features?: Array<{
    geometry?: { coordinates?: [number, number][] };
    properties?: { summary?: { distance?: number; duration?: number } };
  }>;
};

function parseRoute(body: GeoJsonResponse): Route {
  const feature = body?.features?.[0];
  const coordinates = feature?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new RoutingError('no-route');
  }

  const summary = feature?.properties?.summary;
  if (
    typeof summary?.distance !== 'number' ||
    typeof summary?.duration !== 'number'
  ) {
    // Sans distance ni duree, on ne peut ni estimer un prix ni annoncer une
    // arrivee : mieux vaut echouer que d'afficher un tarif invente (brief §23).
    throw new RoutingError('server');
  }

  return {
    points: coordinates.map(([longitude, latitude]) => ({
      longitude,
      latitude,
    })),
    distanceMeters: summary.distance,
    durationSeconds: summary.duration,
  };
}

/** Message utilisateur associe a une panne de routage (R8). */
export function routingMessage(reason: RoutingErrorReason): string {
  switch (reason) {
    case 'no-key':
      return "Itinéraire indisponible : la clé de routage n'est pas configurée.";
    case 'offline':
      return 'Pas de connexion. Impossible de calculer l’itinéraire.';
    case 'timeout':
      return 'Le calcul de l’itinéraire a pris trop de temps. Réessayez.';
    case 'no-route':
      return 'Aucune route ne relie ces deux points. Choisissez une destination proche d’une voie carrossable.';
    case 'server':
      return 'Le service d’itinéraire est momentanément indisponible.';
  }
}
