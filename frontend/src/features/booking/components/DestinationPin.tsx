import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows } from '../../../theme';

/**
 * Marqueur de la destination choisie.
 *
 * Pastille pleine a l'accent de marque, la ou la position utilisateur est un
 * point bleu : les deux extremites du trajet doivent se distinguer d'un coup
 * d'oeil sur la carte.
 */
export function DestinationPin() {
  return (
    <View style={styles.pin}>
      <Ionicons name="location" size={18} color={colors.surface} />
    </View>
  );
}

const SIZE = 32;

const styles = StyleSheet.create({
  pin: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.marker,
  },
});
