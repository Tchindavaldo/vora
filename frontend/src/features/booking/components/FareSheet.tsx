import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing, typography } from '../../../theme';
import {
  formatDistance,
  formatXaf,
  TIER_LABELS,
  type Fare,
  type VehicleTier,
} from '../../../services/pricing';

type Props = {
  /** Destination retenue, affichee en tete du panneau. */
  destinationLabel: string;
  fares: Fare[];
  selectedTier: VehicleTier;
  onSelectTier: (tier: VehicleTier) => void;
  distanceMeters: number | null;
  isLoading: boolean;
  /** Message d'echec du calcul d'itineraire, `null` si tout va bien (R8). */
  error: string | null;
  onRetry: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Panneau d'estimation, pose sur la carte sous le trace de l'itineraire.
 *
 * NOTE : copie dediee, et non une variante du `DestinationSheet` de l'accueil
 * (R16). Les deux se ressemblent aujourd'hui — meme coin arrondi, meme ombre —
 * mais leur contenu n'a rien de commun et divergera : celui-ci portera bientot
 * le mode de paiement et le bouton de commande.
 */
const ICONS: Record<VehicleTier, keyof typeof Ionicons.glyphMap> = {
  moto: 'bicycle',
  eco: 'car',
  comfort: 'car-sport',
};

export function FareSheet({
  destinationLabel,
  fares,
  selectedTier,
  onSelectTier,
  distanceMeters,
  isLoading,
  error,
  onRetry,
  onConfirm,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.handle} />

      <View style={styles.header}>
        <View style={styles.destination}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <Text style={styles.destinationLabel} numberOfLines={1}>
            {destinationLabel}
          </Text>
        </View>

        <Pressable
          onPress={onCancel}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Annuler la course"
        >
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Calcul de l’itinéraire…</Text>
        </View>
      )}

      {error !== null && (
        <View style={styles.state}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={onRetry}
            style={styles.retry}
            accessibilityRole="button"
            accessibilityLabel="Réessayer le calcul"
          >
            <Text style={styles.retryLabel}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && error === null && (
        <>
          {distanceMeters !== null && (
            <Text style={styles.distance}>
              {formatDistance(distanceMeters)} par la route
            </Text>
          )}

          <View style={styles.tiers}>
            {fares.map((fare) => (
              <TierRow
                key={fare.tier}
                fare={fare}
                isSelected={fare.tier === selectedTier}
                onPress={() => onSelectTier(fare.tier)}
              />
            ))}
          </View>

          {/*
            Le tarif est calcule dans l'application tant que le backend
            n'existe pas : on le dit, plutot que de faire passer une
            estimation pour un prix ferme (brief §23, R13).
          */}
          <Text style={styles.disclaimer}>
            Tarifs estimés à titre indicatif — le prix final est confirmé par le
            chauffeur.
          </Text>

          <Pressable
            style={styles.confirm}
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel="Commander la course"
          >
            <Text style={styles.confirmLabel}>Commander</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function TierRow({
  fare,
  isSelected,
  onPress,
}: {
  fare: Fare;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tier, isSelected && styles.tierSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${TIER_LABELS[fare.tier]}, ${formatXaf(
        fare.amountXaf,
      )}, ${fare.durationMinutes} minutes`}
    >
      <Ionicons
        name={ICONS[fare.tier]}
        size={24}
        color={isSelected ? colors.primary : colors.textMuted}
      />

      <Text style={styles.tierLabel}>{TIER_LABELS[fare.tier]}</Text>
      <Text style={styles.tierPrice}>{formatXaf(fare.amountXaf)}</Text>
      <Text style={styles.tierDuration}>{fare.durationMinutes} min</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    ...shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  destination: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  destinationLabel: {
    ...typography.subtitle,
    flex: 1,
  },
  state: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  stateText: typography.label,
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
  distance: {
    ...typography.label,
    marginTop: spacing.md,
  },
  // Les trois paliers sur une seule ligne : ils se comparent d'un coup d'oeil,
  // ce qu'une liste verticale oblige a faire de haut en bas.
  tiers: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  tier: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceAlt,
  },
  tierSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tierLabel: {
    ...typography.label,
    color: colors.text,
  },
  tierPrice: typography.subtitle,
  tierDuration: typography.caption,
  disclaimer: {
    ...typography.caption,
    marginTop: spacing.md,
  },
  confirm: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  confirmLabel: {
    ...typography.subtitle,
    color: colors.surface,
  },
});
