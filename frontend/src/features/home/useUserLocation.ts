import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";

import { DEFAULT_REGION } from "../../config/env";

export type Coordinates = {
  longitude: number;
  latitude: number;
};

export type LocationStatus =
  | "loading"
  | "granted"
  /** Permission refusee par l'utilisateur. */
  | "denied"
  /** Permission accordee mais position introuvable (GPS coupe, interieur). */
  | "unavailable";

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
 *
 * La permission est aussi reverifiee a chaque retour au premier plan : si
 * l'utilisateur l'accorde depuis les Reglages du systeme, l'app le voit sans
 * avoir besoin d'etre relancee.
 */
export function useUserLocation(): State {
  const [state, setState] = useState<State>({
    status: "loading",
    coords: {
      longitude: DEFAULT_REGION.longitude,
      latitude: DEFAULT_REGION.latitude,
    },
    isFallback: true,
  });

  // Le hook peut etre demonte pendant un await : ce drapeau evite un setState
  // sur un composant disparu, et coupe aussi les resolutions en vol au retour
  // au premier plan.
  const cancelledRef = useRef(false);

  // Abonnement aux positions successives, a couper au demontage.
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const resolve = useCallback(async (promptIfNeeded: boolean) => {
    try {
      // Au retour de Reglages, on se contente de LIRE la permission : la
      // redemander ouvrirait une popup a chaque bascule d'application.
      const { status } = promptIfNeeded
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();

      if (cancelledRef.current) return;

      if (status !== "granted") {
        setState((prev) => ({ ...prev, status: "denied" }));
        return;
      }

      // Un abonnement, pas une mesure unique. Au tout premier lancement apres
      // installation, le GPS est froid : `getCurrentPositionAsync` peut mettre
      // longtemps a repondre, voire echouer, et l'ecran restait alors sur la
      // ville par defaut sans jamais se corriger une fois le fix obtenu. Avec
      // `watchPositionAsync`, la premiere position connue arrive des qu'elle
      // existe, et les suivantes affinent la precision.
      subscriptionRef.current?.remove();
      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          // Sous ce seuil, un rafraichissement ne deplacerait pas visiblement
          // le point mais ferait re-rendre toute la carte.
          distanceInterval: 10,
        },
        (position) => {
          if (cancelledRef.current) return;

          setState({
            status: "granted",
            coords: {
              longitude: position.coords.longitude,
              latitude: position.coords.latitude,
            },
            isFallback: false,
          });
        },
      );

      if (cancelledRef.current) {
        subscriptionRef.current?.remove();
        subscriptionRef.current = null;
      }
    } catch {
      // Permission accordee mais position injoignable : on garde le repli
      // et on le signale, sans faire tomber l'ecran.
      if (!cancelledRef.current) {
        setState((prev) => ({ ...prev, status: "unavailable" }));
      }
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    resolve(true);

    const appState = AppState.addEventListener("change", (next) => {
      // Deja abonne : la position se met a jour toute seule, inutile de
      // relancer une resolution a chaque bascule d'application.
      if (next === "active" && subscriptionRef.current === null) {
        resolve(false);
      }
    });

    return () => {
      cancelledRef.current = true;
      appState.remove();
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [resolve]);

  return state;
}
