import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../theme';
import { formatDistance, formatXaf, TIER_LABELS } from '../../services/pricing';
import {
  earningMethodLabel,
  formatEarningTime,
  type DriverEarning,
} from '../../services/driverEarnings';

type Props = {
  item: DriverEarning;
};

/** Icone du vehicule, alignee sur les marqueurs de la carte. */
const TIER_ICONS = {
  moto: 'bicycle' as const,
  eco: 'car-outline' as const,
  comfort: 'car-sport-outline' as const,
};

/**
 * Une course encaissee : trajet, heure, montant (R16 — copie dediee de
 * `TransactionRow` cote passager).
 *
 * Le montant est a DROITE et non dans le corps du texte : le chauffeur
 * parcourt sa journee en lisant une colonne de montants, pas trois lignes de
 * detail par course.
 */
export function DriverEarningRow({ item }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.icon}>
        <Ionicons name={TIER_ICONS[item.tier]} size={20} color={colors.text} />
      </View>

      <View style={styles.body}>
        <Text style={styles.trip} numberOfLines={1}>
          {item.pickupLabel} → {item.destinationLabel}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {formatEarningTime(item.completedAt)} · {TIER_LABELS[item.tier]} ·{' '}
          {formatDistance(item.distanceMeters)}
        </Text>

        <Text style={styles.method}>{earningMethodLabel(item.method)}</Text>
      </View>

      <Text style={styles.amount}>{formatXaf(item.amountXaf)}</Text>
    </View>
  );
}

const ICON = 40;

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  trip: {
    ...typography.subtitle,
  },
  meta: typography.caption,
  method: typography.caption,
  amount: {
    ...typography.subtitle,
    color: colors.text,
  },
});
