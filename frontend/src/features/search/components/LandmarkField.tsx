import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
};

/**
 * Point de repere libre (R11, brief §11).
 *
 * A Douala, la couverture OSM des rues secondaires est faible et beaucoup de
 * destinations n'ont pas d'adresse geocodable : on se repere a "en face de la
 * pharmacie", "carrefour Ndokoti". Ce champ laisse l'utilisateur donner cette
 * precision au chauffeur au lieu de le bloquer sur une adresse exacte.
 *
 * Il est facultatif : la destination reste le lieu geocode.
 */
export function LandmarkField({ value, onChangeText }: Props) {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>Point de repère</Text>
      <Text style={styles.hint}>
        Facultatif — aide le chauffeur à vous retrouver.
      </Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Ex. en face de la pharmacie du carrefour"
        placeholderTextColor={colors.textFaint}
        autoCorrect={false}
        accessibilityLabel="Point de repère"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
  title: typography.subtitle,
  hint: typography.caption,
  input: {
    ...typography.body,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
