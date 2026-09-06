import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';
import { COUNTRY_CODE, PHONE_LENGTH, formatPhone } from '../../../services/session';

type Props = {
  phone: string;
  phoneValid: boolean;
  pending: boolean;
  error: string | null;
  onChangePhone: (value: string) => void;
  onSubmitPassenger: () => void;
  onSubmitDriver: () => void;
};

/**
 * Etape 1 : saisie du numero.
 *
 * L'indicatif +237 est verrouille : l'app ne dessert que le Cameroun, et un
 * selecteur de pays ne ferait qu'ajouter une erreur possible. Le lien
 * "Continuer comme chauffeur" tient lieu de selecteur de role — plus simple
 * qu'un choix impose des l'ouverture, et sans ecran supplementaire.
 */
export function PhoneStep({
  phone,
  phoneValid,
  pending,
  error,
  onChangePhone,
  onSubmitPassenger,
  onSubmitDriver,
}: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Votre numéro</Text>
      <Text style={styles.subtitle}>
        Nous vous envoyons un code à {PHONE_LENGTH} chiffres par SMS pour
        confirmer votre numéro.
      </Text>

      <View style={[styles.field, error != null && styles.fieldError]}>
        <View style={styles.prefix}>
          <Text style={styles.prefixLabel}>{COUNTRY_CODE}</Text>
        </View>
        <TextInput
          value={formatPhone(phone)}
          onChangeText={onChangePhone}
          keyboardType="number-pad"
          placeholder="6 XX XX XX XX"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          maxLength={PHONE_LENGTH + 4}
          autoFocus
          accessibilityLabel="Numéro de téléphone"
        />
      </View>

      {error != null ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={onSubmitPassenger}
        disabled={!phoneValid || pending}
        style={({ pressed }) => [
          styles.cta,
          (!phoneValid || pending) && styles.ctaDisabled,
          pressed && phoneValid && !pending && styles.ctaPressed,
        ]}
        accessibilityRole="button"
      >
        {pending ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.ctaLabel}>Continuer</Text>
        )}
      </Pressable>

      <Pressable
        onPress={onSubmitDriver}
        disabled={!phoneValid || pending}
        hitSlop={8}
        style={styles.roleLink}
        accessibilityRole="button"
      >
        <Text
          style={[styles.roleLinkLabel, !phoneValid && styles.roleLinkDisabled]}
        >
          Continuer comme chauffeur
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  title: {
    ...typography.title,
    fontSize: 26,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    lineHeight: 21,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.lg,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  prefix: {
    paddingRight: spacing.md,
    marginRight: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  prefixLabel: {
    ...typography.subtitle,
    fontSize: 17,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 1,
    padding: 0,
  },
  error: {
    ...typography.label,
    color: colors.danger,
    marginTop: spacing.md,
  },
  cta: {
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  ctaDisabled: {
    backgroundColor: colors.border,
  },
  ctaPressed: {
    backgroundColor: colors.primaryPressed,
  },
  ctaLabel: {
    ...typography.subtitle,
    color: colors.surface,
    fontSize: 17,
  },
  roleLink: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  roleLinkLabel: {
    ...typography.subtitle,
    color: colors.primary,
  },
  roleLinkDisabled: {
    color: colors.textFaint,
  },
});
