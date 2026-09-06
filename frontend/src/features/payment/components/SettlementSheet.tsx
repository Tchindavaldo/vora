import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  radius,
  shadows,
  SHEET_HEIGHT,
  spacing,
  typography,
} from '../../../theme';
import { formatXaf } from '../../../services/pricing';
import { SimulatedPaymentBadge } from '../../wallet/components/SimulatedPaymentBadge';
import type { Settlement } from '../useSettlement';

type Props = {
  settlement: Settlement;
  amountXaf: number;
  /** Passe a l'evaluation du chauffeur, une fois la course reglee. */
  onDone: () => void;
  /** Abandonne ce mode et bascule sur les especes (R8). */
  onFallbackToCash: () => void;
};

/**
 * Reglement de la course a l'arrivee, en panneau bas (brief §8, R13).
 *
 * Copie dediee de `SettlementScreen` (R16) : meme contenu, mais rendu dans le
 * bottom sheet de l'accueil, comme une etape qui precede l'evaluation du
 * chauffeur. La carte reste visible derriere, le parcours ne change pas de
 * registre entre le suivi, le reglement et la note.
 */
export function SettlementSheet({
  settlement,
  amountXaf,
  onDone,
  onFallbackToCash,
}: Props) {
  const insets = useSafeAreaInsets();
  const { state, message, error, isProcessing } = settlement;

  return (
    <View
      style={[
        styles.sheet,
        // Voir DestinationSheet : la marge systeme s'ajoute a la hauteur.
        { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Course terminée</Text>
        <Text style={styles.amount}>{formatXaf(amountXaf)}</Text>

        <SimulatedPaymentBadge />

        <View style={styles.card}>
          <View style={styles.head}>
            {isProcessing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={state === 'failed' ? 'close-circle' : 'checkmark-circle'}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    ...shadows.sheet,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.label,
    color: colors.textMuted,
  },
  amount: {
    ...typography.title,
    fontSize: 30,
  },
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
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
  primary: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryLabel: {
    ...typography.subtitle,
    color: colors.surface,
  },
  secondary: {
    borderRadius: radius.pill,
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
