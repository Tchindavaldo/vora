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

import {
  colors,
  LIST_BOTTOM_SAFE_GAP,
  radius,
  spacing,
  typography,
} from '../../theme';
import { formatXaf } from '../../services/pricing';
import { totalSpent } from '../../services/transactions';
import { useTransactions } from './useTransactions';
import { TransactionRow } from './components/TransactionRow';

type Props = {
  onClose: () => void;
};

/**
 * Historique des courses et de leurs paiements (brief §8).
 *
 * PLEIN ECRAN et non un bottom sheet : la liste est longue et se parcourt, elle
 * n'a pas a partager la hauteur avec la carte — meme parti pris que
 * `DestinationSearchScreen`. Ouvert depuis le bouton menu de l'accueil.
 */
export function TransactionHistoryScreen({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { items, isLoading, error, retry } = useTransactions();

  const total = totalSpent(items);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour à l’accueil"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>Mes courses</Text>
      </View>

      {/* Le total repond a la question que le passager se pose en ouvrant
          l'ecran — "combien j'ai depense" — sans qu'il additionne les lignes. */}
      {!isLoading && error === null && items.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>
            {items.length} course{items.length > 1 ? 's' : ''} · total dépensé
          </Text>
          <Text style={styles.summaryAmount}>{formatXaf(total)}</Text>
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
          <Text style={styles.emptyTitle}>Aucune course pour l’instant</Text>
          <Text style={styles.emptyBody}>
            Vos trajets et leurs reçus apparaîtront ici après votre première
            course.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow item={item} />}
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  summaryLabel: typography.label,
  summaryAmount: typography.subtitle,
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
