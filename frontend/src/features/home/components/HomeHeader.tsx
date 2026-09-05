import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing, typography } from '../../../theme';

type Props = {
  /** Nombre de vehicules disponibles autour de l'utilisateur. */
  nearbyCount: number;
  /** Initiale affichee dans le bouton profil. */
  userInitial: string;
  /** Ouvre l'historique des courses et de leurs paiements. */
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
        accessibilityLabel="Voir mes courses"
      >
        <Ionicons name="receipt-outline" size={22} color={colors.text} />
      </Pressable>

      {/* Le badge ne s'etire pas : il se dimensionne sur son texte et reste
          centre entre les deux boutons. Un badge en flex:1 passait sur deux
          lignes et faisait grandir toute la barre. */}
      <View style={styles.badgeSlot} pointerEvents="box-none">
        <View style={styles.badge}>
          <View style={styles.onlineDot} />
          <Text style={styles.badgeText} numberOfLines={1}>
            {nearbyCount} chauffeurs à proximité
          </Text>
        </View>
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
    alignItems: 'center',
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
  // Occupe l'espace entre les deux boutons et y centre le badge, sans lui
  // imposer cette largeur.
  badgeSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CIRCLE,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
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
  },
});
