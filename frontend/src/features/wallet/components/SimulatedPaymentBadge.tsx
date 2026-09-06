import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../../theme';

/**
 * Mention obligatoire sur tout ecran de paiement (R13, brief §23).
 *
 * Le paiement est simule : le brief sanctionne explicitement le fait de
 * presenter du faux comme du reel. La mention est portee par l'ecran, pas
 * cachee dans une note de bas de page.
 */
export function SimulatedPaymentBadge() {
  return (
    <View style={styles.badge}>
      <Ionicons name="information-circle" size={16} color={colors.textMuted} />
      <Text style={styles.label}>
        Paiement simulé — démonstration. Aucun débit réel.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
});
