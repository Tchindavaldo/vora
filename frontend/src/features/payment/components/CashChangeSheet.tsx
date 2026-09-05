import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import {
  formatDistance,
  formatXaf,
  TIER_LABELS,
  type VehicleTier,
} from '../../../services/pricing';
import {
  CASH_BILLS,
  changeLabel,
  type CashOffer,
} from '../../../services/payment';

type Props = {
  destinationLabel: string;
  distanceMeters: number | null;
  tier: VehicleTier;
  amountXaf: number;
  /** Somme annoncee par le passager, telle qu'il la saisit. */
  billInput: string;
  onChangeBill: (value: string) => void;
  /** Monnaie calculee, `null` tant que rien n'est saisi. */
  offer: CashOffer | null;
  /** Vrai une fois la course reglee : le bouton devient "Commander". */
  isSettled: boolean;
  onConfirm: () => void;
  onContinue: () => void;
  /** Retour au choix du mode de paiement. */
  onBack: () => void;
};

/**
 * Especes : la monnaie annoncee AVANT la course (brief §8, R13).
 *
 * Le passager dit ce qu'il a en main, l'application calcule la difference avec
 * le prix de la course et affiche ce que le chauffeur devra rendre. Le
 * chauffeur voit la meme somme sur la demande de course : s'il n'a pas la
 * monnaie, il refuse et la course repart vers un autre chauffeur. A l'arrivee,
 * les deux ecrans affichent le meme chiffre — personne ne discute.
 *
 * NOTE : panneau dedie a l'etape especes, copie de la structure du
 * `PaymentSheet` plutot qu'une variante de celui-ci (R16). Ils ne partagent que
 * la hauteur, l'en-tete et la rangee de boutons ; le contenu et la suite
 * divergent deja.
 */
export function CashChangeSheet({
  destinationLabel,
  distanceMeters,
  tier,
  amountXaf,
  billInput,
  onChangeBill,
  offer,
  isSettled,
  onConfirm,
  onContinue,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();

  // Rien de saisi, ou somme insuffisante : il n'y a pas de course a commander.
  const canConfirm = offer !== null && offer.isEnough;

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="location" size={18} color={colors.primary} />

          <Text style={styles.destinationLabel} numberOfLines={1}>
            {destinationLabel}
          </Text>

          {/* Sous-titre sur la meme ligne que la destination (voir PaymentSheet). */}
          <Text style={styles.subheader} numberOfLines={1}>
            {distanceMeters !== null ? `${formatDistance(distanceMeters)} · ` : ''}
            {TIER_LABELS[tier]} {formatXaf(amountXaf)}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Avec quelle somme payez-vous ?</Text>

        <TextInput
          style={styles.input}
          value={billInput}
          onChangeText={onChangeBill}
          // Saisie libre : a Douala, on paie aussi avec un appoint deja fait,
          // pas seulement avec un billet entier.
          keyboardType="number-pad"
          placeholder="Montant en main (F CFA)"
          placeholderTextColor={colors.textFaint}
          editable={!isSettled}
          accessibilityLabel="Somme dont vous disposez, en francs CFA"
        />

        {/* Raccourcis : les coupures que l'on sort le plus souvent. */}
        <View style={styles.bills}>
          {CASH_BILLS.map((bill) => (
            <Pressable
              key={bill}
              onPress={() => onChangeBill(String(bill))}
              disabled={isSettled}
              style={[
                styles.bill,
                offer?.billXaf === bill && styles.billSelected,
                isSettled && styles.billDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Billet de ${bill} francs`}
            >
              <Text style={styles.billLabel}>{formatXaf(bill)}</Text>
            </Pressable>
          ))}
        </View>

        {/*
          La phrase de monnaie est la raison d'etre de l'ecran : elle est
          affichee des la saisie, avant meme de commander, et reprise telle
          quelle cote chauffeur.
        */}
        {offer !== null && (
          <View style={styles.change}>
            <Ionicons
              name={offer.isEnough ? 'swap-horizontal' : 'alert-circle'}
              size={20}
              color={offer.isEnough ? colors.primary : colors.textMuted}
            />
            <Text
              style={[styles.changeText, !offer.isEnough && styles.changeError]}
            >
              {changeLabel(offer)}
            </Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          Paiement simulé — le chauffeur encaisse à la descente.
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={styles.back}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Revenir au choix du mode de paiement"
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
            <Text style={styles.backLabel}>Retour</Text>
          </Pressable>

          <Pressable
            style={[styles.confirm, !canConfirm && styles.confirmDisabled]}
            disabled={!canConfirm}
            onPress={isSettled ? onContinue : onConfirm}
            accessibilityRole="button"
            accessibilityLabel={
              isSettled ? 'Commander la course' : 'Valider la monnaie'
            }
          >
            <Text style={styles.confirmLabel}>
              {isSettled ? 'Commander' : `Payer ${formatXaf(amountXaf)}`}
            </Text>
          </Pressable>
        </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  destinationLabel: {
    ...typography.subtitle,
    flex: 1,
  },
  subheader: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 0,
  },
  sectionLabel: {
    ...typography.label,
    marginTop: spacing.md,
  },
  input: {
    ...typography.subtitle,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  bills: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  billDisabled: {
    opacity: 0.5,
  },
  billLabel: {
    ...typography.label,
    color: colors.text,
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  changeText: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  changeError: {
    color: colors.textMuted,
  },
  disclaimer: {
    ...typography.caption,
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  confirm: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmLabel: {
    ...typography.subtitle,
    color: colors.surface,
  },
});
