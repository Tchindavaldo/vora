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

import {
  colors,
  LIST_BOTTOM_SAFE_GAP,
  radius,
  spacing,
  typography,
} from '../../../theme';
import {
  COMMENT_MAX_LENGTH,
  STAR_LABELS,
  type RatingStars,
} from '../../../services/ratings';
import type { Driver } from '../../../services/rides';

type Props = {
  driver: Driver;
  stars: RatingStars;
  comment: string;
  onChangeComment: (comment: string) => void;
  isSending: boolean;
  error: string | null;
  onSubmit: () => void;
  /** Retour aux etoiles, note conservee. */
  onBack: () => void;
};

/**
 * Commentaire libre, deuxieme temps de l'evaluation.
 *
 * PLEIN ECRAN et non un bottom sheet : un sheet a hauteur fixe est recouvert
 * par le clavier des que le champ prend le focus, et le passager tape sans voir
 * ce qu'il ecrit. Ici l'ecran occupe toute la hauteur et `KeyboardAvoidingView`
 * remonte le contenu — meme parti pris que `DestinationSearchScreen`, seul
 * autre ecran de saisie de l'app.
 */
export function RatingCommentScreen({
  driver,
  stars,
  comment,
  onChangeComment,
  isSending,
  error,
  onSubmit,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour à la note"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title} numberOfLines={1}>
          Votre avis sur {driver.name}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Rappel de la note choisie : le passager doit pouvoir la verifier
            sans revenir en arriere. */}
        <View style={styles.recap}>
          <View style={styles.recapStars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Ionicons
                key={value}
                name={value <= stars ? 'star' : 'star-outline'}
                size={18}
                color={value <= stars ? colors.primary : colors.border}
              />
            ))}
          </View>
          <Text style={styles.recapLabel}>{STAR_LABELS[stars]}</Text>
        </View>

        <TextInput
          style={styles.comment}
          value={comment}
          onChangeText={onChangeComment}
          placeholder="Ce qui s’est bien passé, ou moins bien… (facultatif)"
          placeholderTextColor={colors.textMuted}
          multiline
          autoFocus
          maxLength={COMMENT_MAX_LENGTH}
          accessibilityLabel="Commentaire sur la course"
        />

        <Text style={styles.counter}>
          {comment.length} / {COMMENT_MAX_LENGTH}
        </Text>

        {error !== null && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      {/* Barre d'action collee au bas : elle remonte avec le clavier, donc
          l'envoi reste atteignable pendant la saisie. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, LIST_BOTTOM_SAFE_GAP) + spacing.md }]}>
        <Pressable
          onPress={onSubmit}
          disabled={isSending}
          style={[styles.submit, isSending && styles.submitDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Envoyer mon évaluation"
        >
          <Text style={styles.submitLabel}>
            {isSending ? 'Envoi…' : 'Envoyer'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  recap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recapStars: {
    flexDirection: 'row',
    gap: 2,
  },
  recapLabel: typography.caption,
  comment: {
    ...typography.label,
    color: colors.text,
    marginTop: spacing.lg,
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
  },
  counter: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  error: {
    ...typography.label,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submit: {
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
});
