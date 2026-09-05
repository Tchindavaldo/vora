import { useEffect, useRef, useState } from 'react';

import {
  GeocodingError,
  geocodingMessage,
  searchPlaces,
  type Place,
} from '../../services/geocoding';

/**
 * Etat de la recherche de destination.
 *
 * Aucun composant n'appelle le geocodage directement (R12) : ce hook porte le
 * debounce, l'annulation et la traduction des pannes en message affichable.
 */
export type PlaceSearchState = {
  results: Place[];
  isLoading: boolean;
  /** Message pret a afficher, `null` si tout va bien (R8). */
  error: string | null;
  /** true quand la requete a abouti sans aucun resultat. */
  isEmpty: boolean;
};

/**
 * Attente avant d'interroger l'API. A Douala le reseau est cher et lent :
 * lancer une requete par caractere gaspillerait le forfait de l'utilisateur
 * autant que le quota de la cle.
 */
const DEBOUNCE_MS = 350;

/** En dessous, la recherche renvoie tout et rien. */
const MIN_QUERY_LENGTH = 3;

export function usePlaceSearch(
  query: string,
  proximity: { longitude: number; latitude: number },
): PlaceSearchState {
  const [state, setState] = useState<PlaceSearchState>({
    results: [],
    isLoading: false,
    error: null,
    isEmpty: false,
  });

  // Coordonnees lues dans un ref : elles changent a chaque rafraichissement
  // GPS, et on ne veut pas relancer la recherche pour un deplacement de
  // quelques metres — seule la frappe doit la declencher.
  const proximityRef = useRef(proximity);
  proximityRef.current = proximity;

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setState({ results: [], isLoading: false, error: null, isEmpty: false });
      return;
    }

    const controller = new AbortController();
    setState((current) => ({ ...current, isLoading: true, error: null }));

    const timer = setTimeout(() => {
      searchPlaces(trimmed, proximityRef.current, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return;
          setState({
            results,
            isLoading: false,
            error: null,
            isEmpty: results.length === 0,
          });
        })
        .catch((error) => {
          if (controller.signal.aborted) return; // frappe suivante
          const message =
            error instanceof GeocodingError
              ? geocodingMessage(error.reason)
              : 'La recherche a échoué. Réessayez.';
          // Log exploitable en plus du retour utilisateur (R8).
          //
          // On ne journalise QUE la cause, jamais l'objet d'erreur : un echec
          // de `fetch` porte l'URL appelee, qui contient la cle de geocodage
          // (R9 — aucun secret dans les logs).
          const cause =
            error instanceof GeocodingError ? error.reason : 'unknown';
          console.warn(`[geocoding] echec de la recherche (${cause})`);
          setState({ results: [], isLoading: false, error: message, isEmpty: false });
        });
    }, DEBOUNCE_MS);

    // Frappe suivante ou demontage : on abandonne l'appel en cours pour ne pas
    // afficher les resultats d'une requete perimee.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return state;
}
