import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  LIST_BOTTOM_SAFE_GAP,
  radius,
  spacing,
  typography,
} from '../../theme';
import { formatDistance, formatXaf } from '../../services/pricing';
import {
  averageRating,
  groupRidesByDay,
  PERIOD_LABELS,
  totalRidesAmount,
  totalRidesDistance,
  type DriverRidePeriod,
} from '../../services/driverRides';
import { useDriverRides } from './useDriverRides';
import { DriverRideRow } from './DriverRideRow';

type Props = {
  onClose: () => void;
};

const PERIODS: DriverRidePeriod[] = ['week', 'month'];

/**
 * Historique des courses du chauffeur (brief §6, §14) — dernier ecran du
 * parcours chauffeur.
 *
 * Copie dediee de `DriverEarningsScreen` (R16), qui repond a une autre
 * question : les revenus disent "combien j'ai gagne aujourd'hui", l'historique
 * "qu'est-ce que j'ai fait cette semaine". D'ou trois differences assumees —
 * une periode selectionnable, un groupement PAR JOUR, et la note moyenne recue
 * dans le bilan.
 *
 * `SectionList` et non `FlatList` : les en-tetes de jour restent colles en haut
 * pendant le defilement, le chauffeur sait toujours quelle journee il lit.
 */
export function DriverRideHistoryScreen({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { items, period, setPeriod, isLoading, error, retry } = useDriverRides();

  const total = totalRidesAmount(items);
  const distance = totalRidesDistance(items);
  const rating = averageRating(items);

  const sections = groupRidesByDay(items).map((day) => ({
    key: day.key,
    label: day.label,
    totalXaf: day.totalXaf,
    data: day.rides,
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour au tableau de bord"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>Historique des courses</Text>
      </View>

      {/* La periode est AU-DESSUS du bilan et non dans un menu : elle change ce
          que le bilan compte, les deux doivent se lire ensemble. */}
      <View style={styles.periods}>
        {PERIODS.map((value) => {
          const isActive = value === period;

          return (
            <Pressable
              key={value}
              onPress={() => setPeriod(value)}
              style={[styles.period, isActive && styles.periodActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={PERIOD_LABELS[value]}
            >
              <Text style={[styles.periodLabel, isActive && styles.periodLabelActive]}>
                {PERIOD_LABELS[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!isLoading && error === null && items.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryLabel}>Total encaissé</Text>
            <Text style={styles.summaryAmount}>{formatXaf(total)}</Text>
          </View>

          <Text style={styles.summaryMeta}>
            {items.length} course{items.length > 1 ? 's' : ''} ·{' '}
            {formatDistance(distance)} parcourus
            {rating !== null && ` · ${rating.toFixed(1)} de moyenne`}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error !== null ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            onPress={retry}
            style={styles.retry}
            accessibilityRole="button"
            accessibilityLabel="Réessayer le chargement"
          >
            <Text style={styles.retryLabel}>Réessayer</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Aucune course sur cette période</Text>
          <Text style={styles.emptyBody}>
            Vos courses terminées apparaîtront ici, groupées par journée.
            Essayez une période plus large.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DriverRideRow item={item} />}
          renderSectionHeader={({ section }) => (
            <View style={styles.day}>
              <Text style={styles.dayLabel}>{section.label}</Text>
              <Text style={styles.dayTotal}>{formatXaf(section.totalXaf)}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Math.max(insets.bottom, LIST_BOTTOM_SAFE_GAP) + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          // Mention obligatoire : ne jamais presenter du simule comme reel
          // (R13, brief §23).
          ListFooterComponent={
            <Text style={styles.notice}>
              Historique simulé — aucun paiement réel n’a été effectué.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    flex: 1,
  },
  periods: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  period: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  periodLabel: {
    ...typography.caption,
    color: colors.text,
  },
  periodLabelActive: {
    color: colors.surface,
  },
  summary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: typography.label,
  summaryAmount: typography.title,
  summaryMeta: typography.caption,
  list: {
    paddingHorizontal: spacing.lg,
  },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  dayLabel: {
    ...typography.label,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dayTotal: typography.caption,
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: typography.subtitle,
  emptyBody: {
    ...typography.label,
    textAlign: 'center',
  },
  error: {
    ...typography.label,
    color: colors.danger,
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  retryLabel: {
    ...typography.label,
    color: colors.text,
  },
  notice: {
    ...typography.caption,
    textAlign: 'center',
    paddingTop: spacing.xl,
  },
});
