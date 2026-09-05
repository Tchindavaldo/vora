/**
 * Geocodage d'adresses (R11, R12).
 *
 * Fournisseur encapsule ici : aucun ecran n'appelle l'API directement, donc
 * changer de fournisseur (Photon, Nominatim) ne touche que ce fichier.
 *
 * MapTiler Geocoding est retenu parce que la cle est deja presente pour les
 * tuiles : pas de service supplementaire a configurer avant la demo.
 */

import { DEFAULT_REGION, env } from '../config/env';

export type Place = {
  id: string;
  /** Nom court affiche en gras : "Marche Central". */
  label: string;
  /** Ligne secondaire : quartier, ville. */
  context: string;
  longitude: number;
  latitude: number;
};

export type GeocodeError =
  | 'no-key' // cle absente : recherche impossible
  | 'offline' // reseau injoignable
  | 'server' // reponse invalide du fournisseur
  | 'timeout';

export class GeocodingError extends Error {
  constructor(readonly reason: GeocodeError) {
    super(reason);
  }
}

/** Au-dela, sur un reseau lent, un message vaut mieux qu'une attente. */
const TIMEOUT_MS = 8000;

/**
 * Cherche des lieux correspondant a `query`.
 *
 * `proximity` fait remonter les resultats proches de l'utilisateur : a Douala,
 * "marche" doit donner le marche du quartier, pas un homonyme a l'autre bout
 * du pays.
 */
export async function searchPlaces(
  query: string,
  proximity: { longitude: number; latitude: number },
  signal?: AbortSignal,
): Promise<Place[]> {
  const key = env.geocodingKey;
  if (!key) throw new GeocodingError('no-key');

  const url =
    `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json` +
    `?key=${key}` +
    `&proximity=${proximity.longitude},${proximity.latitude}` +
    `&country=${DEFAULT_REGION.countryCode}` +
    `&language=fr&limit=8`;

  // Deux raisons d'abandonner : la frappe continue ou l'ecran se demonte
  // (signal externe), ou le reseau ne repond pas (timeout local).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new GeocodingError('server');

    const body = await response.json();
    return parseFeatures(body?.features);
  } catch (error) {
    if (signal?.aborted) throw error; // frappe suivante : pas une panne
    if (error instanceof GeocodingError) throw error;
    // Un `AbortError` ici ne peut venir que du timeout local.
    const aborted = (error as { name?: string })?.name === 'AbortError';
    throw new GeocodingError(aborted ? 'timeout' : 'offline');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

type Feature = {
  id?: string;
  text?: string;
  place_name?: string;
  center?: [number, number];
};

function parseFeatures(features: unknown): Place[] {
  if (!Array.isArray(features)) throw new GeocodingError('server');

  return features.flatMap((feature: Feature, index) => {
    const center = feature.center;
    if (!center || center.length < 2) return [];

    const label = feature.text ?? feature.place_name ?? 'Lieu';
    // `place_name` repete le nom court en tete : on ne garde que le contexte.
    const context = (feature.place_name ?? '')
      .split(',')
      .slice(1)
      .join(',')
      .trim();

    return [
      {
        id: feature.id ?? `place-${index}`,
        label,
        context: context || DEFAULT_REGION.cityLabel,
        longitude: center[0],
        latitude: center[1],
      },
    ];
  });
}

/** Message utilisateur associe a une panne de geocodage (R8). */
export function geocodingMessage(reason: GeocodeError): string {
  switch (reason) {
    case 'no-key':
      return "Recherche indisponible : la clé de géocodage n'est pas configurée.";
    case 'offline':
      return 'Pas de connexion. Vérifiez votre réseau et réessayez.';
    case 'timeout':
      return 'Le réseau met trop de temps à répondre. Réessayez.';
    case 'server':
      return 'Le service de recherche est momentanément indisponible.';
  }
}
