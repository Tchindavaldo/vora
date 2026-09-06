import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { colors, radius, spacing, typography } from '../../theme';
import { SafeBottomArea } from '../../components/SafeBottomArea';
import { formatXaf } from '../../services/pricing';
import { SimulatedPaymentBadge } from '../wallet/components/SimulatedPaymentBadge';
import type { Settlement } from './useSettlement';

type Props = {
  settlement: Settlement;
  amountXaf: number;
  /** Passe a l'evaluation du chauffeur, une fois la course reglee. */
  onDone: () => void;
  /** Abandonne ce mode et bascule sur les especes (R8). */
  onFallbackToCash: () => void;
};

/**
 * Reglement de la course, a l'arrivee (brief §8, R13).
 *
 * Ecran plein et non bottom sheet : c'est le moment ou le passager doit lire
 * une consigne (composer un code USSD, remettre une somme) sans que la carte
 * lui prenne l'attention. Il ne se ferme qu'une fois le sort du paiement connu.
 */
export function SettlementScreen({
  settlement,
  amountXaf,
  onDone,
  onFallbackToCash,
}: Props) {
  const { state, message, error, isProcessing } = settlement;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <SafeBottomArea>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>Course terminée</Text>
          <Text style={styles.amount}>{formatXaf(amountXaf)}</Text>

          <SimulatedPaymentBadge />

          <View style={styles.card}>
            <View style={styles.head}>
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name={
                    state === 'failed' ? 'close-circle' : 'checkmark-circle'
                  }
                  size={22}
                  color={state === 'failed' ? colors.danger : colors.online}
                />
              )}

              <Text style={styles.title}>
                {state === 'cash_due' && 'À régler au chauffeur'}
                {state === 'settled' && 'Paiement confirmé'}
                {state === 'failed' && 'Paiement échoué'}
                {isProcessing && 'En attente de confirmation…'}
              </Text>
            </View>

            <Text style={styles.message}>{message}</Text>

            {error !== null && <Text style={styles.error}>{error}</Text>}
          </View>

          <View style={styles.actions}>
            {state === 'failed' && (
              <>
                <Pressable
                  onPress={settlement.retry}
                  style={styles.primary}
                  accessibilityRole="button"
                  accessibilityLabel="Réessayer le paiement"
                >
                  <Text style={styles.primaryLabel}>Réessayer</Text>
                </Pressable>

                <Pressable
                  onPress={onFallbackToCash}
                  style={styles.secondary}
                  accessibilityRole="button"
                  accessibilityLabel="Payer en espèces"
                >
                  <Text style={styles.secondaryLabel}>Payer en espèces</Text>
                </Pressable>
              </>
            )}

            {/*
              Especes : c'est le passager qui confirme avoir remis la somme. Le
              chauffeur la confirme de son cote, sur son propre ecran.
            */}
            {state === 'cash_due' && (
              <Pressable
                onPress={onDone}
                style={styles.primary}
                accessibilityRole="button"
                accessibilityLabel="J’ai payé le chauffeur"
              >
                <Text style={styles.primaryLabel}>J’ai payé</Text>
              </Pressable>
            )}

            {state === 'settled' && (
              <Pressable
                onPress={onDone}
                style={styles.primary}
                accessibilityRole="button"
                accessibilityLabel="Continuer vers l’évaluation"
              >
                <Text style={styles.primaryLabel}>Continuer</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeBottomArea>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.label,
    color: colors.textMuted,
  },
  amount: {
    ...typography.title,
    fontSize: 34,
  },
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
    flex: 1,
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
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryLabel: {
    ...typography.label,
    color: colors.surface,
    fontWeight: '600',
  },
  secondary: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryLabel: {
    ...typography.label,
    color: colors.text,
  },
});
