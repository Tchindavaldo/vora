import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../../theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
};

/**
 * Champ de saisie de la destination.
 *
 * Contrairement au faux champ du sheet d'accueil, celui-ci est un vrai
 * TextInput et prend le focus au montage : l'utilisateur vient d'appuyer pour
 * taper, lui demander un second appui serait une friction gratuite.
 */
export function SearchField({ value, onChangeText, onClear }: Props) {
  return (
    <View style={styles.field}>
      <Ionicons name="search" size={18} color={colors.textFaint} />

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Adresse, quartier, point de repère"
        placeholderTextColor={colors.textFaint}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Destination"
      />

      {value.length > 0 && (
        <Pressable
          onPress={onClear}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
        >
          <Ionicons name="close-circle" size={18} color={colors.textFaint} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  input: {
    ...typography.body,
    flex: 1,
    // Sans hauteur fixe, Android reduit le champ et coupe les accents.
    paddingVertical: spacing.xs,
  },
});
