import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';
import { COUNTRY_CODE, OTP_LENGTH, formatPhone } from '../../../services/session';

type Props = {
  phone: string;
  code: string;
  codeComplete: boolean;
  pending: boolean;
  error: string | null;
  secondsLeft: number;
  demoCode: string;
  onChangeCode: (value: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onEditPhone: () => void;
};

/**
 * Etape 2 : saisie du code a 4 chiffres.
 *
 * Les cases sont un decor : un SEUL `TextInput` invisible recoit la frappe, et
 * les cases n'en sont que l'affichage. Quatre champs separes obligeraient a
 * gerer a la main le focus, l'effacement et le collage du SMS — beaucoup de
 * code fragile pour le meme resultat (R18).
 */
export function CodeStep({
  phone,
  code,
  codeComplete,
  pending,
  error,
  secondsLeft,
  demoCode,
  onChangeCode,
  onSubmit,
  onResend,
  onEditPhone,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const cells = Array.from({ length: OTP_LENGTH });

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Code de vérification</Text>

      <View style={styles.recall}>
        <Text style={styles.recallText}>
          Envoyé au {COUNTRY_CODE} {formatPhone(phone)}
        </Text>
        <Pressable onPress={onEditPhone} hitSlop={8} accessibilityRole="button">
          <Text style={styles.recallLink}>Modifier</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.cells}
        accessibilityRole="button"
        accessibilityLabel="Saisir le code de vérification"
      >
        {cells.map((_, index) => {
          const filled = index < code.length;
          const active = index === code.length;
          return (
            <View
              key={index}
              style={[
                styles.cell,
                filled && styles.cellFilled,
                active && styles.cellActive,
                error != null && styles.cellError,
              ]}
            >
              <Text style={styles.cellText}>{filled ? code[index] : ''}</Text>
            </View>
          );
        })}

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChangeCode}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
          style={styles.hiddenInput}
        />
      </Pressable>

      {error != null ? <Text style={styles.error}>{error}</Text> : null}

      {/* Le code de demonstration est annonce : ne jamais laisser le jury
          croire qu'un vrai SMS part alors que la verification est simulee. */}
      <Text style={styles.demoNotice}>
        Démonstration — aucun SMS n’est envoyé, le code est {demoCode}.
      </Text>

      <Pressable
        onPress={onSubmit}
        disabled={!codeComplete || pending}
        style={({ pressed }) => [
          styles.cta,
          (!codeComplete || pending) && styles.ctaDisabled,
          pressed && codeComplete && !pending && styles.ctaPressed,
        ]}
        accessibilityRole="button"
      >
        {pending ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.ctaLabel}>Vérifier</Text>
        )}
      </Pressable>

      <View style={styles.resend}>
        {secondsLeft > 0 ? (
          <Text style={styles.resendWaiting}>
            Renvoyer le code dans {secondsLeft} s
          </Text>
        ) : (
          <Pressable onPress={onResend} hitSlop={8} accessibilityRole="button">
            <Text style={styles.resendLink}>Renvoyer le code</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const CELL_SIZE = 62;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  title: {
    ...typography.title,
    fontSize: 26,
  },
  recall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  recallText: {
    ...typography.body,
    color: colors.textMuted,
  },
  recallLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  cells: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE + 6,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  cellActive: {
    borderColor: colors.primary,
  },
  cellError: {
    borderColor: colors.danger,
  },
  cellText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  // Champ reel : present dans l'arbre pour recevoir la frappe et le code SMS,
  // mais invisible — ce sont les cases au-dessus qui montrent la saisie.
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
  error: {
    ...typography.label,
    color: colors.danger,
    marginTop: spacing.md,
  },
  demoNotice: {
    ...typography.caption,
    marginTop: spacing.lg,
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
  resend: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  resendWaiting: {
    ...typography.label,
  },
  resendLink: {
    ...typography.subtitle,
    color: colors.primary,
  },
});
