import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  METHOD_HINTS,
  METHOD_LABELS,
  PAYMENT_METHODS,
  pendingLabel,
  resultLabel,
  type Payment,
  type PaymentMethod,
} from '../../../services/payment';

type Props = {
  destinationLabel: string;
  /** Distance du trajet, affichee en sous-titre au-dessus de la destination. */
  distanceMeters: number | null;
  /** Palier retenu a l'estimation : son montant est celui a regler. */
  tier: VehicleTier;
  amountXaf: number;
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  payment: Payment | null;
  isProcessing: boolean;
  isSettled: boolean;
  onConfirm: () => void;
  /** Poursuit vers la recherche de chauffeur, une fois le paiement regle. */
  onContinue: () => void;
  onCancel: () => void;
};

const ICONS: Record<PaymentMethod, keyof typeof Ionicons.glyphMap> = {
  cash: 'cash',
  wallet: 'wallet',
  mobile_money: 'phone-portrait',
};

/**
 * Choix du mode de paiement, entre l'estimation et la recherche de chauffeur.
 *
 * NOTE : copie dediee de la structure du `FareSheet` (R16), et non une variante
 * de celui-ci. Les trois cartes ont la meme forme que les paliers de vehicule,
 * mais leur contenu, leur etat et leur suite divergent deja : ce panneau porte
 * un verdict de paiement, que l'estimation n'aura jamais.
 *
 * En-tete a deux niveaux : le sous-titre rappelle la distance et le montant du
 * mode de transport retenu, la ligne principale garde la destination. Le
 * passager doit voir ce qu'il paie sans remonter a l'ecran precedent.
 */
export function PaymentSheet({
  destinationLabel,
  distanceMeters,
  tier,
  amountXaf,
  selectedMethod,
  onSelectMethod,
  payment,
  isProcessing,
  isSettled,
  onConfirm,
  onContinue,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const hasFailed = payment?.status === 'failed';

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
          <View style={styles.headings}>
            {/* Sous-titre : distance du trajet et prix du palier retenu. */}
            <Text style={styles.subheader} numberOfLines={1}>
              {distanceMeters !== null
                ? `${formatDistance(distanceMeters)} · `
                : ''}
              {TIER_LABELS[tier]} {formatXaf(amountXaf)}
            </Text>

            <View style={styles.destination}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <Text style={styles.destinationLabel} numberOfLines={1}>
                {destinationLabel}
              </Text>
            </View>
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

        <Text style={styles.sectionLabel}>Mode de paiement</Text>

        <View style={styles.methods}>
          {PAYMENT_METHODS.map((method) => (
            <MethodCard
              key={method}
              method={method}
              isSelected={method === selectedMethod}
              // Changer de mode pendant un debit en cours laisserait deux
              // paiements en vol pour la meme course.
              disabled={isProcessing}
              onPress={() => onSelectMethod(method)}
            />
          ))}
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Montant à payer</Text>
          <Text style={styles.amountValue}>{formatXaf(amountXaf)}</Text>
        </View>

        <PaymentState
          payment={payment}
          isProcessing={isProcessing}
          selectedMethod={selectedMethod}
        />

        {/*
          Le paiement n'existe que dans l'application tant que le backend
          n'est pas branche : on le dit, plutot que de faire passer une
          simulation pour un debit reel (brief §23, R13).
        */}
        <Text style={styles.disclaimer}>
          Paiement simulé — aucun débit réel n’est effectué.
        </Text>

        <Pressable
          style={[styles.confirm, isProcessing && styles.confirmDisabled]}
          disabled={isProcessing}
          onPress={isSettled ? onContinue : onConfirm}
          accessibilityRole="button"
          accessibilityLabel={
            isSettled ? 'Commander la course' : 'Confirmer le paiement'
          }
        >
          <Text style={styles.confirmLabel}>
            {isSettled
              ? 'Commander'
              : hasFailed
                ? 'Réessayer le paiement'
                : `Payer ${formatXaf(amountXaf)}`}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/**
 * Etat du paiement, sous les cartes : attente, succes, du en especes, echec.
 * Toujours une ligne visible des qu'un paiement a ete lance — jamais d'echec
 * silencieux (R8).
 */
function PaymentState({
  payment,
  isProcessing,
  selectedMethod,
}: {
  payment: Payment | null;
  isProcessing: boolean;
  selectedMethod: PaymentMethod;
}) {
  if (payment === null) return null;

  if (isProcessing) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.stateText}>{pendingLabel(selectedMethod)}</Text>
      </View>
    );
  }

  const isFailure = payment.status === 'failed';

  return (
    <View style={styles.state}>
      <Ionicons
        name={isFailure ? 'alert-circle' : 'checkmark-circle'}
        size={20}
        color={isFailure ? colors.textMuted : colors.primary}
      />
      <Text style={[styles.stateText, isFailure && styles.stateError]}>
        {resultLabel(payment)}
      </Text>
    </View>
  );
}

function MethodCard({
  method,
  isSelected,
  disabled,
  onPress,
}: {
  method: PaymentMethod;
  isSelected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.method,
        isSelected && styles.methodSelected,
        disabled && !isSelected && styles.methodDisabled,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected, disabled }}
      accessibilityLabel={`${METHOD_LABELS[method]}, ${METHOD_HINTS[method]}`}
    >
      <Ionicons
        name={ICONS[method]}
        size={24}
        color={isSelected ? colors.primary : colors.textMuted}
      />

      <Text style={styles.methodLabel}>{METHOD_LABELS[method]}</Text>
      <Text style={styles.methodHint} numberOfLines={1}>
        {METHOD_HINTS[method]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    // Meme hauteur que les autres panneaux : voir SHEET_HEIGHT.
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headings: {
    flex: 1,
    gap: spacing.xs,
  },
  subheader: {
    ...typography.caption,
    color: colors.textMuted,
  },
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  destinationLabel: {
    ...typography.subtitle,
    flex: 1,
  },
  sectionLabel: {
    ...typography.label,
    marginTop: spacing.md,
  },
  // Les trois modes sur une seule ligne, comme les paliers de vehicule : ils se
  // comparent d'un coup d'oeil.
  methods: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  method: {
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
  methodSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  methodDisabled: {
    opacity: 0.5,
  },
  methodLabel: {
    ...typography.label,
    color: colors.text,
  },
  methodHint: typography.caption,
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  amountLabel: typography.label,
  amountValue: typography.title,
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stateText: {
    ...typography.label,
    flex: 1,
  },
  stateError: {
    color: colors.textMuted,
  },
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
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmLabel: {
    ...typography.subtitle,
    color: colors.surface,
  },
});
