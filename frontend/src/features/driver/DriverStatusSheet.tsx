import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, SHEET_HEIGHT, spacing, typography } from '../../theme';
import { formatDistance, formatXaf, TIER_LABELS, type VehicleTier } from '../../services/pricing';

type Props = {
  isOnline: boolean;
  earningsTodayXaf: number;
  ridesToday: number;
  distanceTodayMeters: number;
  rating: number;
  vehicleTier: VehicleTier;
  vehicleModel: string;
  vehiclePlate: string;
  onToggleOnline: (value: boolean) => void;
};

/**
 * Panneau bas du tableau de bord chauffeur (R16).
 *
 * Copie dediee, sur le meme gabarit que les sheets passager (`SHEET_HEIGHT`,
 * memes ombres) mais avec un contenu propre au chauffeur : le statut en
 * ligne/hors ligne et les gains du jour, pas de recherche ni d'estimation.
 * Un chauffeur regarde une carte, ce panneau ne fait que porter le controle
 * qui manquerait sinon.
 */
export function DriverStatusSheet({
  isOnline,
  earningsTodayXaf,
  ridesToday,
  distanceTodayMeters,
  rating,
  vehicleTier,
  vehicleModel,
  vehiclePlate,
  onToggleOnline,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.sheet,
        {
          height: SHEET_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusLabelGroup}>
            <View
              style={[styles.statusDot, { backgroundColor: isOnline ? colors.online : colors.textFaint }]}
            />
            <Text style={styles.statusLabel}>
              {isOnline ? 'En ligne — vous recevez des demandes' : 'Hors ligne'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={onToggleOnline}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={isOnline ? colors.primary : colors.surface}
          />
        </View>

        {isOnline && <Text style={styles.statusHint}>En attente d’une demande…</Text>}

        {/*
          `flex: 1` sur la grille et sur chaque rangee : le sheet a une
          hauteur fixe (SHEET_HEIGHT) et le contenu au-dessus/dessous ne
          l'occupe pas toute — les cards etirent leur padding pour combler cet
          espace au lieu de rester tassees en haut.
        */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatXaf(earningsTodayXaf)}</Text>
              <Text style={styles.statLabel}>Gains</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{ridesToday}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.text} />
                <Text style={styles.statValue}>{rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>Note</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatDistance(distanceTodayMeters)}</Text>
              <Text style={styles.statLabel}>Parcourus</Text>
            </View>
          </View>
        </View>

        <View style={styles.vehicleCard}>
          <View style={styles.vehicleHeader}>
            <Ionicons name="car-outline" size={18} color={colors.text} />
            <Text style={styles.vehicleTier}>{TIER_LABELS[vehicleTier]}</Text>
          </View>
          <Text style={styles.vehicleText} numberOfLines={1}>
            {vehicleModel} · {vehiclePlate}
          </Text>
        </View>

        <Text style={styles.notice}>
          Tableau de bord de démonstration — position et gains simulés.
        </Text>
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
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    ...typography.label,
    color: colors.text,
    flexShrink: 1,
  },
  statusHint: {
    ...typography.caption,
    marginLeft: 18,
  },
  statsGrid: {
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    gap: 4,
    alignItems: 'center',
  },
  statValue: {
    ...typography.title,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vehicleTier: {
    ...typography.label,
    color: colors.text,
    fontWeight: '600',
  },
  vehicleText: {
    ...typography.caption,
  },
  notice: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
