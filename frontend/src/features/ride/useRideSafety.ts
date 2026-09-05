import { useCallback } from 'react';
import { Alert, Share } from 'react-native';

import type { Ride } from '../../services/rides';

/**
 * Actions de securite pendant la course (R10, brief §10) : partage de course et
 * alerte d'urgence.
 *
 * Sorties de `HomeScreen` pour qu'il reste sous le plafond de taille (R4) et
 * parce qu'elles appartiennent a la course, pas a l'accueil.
 */
export type RideSafety = {
  share: () => void;
  sos: () => void;
};

export function useRideSafety(ride: Ride | null): RideSafety {
  /**
   * Le passager envoie a un proche le chauffeur, sa plaque et sa destination.
   * La feuille de partage du systeme est utilisee plutot qu'un service maison —
   * elle atteint tous les canaux deja installes sur le telephone (WhatsApp en
   * tete, a Douala).
   */
  const share = useCallback(() => {
    if (ride === null || ride.driver === null) return;

    const message =
      `Je suis en course VORA vers ${ride.destinationLabel}. ` +
      `Chauffeur : ${ride.driver.name}, ${ride.driver.vehicleModel} ` +
      `(${ride.driver.plate}).`;

    Share.share({ message }).catch(() => {
      // Feuille de partage indisponible : on le dit plutot que d'echouer en
      // silence (R8).
      console.warn('[ride] partage de course indisponible');
      Alert.alert('Partage indisponible', 'Impossible d’ouvrir le partage.');
    });
  }, [ride]);

  /**
   * ⚠️ SIMULE : sans backend, aucune alerte n'est reellement transmise. On
   * l'annonce a l'utilisateur au lieu de laisser croire qu'un secours a ete
   * prevenu (brief §23).
   */
  const sos = useCallback(() => {
    Alert.alert(
      'Alerte d’urgence',
      'Démonstration : aucune alerte n’est réellement transmise. En production, ' +
        'votre position et les informations du chauffeur seraient envoyées à ' +
        'votre contact d’urgence et à l’assistance VORA.',
      [{ text: 'Fermer' }],
    );
  }, []);

  return { share, sos };
}
