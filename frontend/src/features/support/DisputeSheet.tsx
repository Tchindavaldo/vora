import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
} from '../../theme';
import {
  DISPUTE_MAX_LENGTH,
  DISPUTE_REASON_LABELS,
  DISPUTE_REASONS,
  DISPUTE_REPLY_DELAY,
  type DisputeReason,
} from '../../services/support';
import type { DisputeStep } from './useSupport';

type Props = {
  /** Course concernee, telle qu'affichee au passager : "Akwa, hier à 18:20". */
  rideLabel: string;
  reason: DisputeReason | null;
  onSelectReason: (reason: DisputeReason) => void;
  details: string;
  onChangeDetails: (details: string) => void;
  step: DisputeStep;
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
};

/**
 * Litige sur une course passee (brief §14).
 *
 * Copie dediee de `ReportSheet` (R16) : meme gabarit — motifs en liste fermee,
 * commentaire facultatif, etat d'envoi — mais un objet different. Le
 * signalement vise le CHAUFFEUR et part a l'equipe securite ; le litige vise la
 * COURSE et part au support client. Fusionner les deux enverrait un montant
 * conteste a l'equipe qui traite les agressions.
 *
 * Le commentaire reste facultatif : l'exiger ferait renoncer un passager qui
 * conteste simplement un montant.
 */
export function DisputeSheet({
  rideLabel,
  reason,
  onSelectReason,
  details,
  onChangeDetails,
  step,
  error,
  onSubmit,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  /**
   * Hauteur de la sheet quand le clavier est ouvert.
   *
   * `SHEET_HEIGHT` est calibree pour un panneau au repos ; clavier ouvert, le
   * champ de saisie tombait derriere les touches. On laisse alors la sheet
   * monter jusqu'a 88 % de l'ecran : le `KeyboardAvoidingView` la remonte, et
   * la place gagnee garde l'input ET le bouton Envoyer visibles.
   */
  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);

  React.useEffect(() => {
    // `Will*` sur iOS (anime avec le clavier), `Did*` sur Android ou les
    // evenements "will" ne sont pas emis.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, () => setIsKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setIsKeyboardOpen(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const sheetHeight = isKeyboardOpen
    ? Math.max(SHEET_HEIGHT, windowHeight * 0.88)
    : SHEET_HEIGHT + insets.bottom;

  if (step === 'sent') {
    return (
      <View
        style={[
          styles.sheet,
          { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.sentContent}>
          <Ionicons name="checkmark-circle" size={40} color={colors.online} />
          <Text style={styles.sentTitle}>Litige transmis</Text>
          <Text style={styles.sentBody}>
            Notre équipe examine votre demande et vous répond {DISPUTE_REPLY_DELAY}.
            Gardez votre reçu, il peut vous être demandé.
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.submit}
            accessibilityRole="button"
            accessibilityLabel="Fermer le litige"
          >
            <Text style={styles.submitLabel}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isSending = step === 'sending';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.sheet,
        { height: sheetHeight, paddingBottom: isKeyboardOpen ? 0 : insets.bottom },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerBody}>
            <Text style={styles.title}>Ouvrir un litige</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {rideLabel}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fermer le litige"
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.reasons}>
          {DISPUTE_REASONS.map((item) => {
            const isSelected = item === reason;

            return (
              <Pressable
                key={item}
                onPress={() => onSelectReason(item)}
                style={[styles.reason, isSelected && styles.reasonSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={DISPUTE_REASON_LABELS[item]}
              >
                <Text
                  style={[
                    styles.reasonLabel,
                    isSelected && styles.reasonLabelSelected,
                  ]}
                >
                  {DISPUTE_REASON_LABELS[item]}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color={colors.surface} />
                )}
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={styles.input}
          value={details}
          onChangeText={onChangeDetails}
          placeholder="Précisez si vous le souhaitez (facultatif)"
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={DISPUTE_MAX_LENGTH}
          editable={!isSending}
        />

        {error !== null && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={() => {
            // On referme le clavier AVANT d'envoyer : sinon la sheet reste en
            // position haute pendant l'envoi puis saute a l'ecran "transmis".
            Keyboard.dismiss();
            onSubmit();
          }}
          disabled={reason === null || isSending}
          style={[
            styles.submit,
            (reason === null || isSending) && styles.submitDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Envoyer le litige"
        >
          <Text style={styles.submitLabel}>
            {isSending ? 'Envoi…' : 'Envoyer'}
          </Text>
        </Pressable>

        {/* Mention obligatoire : ne jamais presenter du simule comme reel
            (brief §23). */}
        <Text style={styles.notice}>
          Litige simulé — aucune demande n’est réellement transmise.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadows.sheet,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerBody: {
    flex: 1,
    gap: 2,
  },
  title: typography.subtitle,
  subtitle: typography.caption,
  reasons: {
    gap: spacing.sm,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  reasonLabel: {
    ...typography.label,
    color: colors.text,
  },
  reasonLabelSelected: {
    color: colors.surface,
  },
  input: {
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    textAlignVertical: 'top',
    ...typography.label,
    color: colors.text,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  submit: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    ...typography.label,
    color: colors.surface,
    fontWeight: '600',
  },
  notice: typography.caption,
  sentContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  sentTitle: typography.subtitle,
  sentBody: {
    ...typography.label,
    textAlign: 'center',
  },
});
