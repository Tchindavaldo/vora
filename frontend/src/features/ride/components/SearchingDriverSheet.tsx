import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { formatXaf, TIER_LABELS, type VehicleTier } from '../../../services/pricing';

type Props = {
  destinationLabel: string;
  tier: VehicleTier;
  amountXaf: number;
  /** Message d'echec de la creation de la course, `null` si tout va bien (R8). */
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
};

/**
 * Etat d'attente : la course est creee, aucun chauffeur n'a encore accepte.
 *
 * NOTE : panneau dedie a la feature `ride`, copie de la structure du
 * `FareSheet` plutot qu'une variante de celui-ci (R16). Ils partagent la
 * hauteur et le coin arrondi, rien d'autre : celui-ci n'a ni tarifs a comparer
 * ni bouton de commande, et evoluera vers l'affichage du nombre de chauffeurs
 * contactes.
 */
export function SearchingDriverSheet({
  destinationLabel,
  tier,
  amountXaf,
  error,
  onRetry,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.sheet,
        {
          // Voir DestinationSheet : la marge systeme s'ajoute a la hauteur.
          height: SHEET_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.content}>
        {error !== null ? (
          <View style={styles.state}>
            <Ionicons name="alert-circle" size={28} color={colors.textMuted} />
            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              onPress={onRetry}
              style={styles.retry}
              accessibilityRole="button"
              accessibilityLabel="Réessayer la commande"
            >
              <Text style={styles.retryLabel}>Réessayer</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} size="large" />

            <Text style={styles.title}>Recherche d’un chauffeur…</Text>

            <Text style={styles.summary} numberOfLines={1}>
              {TIER_LABELS[tier]} · {formatXaf(amountXaf)} · {destinationLabel}
            </Text>

            {/*
              Le chauffeur trouve vient de donnees de demonstration tant que le
              backend n'existe pas : on le dit ici, avant meme qu'il apparaisse
              (brief §23, R13).
            */}
            <Text style={styles.simulated}>
              Recherche simulée — aucun chauffeur réel n’est contacté.
            </Text>
          </View>
        )}

        <Pressable
          onPress={onCancel}
          style={styles.cancel}
          accessibilityRole="button"
          accessibilityLabel="Annuler la recherche"
        >
          <Text style={styles.cancelLabel}>Annuler</Text>
        </Pressable>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  // Bloc central : le panneau n'a qu'une chose a dire, elle occupe la place.
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: typography.title,
  summary: {
    ...typography.label,
    textAlign: 'center',
  },
  simulated: {
    ...typography.caption,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retry: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  retryLabel: {
    ...typography.label,
    color: colors.text,
  },
  cancel: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
});
