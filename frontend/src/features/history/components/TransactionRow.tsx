import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '../../../theme';
import { TIER_LABELS } from '../../../services/pricing';
import { METHOD_LABELS } from '../../../services/payment';
import {
  formatTransactionDate,
  receiptLabel,
  type Transaction,
} from '../../../services/transactions';

type Props = {
  item: Transaction;
};

/** Icone du vehicule, alignee sur les marqueurs de la carte. */
const TIER_ICONS = {
  moto: 'bicycle' as const,
  eco: 'car-outline' as const,
  comfort: 'car-sport-outline' as const,
};

/**
 * Une course passee : destination, date, recu.
 *
 * Le recu est la raison d'etre de l'ecran — montant, mode de paiement et, en
 * especes, le billet annonce avec la monnaie rendue. Il tient sur sa propre
 * ligne plutot que dans un ecran de detail : trois lignes suffisent a lever
 * tout doute, un ecran de plus ne dirait rien de neuf.
 */
export function TransactionRow({ item }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.icon}>
        <Ionicons name={TIER_ICONS[item.tier]} size={20} color={colors.text} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.destination} numberOfLines={1}>
            {item.destinationLabel}
          </Text>

          {/* La note reste discrete : elle rappelle ce que le passager a laisse,
              elle n'est pas modifiable depuis l'historique. */}
          {item.stars !== null && (
            <View style={styles.stars}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={styles.starsLabel}>{item.stars}</Text>
            </View>
          )}
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {formatTransactionDate(item.completedAt)} · {TIER_LABELS[item.tier]}
          {item.driverName === null ? '' : ` · ${item.driverName}`}
        </Text>

        <Text style={styles.receipt}>{receiptLabel(item)}</Text>

        {/* Une course reglee en especes reste due jusqu'a la descente : le
            distinguer d'un debit evite de croire a un double paiement. */}
        <Text style={styles.method}>
          {METHOD_LABELS[item.method]}
          {item.status === 'due' ? ' — réglé au chauffeur' : ''}
        </Text>
      </View>
    </View>
  );
}

const ICON = 40;

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  destination: {
    ...typography.subtitle,
    flex: 1,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starsLabel: {
    ...typography.caption,
    color: colors.text,
  },
  meta: typography.caption,
  receipt: {
    ...typography.label,
    color: colors.text,
    marginTop: spacing.xs,
  },
  method: typography.caption,
});
