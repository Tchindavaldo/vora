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
import { WalletBorderGlow } from './components/WalletBorderGlow';

/**
 * Hauteur de la capsule de recharge.
 *
 * Plus haute qu'un bouton ordinaire : elle porte aussi les messages du tunnel
 * USSD, qui tiennent sur deux a trois lignes. Fixe, pour que la mise en page
 * ne saute pas d'un etat a l'autre — les champs au-dessus doivent rester a
 * leur place pendant que le passager compose son code.
 */
const SUBMIT_HEIGHT = 58;

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
  const canSubmit = isAmountValid && wallet.phone.trim().length >= 9;

  const state = wallet.momo?.state ?? null;
  const hasFailed = state === 'failed';
  const hasSucceeded = state === 'success';

  // Le bouton est bloque pendant l'attente de l'operateur (une seule demande en
  // vol), et tant que la saisie n'est pas complete.
  const isDisabled = wallet.isProcessing || (!hasSucceeded && !canSubmit);

  /**
   * Libelle de la capsule : c'est elle qui porte tout le tunnel.
   *
   * Pendant l'attente, elle affiche le message du service — dont la consigne
   * USSD (« Composez *126# et validez… ») — au lieu du mot « Recharger ».
   */
  const submitLabel = wallet.isProcessing
    ? (wallet.momo?.message ?? '')
    : hasSucceeded
      ? (wallet.momo?.message ?? 'Recharge confirmée')
      : hasFailed
        ? 'Réessayer'
        : 'Recharger';

  /**
   * Un seul bouton pour les trois suites possibles : lancer la recharge,
   * la rejouer apres un echec, ou refermer le tunnel une fois credite.
   */
  const handlePress = () => {
    if (hasSucceeded) {
      wallet.reset();
      return;
    }

    wallet.topUp(amountXaf);
  };

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

          {/*
            La capsule porte TOUT le tunnel : « Envoi de la demande… », la
            consigne USSD (« Composez *126# … »), le verdict. Elle est entouree
            d'une bordure lumineuse tant que l'operateur n'a pas repondu.

            Les champs restent affiches au-dessus, jamais remplaces : pendant
            qu'il compose son code, le passager doit pouvoir relire le montant
            et le numero qu'il a saisis.
          */}
          <Pressable
            onPress={handlePress}
            disabled={isDisabled}
            style={[
              styles.submit,
              isDisabled && styles.submitDisabled,
              wallet.isProcessing && styles.submitBusy,
              hasFailed && styles.submitFailed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
          >
            <WalletBorderGlow
              active={wallet.isProcessing}
              borderRadius={SUBMIT_HEIGHT / 2}
            />

            <Text style={styles.submitLabel} numberOfLines={3}>
              {submitLabel}
            </Text>
          </Pressable>

          {/*
            Cause de l'echec sous la capsule : elle dit quoi faire, quand le
            bouton ne porte que l'invitation a reessayer (R8).
          */}
          {wallet.momo?.error != null && (
            <Text style={styles.error}>{wallet.momo.error}</Text>
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
    // Hauteur MINIMALE et non fixe : la capsule doit pouvoir grandir pour un
    // message USSD un peu long, sans jamais retrecir sous cette taille. Les
    // champs de saisie etant AU-DESSUS, ils ne bougent pas quand elle grandit.
    minHeight: SUBMIT_HEIGHT,
    backgroundColor: colors.primary,
    borderRadius: SUBMIT_HEIGHT / 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  // Attente de l'operateur : fond assombri pour que la bordure lumineuse et le
  // message priment sur l'aplat d'accent.
  submitBusy: {
    backgroundColor: colors.primaryPressed,
    // La capsule est inactive pendant l'attente, mais son message doit rester
    // parfaitement lisible : on annule l'attenuation du bouton desactive.
    opacity: 1,
  },
  // Echec : la capsule devient une invitation a reessayer, sans l'aplat
  // d'accent qui se lirait comme un succes.
  submitFailed: {
    backgroundColor: colors.text,
  },
  submitLabel: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
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
