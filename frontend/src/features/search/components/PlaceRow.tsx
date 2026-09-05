import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../../theme';
import type { Place } from '../../../services/geocoding';

type Props = {
  place: Place;
  onPress: (place: Place) => void;
};

/** Une ligne de resultat : nom du lieu en tete, contexte en dessous. */
export function PlaceRow({ place, onPress }: Props) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => onPress(place)}
      accessibilityRole="button"
      accessibilityLabel={`${place.label}, ${place.context}`}
    >
      <View style={styles.icon}>
        <Ionicons name="location" size={18} color={colors.textMuted} />
      </View>

      <View style={styles.text}>
        <Text style={styles.label} numberOfLines={1}>
          {place.label}
        </Text>
        <Text style={styles.context} numberOfLines={1}>
          {place.context}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: typography.subtitle,
  context: typography.label,
});
