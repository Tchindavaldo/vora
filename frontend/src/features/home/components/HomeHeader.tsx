import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, shadows, spacing, typography } from "../../../theme";
import type { LocationStatus } from "../useUserLocation";

type Props = {
  /** Nombre de vehicules disponibles autour de l'utilisateur. */
  nearbyCount: number;
  /** Etat de la geoloc : conditionne ce que le badge peut honnetement annoncer. */
  locationStatus: LocationStatus;
  /** Initiale affichee dans le bouton profil. */
  userInitial: string;
  /** Ouvre l'historique des courses et de leurs paiements. */
  onMenuPress: () => void;
  onProfilePress: () => void;
  onNotificationsPress: () => void;
};

/**
 * Barre superieure FLOTTANTE : deux boutons ronds et un badge poses sur la
 * carte, sans fond pleine largeur. Une barre pleine mangerait de l'espace
 * carte, qui est le contenu principal de cet ecran.
 */
export function HomeHeader({
  nearbyCount,
  locationStatus,
  userInitial,
  onMenuPress,
  onProfilePress,
  onNotificationsPress,
}: Props) {
  const insets = useSafeAreaInsets();

  // Sans position reelle, « X chauffeurs a proximite » serait un mensonge :
  // la proximite est mesuree depuis la ville par defaut, pas depuis
  // l'utilisateur. On annonce alors l'etat de la geoloc a la place (R8, R13).
  const hasPosition = locationStatus === "granted";
  const badgeLabel = hasPosition
    ? `${nearbyCount} chauffeurs à proximité`
    : locationStatus === "loading"
      ? "Localisation en cours…"
      : "Localisation désactivée";

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

      <Pressable
        onPress={onNotificationsPress}
        style={styles.circleButton}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={22} color={colors.text} />
      </Pressable>

      {/* Le badge ne s'etire pas : il se dimensionne sur son texte et reste
          centre entre les deux boutons. Un badge en flex:1 passait sur deux
          lignes et faisait grandir toute la barre. */}
      <View style={styles.badgeSlot} pointerEvents="box-none">
        <View style={styles.badge}>
          {hasPosition ? (
            <View style={styles.onlineDot} />
          ) : (
            <Ionicons
              name={
                locationStatus === "loading"
                  ? "locate-outline"
                  : "location-outline"
              }
              size={14}
              color={colors.textMuted}
            />
          )}
          <Text
            style={[styles.badgeText, !hasPosition && styles.badgeTextMuted]}
            numberOfLines={1}
          >
            {badgeLabel}
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  circleButton: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.floating,
  },
  avatar: {
    backgroundColor: colors.text,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  // Occupe l'espace entre les deux boutons et y centre le badge, sans lui
  // imposer cette largeur.
  badgeSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: CIRCLE,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
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
  badgeTextMuted: {
    color: colors.textMuted,
  },
});
