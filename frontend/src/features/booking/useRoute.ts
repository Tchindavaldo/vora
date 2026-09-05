import { useCallback, useEffect, useState } from 'react';

import {
  fetchRoute,
  RoutingError,
  routingMessage,
  type Route,
  type RoutePoint,
} from '../../services/routing';

export type RouteState = {
  route: Route | null;
  isLoading: boolean;
  /** Message pret a afficher, `null` si tout va bien (R8). */
  error: string | null;
  /** Relance le calcul apres un echec reseau. */
  retry: () => void;
};

/**
 * Itineraire entre deux points (R17 etape 4).
 *
 * Aucun ecran n'appelle le service de routage directement (R12) : ce hook porte
 * l'annulation, le retry et la traduction des pannes en message affichable.
 *
 * `destination` a `null` = pas de trajet demande : rien n'est calcule.
 */
export function useRoute(
  origin: RoutePoint,
  destination: RoutePoint | null,
): RouteState {
  const [state, setState] = useState<{
    route: Route | null;
    isLoading: boolean;
    error: string | null;
  }>({ route: null, isLoading: false, error: null });

  // Incremente par `retry` : sur une coupure reseau, l'utilisateur doit pouvoir
  // relancer sans revenir choisir sa destination.
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // Les coordonnees sont extraites pour servir de dependances : les objets sont
  // recrees a chaque rendu, et la carte en declenche beaucoup.
  const destinationLng = destination?.longitude ?? null;
  const destinationLat = destination?.latitude ?? null;
  const { longitude: originLng, latitude: originLat } = origin;

  useEffect(() => {
    if (destinationLng === null || destinationLat === null) {
      setState({ route: null, isLoading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState({ route: null, isLoading: true, error: null });

    fetchRoute(
      { longitude: originLng, latitude: originLat },
      { longitude: destinationLng, latitude: destinationLat },
      'car',
      controller.signal,
    )
      .then((route) => {
        if (controller.signal.aborted) return;
        setState({ route, isLoading: false, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof RoutingError
            ? routingMessage(error.reason)
            : 'Le calcul de l’itinéraire a échoué.';
        // On ne journalise QUE la cause : l'objet d'erreur porte l'URL et les
        // en-tetes de la requete, donc la cle de routage (R9).
        const cause = error instanceof RoutingError ? error.reason : 'unknown';
        console.warn(`[routing] echec du calcul (${cause})`);
        setState({ route: null, isLoading: false, error: message });
      });

    return () => controller.abort();
    // `originLng`/`originLat` volontairement absents : le GPS bouge de quelques
    // metres en permanence et relancerait le calcul en boucle. Le trajet est
    // fige au moment ou la destination est choisie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationLng, destinationLat, attempt]);

  return { ...state, retry };
}
