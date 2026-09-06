import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import { formatDistance, formatXaf } from '../../services/pricing';
import {
  driverChangeLabel,
  REQUEST_TIMEOUT_SECONDS,
  type DriverRideRequest,
} from './driverRequests';

type Props = {
  request: DriverRideRequest;
  secondsLeft: number;
  onAccept: () => void;
  onRefuse: () => void;
};

/**
 * Demande entrante, affichee PAR-DESSUS le tableau de bord avec un compte a
 * rebours (R17 etape 9) : c'est ce qui cree la tension vue chez Yango/Uber en
 * demonstration, plutot qu'un ecran fixe sans limite de temps.
 *
 * Composant duplique de l'ancien ecran plein "demande" — R16 : celui-ci vit en
 * overlay au-dessus du tableau de bord, pas en ecran a part entiere.
 */
// Hauteur maximale de la carte : au-dela, le contenu defile plutot que de
// pousser les boutons Accepter/Refuser hors ecran sur un petit telephone.
const MAX_CARD_HEIGHT = Dimensions.get('window').height * 0.62;

export function IncomingRequestOverlay({ request, secondsLeft, onAccept, onRefuse }: Props) {
  const insets = useSafeAreaInsets();
  const distanceLabel = formatDistance(request.distanceMeters);
  const progress = secondsLeft / REQUEST_TIMEOUT_SECONDS;

  return (
    <View style={styles.backdrop}>
      <View
        style={[
          styles.card,
          { maxHeight: MAX_CARD_HEIGHT, paddingBottom: insets.bottom },
        ]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badgeRow}>
            <Text style={styles.badge}>Nouvelle demande</Text>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{secondsLeft}s</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(0, progress) * 100}%` }]} />
          </View>

          <View style={styles.routeRow}>
            <View style={styles.routeIcons}>
              <View style={styles.dotOrigin} />
              <View style={styles.routeLine} />
              <Ionicons name="location" size={14} color={colors.primary} />
            </View>

            <View style={styles.routeLabels}>
              <Text style={styles.routeLabel} numberOfLines={1}>
                {request.pickupLabel}
              </Text>
              <Text style={styles.routeLabel} numberOfLines={1}>
                {request.destinationLabel}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{distanceLabel}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{request.durationMinutes} min</Text>
          </View>

          <View style={styles.earningsBox}>
            <Text style={styles.earningsLabel}>Vous gagnez</Text>
            <Text style={styles.earningsAmount}>{formatXaf(request.earningsXaf)}</Text>
          </View>

          {request.cash !== null && (
            <View style={styles.cashBox}>
              <Ionicons name="cash-outline" size={18} color={colors.text} />
              <Text style={styles.cashText}>
                Client paie en {formatXaf(request.cash.billXaf)} — {driverChangeLabel(request.cash)}
              </Text>
            </View>
          )}

          <View style={styles.actionsRow}>
            <Pressable style={styles.refuseButton} onPress={onRefuse} accessibilityRole="button">
              <Text style={styles.refuseLabel}>Refuser</Text>
            </Pressable>
            <Pressable style={styles.acceptButton} onPress={onAccept} accessibilityRole="button">
              <Text style={styles.acceptLabel}>Accepter</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timerBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
  timerText: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  routeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  routeIcons: {
    alignItems: 'center',
    width: 14,
  },
  dotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textFaint,
  },
  routeLine: {
    width: 1,
    flex: 1,
    minHeight: 16,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  routeLabels: {
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  routeLabel: typography.body,
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: typography.label,
  metaDot: {
    ...typography.label,
    color: colors.textFaint,
  },
  earningsBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  earningsLabel: typography.caption,
  earningsAmount: {
    ...typography.title,
    color: colors.text,
  },
  cashBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cashText: {
    ...typography.label,
    color: colors.text,
    flex: 1,
    flexWrap: 'wrap',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  refuseButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  refuseLabel: {
    ...typography.label,
    color: colors.text,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  acceptLabel: {
    ...typography.label,
    color: colors.surface,
    fontWeight: '700',
  },
});
