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

import { colors, radius, shadows, SHEET_HEIGHT, spacing, typography } from '../../theme';
import {
  DRIVER_REPORT_MAX_LENGTH,
  DRIVER_REPORT_REASONS,
  DRIVER_REPORT_REASON_LABELS,
  type DriverReportReason,
} from '../../services/driverSafety';

type Props = {
  reason: DriverReportReason | null;
  onSelectReason: (reason: DriverReportReason) => void;
  details: string;
  onChangeDetails: (details: string) => void;
  step: 'idle' | 'sending' | 'sent';
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
};

/**
 * Signalement d'un passager par le chauffeur (R10, brief §10.3).
 *
 * Copie dediee de `ReportSheet` (feature `ride`, cote passager) — R16. Les
 * motifs sont ceux du chauffeur : on ne signale pas un passager pour les memes
 * faits qu'un chauffeur. Le commentaire reste facultatif — l'exiger
 * dissuaderait de signaler.
 */
export function DriverReportSheet({
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
          <Text style={styles.sentTitle}>Signalement envoyé</Text>
          <Text style={styles.sentBody}>
            Notre équipe examine votre signalement. Vous ne serez plus mis en
            relation avec ce passager en attendant.
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.submit}
            accessibilityRole="button"
            accessibilityLabel="Fermer le signalement"
          >
            <Text style={styles.submitLabel}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.sheet,
        { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            Signaler le passager
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fermer le signalement"
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.reasons}>
          {DRIVER_REPORT_REASONS.map((item) => {
            const isSelected = item === reason;
            return (
              <Pressable
                key={item}
                onPress={() => onSelectReason(item)}
                style={[styles.reason, isSelected && styles.reasonSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={DRIVER_REPORT_REASON_LABELS[item]}
              >
                <Text
                  style={[
                    styles.reasonLabel,
                    isSelected && styles.reasonLabelSelected,
                  ]}
                >
                  {DRIVER_REPORT_REASON_LABELS[item]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={styles.details}
          value={details}
          onChangeText={onChangeDetails}
          placeholder="Précisez si vous le souhaitez… (facultatif)"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={DRIVER_REPORT_MAX_LENGTH}
          accessibilityLabel="Détails du signalement"
        />

        {error !== null && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={onSubmit}
          disabled={reason === null || step === 'sending'}
          style={[
            styles.submit,
            (reason === null || step === 'sending') && styles.submitDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Envoyer le signalement"
        >
          <Text style={styles.submitLabel}>
            {step === 'sending' ? 'Envoi…' : 'Envoyer le signalement'}
          </Text>
        </Pressable>

        <Text style={styles.simulated}>
          Signalement simulé — aucun dossier n’est réellement ouvert.
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.subtitle,
    flex: 1,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  reason: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  reasonSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  reasonLabel: {
    ...typography.label,
    color: colors.text,
  },
  reasonLabelSelected: {
    color: colors.primary,
  },
  details: {
    ...typography.label,
    color: colors.text,
    marginTop: spacing.md,
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.label,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  submit: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitLabel: {
    ...typography.subtitle,
    color: colors.surface,
  },
  simulated: {
    ...typography.caption,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  sentContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  sentTitle: typography.subtitle,
  sentBody: {
    ...typography.label,
    textAlign: 'center',
  },
});
