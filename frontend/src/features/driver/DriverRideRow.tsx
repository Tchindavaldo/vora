import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../theme';
import { formatDistance, formatXaf, TIER_LABELS } from '../../services/pricing';
import { METHOD_LABELS } from '../../services/payment';
import {
  formatRideDuration,
  formatRideTime,
  type DriverRide,
} from '../../services/driverRides';

type Props = {
  item: DriverRide;
};

/** Icone du vehicule, alignee sur les marqueurs de la carte. */
const TIER_ICONS = {
  moto: 'bicycle' as const,
  eco: 'car-outline' as const,
  comfort: 'car-sport-outline' as const,
};

/**
 * Une course passee : trajet, heure, duree, montant et note recue (R16 —
 * copie dediee de `DriverEarningRow`).
 *
 * Elle porte deux choses que la ligne des revenus du jour n'a pas : la DUREE
 * et la NOTE du passager. Sur une journee en cours, le chauffeur regarde ce
 * qu'il a encaisse ; sur un historique, il regarde comment il a travaille.
 *
 * Une course non evaluee affiche "Non évaluée" plutot que rien : l'absence de
 * note doit se lire comme une absence, pas comme un affichage manquant.
 */
export function DriverRideRow({ item }: Props) {
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
          {formatRideTime(item.completedAt)} · {TIER_LABELS[item.tier]} ·{' '}
          {formatDistance(item.distanceMeters)} ·{' '}
          {formatRideDuration(item.durationMinutes)}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.method}>{METHOD_LABELS[item.method]}</Text>

          {item.passengerRating === null ? (
            <Text style={styles.method}>· Non évaluée</Text>
          ) : (
            <View style={styles.rating}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={styles.ratingValue}>{item.passengerRating}</Text>
            </View>
          )}
        </View>
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  method: typography.caption,
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingValue: typography.caption,
  amount: {
    ...typography.subtitle,
    color: colors.text,
  },
});
