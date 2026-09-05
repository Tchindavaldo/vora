import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

import { DEFAULT_REGION } from '../../config/env';

export type Coordinates = {
  longitude: number;
  latitude: number;
};

export type LocationStatus =
  | 'loading'
  | 'granted'
  /** Permission refusee par l'utilisateur. */
  | 'denied'
  /** Permission accordee mais position introuvable (GPS coupe, interieur). */
  | 'unavailable';

type State = {
  status: LocationStatus;
  coords: Coordinates;
  /** true quand `coords` est la ville par defaut, pas la vraie position. */
  isFallback: boolean;
};

/**
 * Position de l'utilisateur, avec repli explicite (R8).
 *
 * Ce hook ne rejette JAMAIS : une permission refusee ou un GPS muet renvoie
 * la region par defaut avec un statut lisible, pour que l'ecran puisse
 * afficher un bandeau plutot que de rester vide. Une app de mobilite dont la
 * carte disparait quand la geoloc echoue est inutilisable.
 */
export function useUserLocation(): State {
  const [state, setState] = useState<State>({
    status: 'loading',
    coords: {
      longitude: DEFAULT_REGION.longitude,
      latitude: DEFAULT_REGION.latitude,
    },
    isFallback: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (cancelled) return;

        if (status !== 'granted') {
          setState((prev) => ({ ...prev, status: 'denied' }));
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (cancelled) return;

        setState({
          status: 'granted',
          coords: {
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          },
          isFallback: false,
        });
      } catch {
        // Permission accordee mais position injoignable : on garde le repli
        // et on le signale, sans faire tomber l'ecran.
        if (!cancelled) {
          setState((prev) => ({ ...prev, status: 'unavailable' }));
        }
      }
    }

    resolve();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
