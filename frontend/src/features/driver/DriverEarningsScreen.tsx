import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import { SafeBottomArea } from '../../components/SafeBottomArea';
import { formatDistance, formatXaf } from '../../services/pricing';
import { totalEarned, totalEarnedDistance } from '../../services/driverEarnings';
import { useDriverEarnings } from './useDriverEarnings';
import { DriverEarningRow } from './DriverEarningRow';

type Props = {
  onClose: () => void;
  /** Ouvre l'historique des courses passees, au-dela du jour courant. */
  onOpenHistory: () => void;
};

/**
 * Revenus du jour du chauffeur (brief §6, §14) : total encaisse en tete, puis
 * la liste des courses qui le composent.
 *
 * Copie dediee de `TransactionHistoryScreen` cote passager (R16) : meme
 * gabarit plein ecran — la liste se parcourt et n'a pas a partager la hauteur
 * avec la carte — mais le contenu repond a une autre question. Le passager
 * demande "combien j'ai depense et sur quoi", le chauffeur "combien j'ai gagne
 * aujourd'hui et d'ou ca vient".
 *
 * Le total est en HAUT et non en pied de liste : c'est la seule chose que le
 * chauffeur regarde entre deux courses, il ne doit pas avoir a defiler.
 */
export function DriverEarningsScreen({ onClose, onOpenHistory }: Props) {
  const insets = useSafeAreaInsets();
  const { items, isLoading, error, retry } = useDriverEarnings();

  const total = totalEarned(items);
  const distance = totalEarnedDistance(items);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Mes revenus</Text>

        {/* Le jour courant ne repond pas a "et avant ?" : la question se pose
            sur cet ecran, l'acces a l'historique y est donc directement. */}
        <Pressable
          onPress={onOpenHistory}
          hitSlop={10}
          style={styles.historyAction}
          accessibilityRole="button"
          accessibilityLabel="Voir l’historique des courses"
        >
          <Ionicons name="time-outline" size={16} color={colors.text} />
          <Text style={styles.historyLabel}>Historique</Text>
        </Pressable>

        {/* Retour a DROITE, comme sur les ecrans de profil. */}
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour au tableau de bord"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      {!isLoading && error === null && items.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Gains du jour</Text>
          <Text style={styles.summaryAmount}>{formatXaf(total)}</Text>
          <Text style={styles.summaryMeta}>
            {items.length} course{items.length > 1 ? 's' : ''} ·{' '}
            {formatDistance(distance)} parcourus
          </Text>
        </View>
      )}

      {/* La zone basse est reservee EN DEHORS de la liste : le contenu y est
          coupe au defilement au lieu de passer sous la barre de gestes. */}
      <SafeBottomArea>
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
            <Text style={styles.emptyTitle}>Aucune course aujourd’hui</Text>
            <Text style={styles.emptyBody}>
              Passez en ligne pour recevoir des demandes : vos courses et vos gains
              de la journée apparaîtront ici.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <DriverEarningRow item={item} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            // Mention obligatoire : ne jamais presenter du simule comme reel
            // (R13, brief §23).
            ListFooterComponent={
              <Text style={styles.notice}>
                Revenus simulés — aucun paiement réel n’a été effectué.
              </Text>
            }
          />
        )}
      </SafeBottomArea>
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
  historyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyLabel: {
    ...typography.caption,
    color: colors.text,
  },
  summary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  summaryLabel: typography.label,
  summaryAmount: typography.title,
  summaryMeta: typography.caption,
  list: {
    paddingHorizontal: spacing.lg,
  },
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
