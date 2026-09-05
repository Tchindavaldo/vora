import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing, typography } from '../../../theme';

type Props = {
  /** Nombre de vehicules disponibles autour de l'utilisateur. */
  nearbyCount: number;
  /**
   * Repere local (quartier), pas une adresse GPS. Choix produit : a Douala,
   * "Bonapriso" parle a tout le monde, "4.05, 9.70" a personne.
   */
  areaLabel: string;
  /** Initiale affichee dans le bouton profil. */
  userInitial: string;
  onMenuPress: () => void;
  onProfilePress: () => void;
};

/**
 * Barre superieure FLOTTANTE : deux boutons ronds et un badge poses sur la
 * carte, sans fond pleine largeur. Une barre pleine mangerait de l'espace
 * carte, qui est le contenu principal de cet ecran.
 */
export function HomeHeader({
  nearbyCount,
  areaLabel,
  userInitial,
  onMenuPress,
  onProfilePress,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + spacing.sm }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onMenuPress}
        style={styles.circleButton}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le menu"
      >
        <Ionicons name="menu" size={22} color={colors.text} />
      </Pressable>

      <View style={styles.badge}>
        <View style={styles.onlineDot} />
        <Text style={styles.badgeText} numberOfLines={2}>
          {nearbyCount} chauffeurs à proximité · {areaLabel}
        </Text>
      </View>

      <Pressable
        onPress={onProfilePress}
        style={[styles.circleButton, styles.avatar]}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le profil"
      >
        <Text style={styles.avatarText}>{userInitial}</Text>
      </Pressable>
    </View>
  );
}

const CIRCLE = 46;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  circleButton: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  avatar: {
    backgroundColor: colors.text,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.floating,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.online,
  },
  badgeText: {
    ...typography.label,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
});
