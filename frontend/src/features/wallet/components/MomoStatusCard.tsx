import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../../theme';
import type { MomoTransaction } from '../../../services/momo';

type Props = {
  momo: MomoTransaction;
  onRetry: () => void;
  onDone: () => void;
};

/**
 * Etat du tunnel Mobile Money, du depart de la demande au verdict.
 *
 * Un seul composant pour les quatre etats : le passager suit une progression,
 * pas une succession d'ecrans sans rapport. Le message vient du service — il
 * sera plus tard celui de l'operateur, affiche tel quel.
 */
export function MomoStatusCard({ momo, onRetry, onDone }: Props) {
  const isPending = momo.state === 'waiting' || momo.state === 'ussd_sent';

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        {isPending ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={momo.state === 'success' ? 'checkmark-circle' : 'close-circle'}
            size={22}
            color={momo.state === 'success' ? colors.online : colors.danger}
          />
        )}

        <Text style={styles.title}>
          {momo.state === 'waiting' && 'Envoi en cours'}
          {momo.state === 'ussd_sent' && 'En attente de confirmation…'}
          {momo.state === 'success' && 'Paiement confirmé'}
          {momo.state === 'failed' && 'Paiement échoué'}
        </Text>
      </View>

      <Text style={styles.message}>{momo.message}</Text>

      {/* Cause de l'echec, distincte du message d'etat : le passager doit
          savoir quoi faire, pas seulement que ca a rate (R8). */}
      {momo.error !== null && <Text style={styles.error}>{momo.error}</Text>}

      {momo.state === 'failed' && (
        <View style={styles.actions}>
          <Pressable
            onPress={onRetry}
            style={styles.primaryAction}
            accessibilityRole="button"
            accessibilityLabel="Réessayer le paiement"
          >
            <Text style={styles.primaryActionLabel}>Réessayer</Text>
          </Pressable>

          <Pressable
            onPress={onDone}
            style={styles.secondaryAction}
            accessibilityRole="button"
            accessibilityLabel="Changer de mode de paiement"
          >
            <Text style={styles.secondaryActionLabel}>Changer de mode</Text>
          </Pressable>
        </View>
      )}

      {momo.state === 'success' && (
        <Pressable
          onPress={onDone}
          style={styles.primaryAction}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Text style={styles.primaryActionLabel}>Terminé</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    color: colors.text,
    fontWeight: '600',
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 20,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    lineHeight: 18,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryActionLabel: {
    ...typography.label,
    color: colors.surface,
    fontWeight: '600',
  },
  secondaryAction: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryActionLabel: {
    ...typography.label,
    color: colors.text,
  },
});
