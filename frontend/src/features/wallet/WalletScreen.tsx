import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import { SafeBottomArea } from '../../components/SafeBottomArea';
import { formatXaf } from '../../services/pricing';
import {
  MIN_TOPUP_XAF,
  operatorLabel,
  TOPUP_PRESETS_XAF,
  type WalletOperator,
} from '../../services/wallet';
import { useWallet } from './useWallet';
import { SimulatedPaymentBadge } from './components/SimulatedPaymentBadge';
import { MomoStatusCard } from './components/MomoStatusCard';

type Props = {
  onClose: () => void;
};

const OPERATORS: WalletOperator[] = ['mtn', 'orange'];

/**
 * Portefeuille du passager : solde, recharge et mouvements (brief §8, R13).
 *
 * La recharge passe par le meme tunnel USSD simule que le paiement d'une
 * course : le passager choisit son operateur, saisit un montant et son numero,
 * puis compose son code. Le solde ne bouge qu'au verdict.
 */
export function WalletScreen({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const wallet = useWallet();

  const amountXaf = Number.parseInt(wallet.amountInput, 10);
  const isAmountValid =
    Number.isFinite(amountXaf) && amountXaf >= MIN_TOPUP_XAF;

  // Le numero n'est pas verifie au caractere pres : les formats varient selon
  // l'operateur, et un controle trop strict bloquerait un numero valide (R8).
  const canSubmit =
    isAmountValid && wallet.phone.trim().length >= 9 && !wallet.isProcessing;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        {/* Retour a GAUCHE du titre : convention de navigation universelle. */}
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour aux paramètres"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>Portefeuille</Text>
      </View>

      <SafeBottomArea>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Solde disponible</Text>
            <Text style={styles.balanceValue}>
              {formatXaf(wallet.balanceXaf)}
            </Text>
          </View>

          <SimulatedPaymentBadge />

          {/*
            Tunnel en cours : la saisie disparait au profit du statut. Laisser
            les champs actifs pendant que l'operateur repond inviterait a lancer
            une seconde recharge par-dessus la premiere.
          */}
          {wallet.momo !== null ? (
            <MomoStatusCard
              momo={wallet.momo}
              onRetry={() => wallet.topUp(amountXaf)}
              onDone={wallet.reset}
            />
          ) : (
            <>
              <Text style={styles.sectionTitle}>Recharger</Text>

              <View style={styles.operatorRow}>
                {OPERATORS.map((operator) => {
                  const isActive = wallet.operator === operator;

                  return (
                    <Pressable
                      key={operator}
                      onPress={() => wallet.setOperator(operator)}
                      style={[
                        styles.operatorCard,
                        isActive && styles.operatorCardActive,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={operatorLabel(operator)}
                    >
                      <Ionicons
                        name={isActive ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isActive ? colors.primary : colors.textFaint}
                      />
                      <Text
                        style={[
                          styles.operatorLabel,
                          isActive && styles.operatorLabelActive,
                        ]}
                      >
                        {operatorLabel(operator)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.presetRow}>
                {TOPUP_PRESETS_XAF.map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => wallet.setAmountInput(String(preset))}
                    style={styles.preset}
                    accessibilityRole="button"
                    accessibilityLabel={`Recharger ${formatXaf(preset)}`}
                  >
                    <Text style={styles.presetLabel}>{formatXaf(preset)}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.input}
                value={wallet.amountInput}
                onChangeText={wallet.setAmountInput}
                keyboardType="number-pad"
                placeholder={`Montant (min. ${formatXaf(MIN_TOPUP_XAF)})`}
                placeholderTextColor={colors.textFaint}
                accessibilityLabel="Montant de la recharge"
              />

              <TextInput
                style={styles.input}
                value={wallet.phone}
                onChangeText={wallet.setPhone}
                keyboardType="phone-pad"
                placeholder="Numéro Mobile Money"
                placeholderTextColor={colors.textFaint}
                accessibilityLabel="Numéro Mobile Money"
              />

              {/*
                Le montant saisi est invalide : on le dit AVANT l'appui, plutot
                que de laisser le bouton echouer sans explication (R8).
              */}
              {wallet.amountInput.length > 0 && !isAmountValid && (
                <Text style={styles.error}>
                  Montant minimum : {formatXaf(MIN_TOPUP_XAF)}.
                </Text>
              )}

              <Pressable
                onPress={() => wallet.topUp(amountXaf)}
                disabled={!canSubmit}
                style={[styles.submit, !canSubmit && styles.submitDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Lancer la recharge"
              >
                <Text style={styles.submitLabel}>Recharger</Text>
              </Pressable>
            </>
          )}

          <Text style={styles.sectionTitle}>Mouvements</Text>

          {wallet.entries.length === 0 ? (
            <Text style={styles.empty}>
              Aucun mouvement pour le moment. Vos recharges et vos courses
              payées par portefeuille apparaîtront ici.
            </Text>
          ) : (
            wallet.entries.map((entry) => (
              <View key={entry.id} style={styles.entry}>
                <Text style={styles.entryLabel} numberOfLines={1}>
                  {entry.label}
                </Text>
                <Text
                  style={[
                    styles.entryAmount,
                    entry.amountXaf < 0 && styles.entryAmountOut,
                  ]}
                >
                  {entry.amountXaf > 0 ? '+' : '-'}
                  {formatXaf(Math.abs(entry.amountXaf))}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </SafeBottomArea>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  balanceCard: {
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.surface,
  },
  balanceValue: {
    ...typography.title,
    color: colors.surface,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  operatorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  operatorCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  operatorCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  operatorLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  operatorLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  preset: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  presetLabel: {
    ...typography.caption,
    color: colors.text,
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitLabel: {
    ...typography.label,
    color: colors.surface,
    fontWeight: '600',
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  entryLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  entryAmount: {
    ...typography.label,
    color: colors.online,
    fontWeight: '600',
  },
  entryAmountOut: {
    color: colors.text,
  },
});
