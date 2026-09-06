import React from 'react';
import {
  Image,
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
import { formatXaf, TIER_LABELS } from '../../../services/pricing';
import { STAR_LABELS, type RatingStars } from '../../../services/ratings';
import type { Driver, Ride } from '../../../services/rides';

type Props = {
  ride: Ride;
  driver: Driver;
  stars: RatingStars | null;
  onSelectStars: (stars: RatingStars) => void;
  isSent: boolean;
  /** Passe a l'ecran de commentaire. Inactif tant qu'aucune etoile n'est mise. */
  onNext: () => void;
  /** Ferme l'evaluation et revient a l'accueil, notee ou non. */
  onClose: () => void;
};

const STAR_VALUES: RatingStars[] = [1, 2, 3, 4, 5];

/**
 * Evaluation du chauffeur, derniere etape du parcours passager (brief §21).
 *
 * Panneau dedie a la feature `ride` (R16) : il partage l'ossature du
 * `RideTrackingSheet` mais n'en depend pas — ils divergeront (le suivi affiche
 * une progression, celui-ci un formulaire).
 *
 * Le passager peut toujours partir sans noter : une evaluation forcee produit
 * des 5 etoiles donnes pour fermer l'ecran, qui ne valent rien.
 */
export function RatingSheet({
  ride,
  driver,
  stars,
  onSelectStars,
  isSent,
  onNext,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  if (isSent) {
    return (
      <View
        style={[
          styles.sheet,
          { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.thanks}>
          <Ionicons
            name="checkmark-circle"
            size={44}
            color={colors.primary}
          />
          <Text style={styles.thanksTitle}>Merci pour votre note</Text>
          <Text style={styles.thanksText}>
            Votre avis aide {driver.name} et les prochains passagers.
          </Text>

          <Pressable
            onPress={onClose}
            style={[styles.submit, styles.thanksButton]}
            accessibilityRole="button"
            accessibilityLabel="Revenir à l’accueil"
          >
            <Text style={styles.submitLabel}>Retour à l’accueil</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.sheet,
        // Voir DestinationSheet : la marge systeme s'ajoute a la hauteur.
        { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Comment s’est passée la course ?</Text>

        <View style={styles.driver}>
          {driver.photoUrl !== null ? (
            <Image source={{ uri: driver.photoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.initial}>{driver.name.charAt(0)}</Text>
            </View>
          )}

          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {driver.name}
            </Text>
            <Text style={styles.tripLine} numberOfLines={1}>
              {TIER_LABELS[ride.tier]} · {formatXaf(ride.amountXaf)}
            </Text>
          </View>
        </View>

        {/*
          Etoiles en grand : c'est la seule action obligatoire de l'ecran, et
          elle se fait au pouce d'une main. Une etoile de 20 px se rate.
        */}
        <View style={styles.stars}>
          {STAR_VALUES.map((value) => {
            const isFilled = stars !== null && value <= stars;

            return (
              <Pressable
                key={value}
                onPress={() => onSelectStars(value)}
                style={styles.star}
                accessibilityRole="button"
                accessibilityLabel={`Donner ${value} étoile${value > 1 ? 's' : ''}`}
              >
                <Ionicons
                  name={isFilled ? 'star' : 'star-outline'}
                  size={38}
                  color={isFilled ? colors.primary : colors.border}
                />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.starLabel}>
          {stars === null ? 'Touchez une étoile pour noter' : STAR_LABELS[stars]}
        </Text>

        <Pressable
          onPress={onNext}
          disabled={stars === null}
          style={[styles.submit, stars === null && styles.submitDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Passer au commentaire"
        >
          <Text style={styles.submitLabel}>Suivant</Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          style={styles.skip}
          accessibilityRole="button"
          accessibilityLabel="Passer l’évaluation"
        >
          <Text style={styles.skipLabel}>Plus tard</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const PHOTO = 52;

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
  },
  title: typography.subtitle,
  driver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
  },
  photoFallback: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    ...typography.title,
    color: colors.primary,
  },
  identity: {
    flex: 1,
    gap: spacing.xs,
  },
  name: typography.subtitle,
  tripLine: typography.caption,
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  star: {
    padding: spacing.xs,
  },
  starLabel: {
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  submit: {
    marginTop: spacing.lg,
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
  skip: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skipLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  thanks: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  // Le conteneur du remerciement centre ses enfants : sans largeur explicite,
  // le bouton se reduirait a la taille de son texte.
  thanksButton: {
    alignSelf: 'stretch',
  },
  thanksTitle: typography.subtitle,
  thanksText: {
    ...typography.caption,
    textAlign: 'center',
  },
});
