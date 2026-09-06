import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, shadows, spacing } from '../../theme';

/**
 * Boutons de cadrage de la carte chauffeur (R16).
 *
 * Copie dediee de la `recenterRow` de `HomeScreen` (cote passager) : meme
 * geste — « remets la carte comme il faut » — l'un sur le trajet, l'autre sur
 * soi. Copiee et non partagee : les deux ecrans n'ont ni les memes conditions
 * d'affichage ni la meme pile de panneaux, et un composant commun ferait
 * porter au passager le risque de chaque evolution cote chauffeur.
 *
 * Les deux recadrages sont ANIMES : la camera vole vers sa cible
 * (`flyTo` / `fitBounds`), elle ne saute pas — un saut ferait perdre au
 * chauffeur le lien entre ce qu'il regardait et ce qu'il voit.
 */
type Props = {
  /** Cadre tout le trajet. Bouton masque s'il n'y a rien a cadrer. */
  onFitRoute?: () => void;
  /** Recentre sur le vehicule du chauffeur. */
  onRecenter: () => void;
};

export function DriverMapControls({ onFitRoute, onRecenter }: Props) {
  return (
    <View style={styles.row} pointerEvents="box-none">
      {onFitRoute !== undefined && (
        <Pressable
          style={styles.button}
          onPress={onFitRoute}
          accessibilityRole="button"
          accessibilityLabel="Afficher tout l’itinéraire"
        >
          <Ionicons name="git-branch" size={20} color={colors.text} />
        </Pressable>
      )}

      <Pressable
        style={styles.button}
        onPress={onRecenter}
        accessibilityRole="button"
        accessibilityLabel="Recentrer sur ma position"
      >
        <Ionicons name="locate" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

const BUTTON = 44;

const styles = StyleSheet.create({
  // Alignes a droite : itineraire puis position, comme cote passager.
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
});
