import { useCallback, useEffect, useRef, useState } from 'react';

import {
  cancelRide,
  createRide,
  subscribeToRideStatus,
  type CreateRideInput,
  type Ride,
} from '../../services/rides';

/**
 * Demande de course : creation, attente d'un chauffeur, annulation
 * (R17 etapes 6 et 7).
 *
 * L'etat vit ici et non dans `useBookingFlow` : la reservation s'arrete au
 * choix du tarif, la course commence apres. Les separer permet d'annuler la
 * course sans perdre l'itineraire deja calcule.
 */
export type RideRequest = {
  /** Course en cours, `null` tant que le passager n'a pas commande. */
  ride: Ride | null;
  /** Vrai entre l'appui sur "Commander" et la reponse du serveur. */
  isCreating: boolean;
  /** Message d'echec de la creation, `null` si tout va bien (R8). */
  error: string | null;
  request: (input: CreateRideInput) => void;
  cancel: () => void;
};

export function useRideRequest(): RideRequest {
  const [ride, setRide] = useState<Ride | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Desabonnement de l'ecoute de statut en cours. Garde dans une ref pour
  // pouvoir l'appeler depuis `cancel`, hors du cycle de rendu.
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Une course annulee pendant la creation ne doit pas s'afficher quand la
  // reponse arrive enfin.
  const isActiveRef = useRef(false);

  useEffect(
    () => () => {
      unsubscribeRef.current?.();
      isActiveRef.current = false;
    },
    [],
  );

  const request = useCallback((input: CreateRideInput) => {
    isActiveRef.current = true;
    setError(null);
    setIsCreating(true);

    createRide(input)
      .then((created) => {
        if (!isActiveRef.current) return;

        setIsCreating(false);
        setRide(created);

        // Les changements de statut arrivent de facon asynchrone, comme le
        // feront les evenements socket du backend.
        unsubscribeRef.current = subscribeToRideStatus(created, (updated) => {
          if (!isActiveRef.current) return;
          setRide(updated);
        });
      })
      .catch(() => {
        if (!isActiveRef.current) return;

        // On ne journalise pas l'objet d'erreur : il portera l'en-tete
        // d'authentification une fois le backend branche (R9).
        console.warn('[ride] creation de la course impossible');
        setIsCreating(false);
        setError(
          'Impossible de créer la course. Vérifiez votre connexion et réessayez.',
        );
      });
  }, []);

  const cancel = useCallback(() => {
    isActiveRef.current = false;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;

    setRide((current) => {
      if (current !== null) {
        // Echec sans consequence pour le passager : la course est abandonnee
        // cote application quoi qu'il arrive.
        cancelRide(current).catch(() => {
          console.warn('[ride] annulation non confirmee par le serveur');
        });
      }
      return null;
    });

    setIsCreating(false);
    setError(null);
  }, []);

  return { ride, isCreating, error, request, cancel };
}
