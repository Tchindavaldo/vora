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
 * Barre superieure FLOTTANTE : a gauche une pilule d'etat (titre + nombre de
 * chauffeurs), a droite une pilule unique regroupant les trois actions rondes.
 * Les deux pilules partagent la meme hauteur pour rester alignees sur la carte.
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
      <View style={styles.badge}>
        {hasPosition ? (
          <View style={styles.onlineDot} />
        ) : (
          <Ionicons
            name={
              locationStatus === "loading" ? "locate-outline" : "location-outline"
            }
            size={14}
            color={colors.textMuted}
          />
        )}
        <View style={styles.badgeTexts}>
          <Text style={styles.badgeTitle} numberOfLines={1}>
            Autour de vous
          </Text>
          <Text
            style={[styles.badgeText, !hasPosition && styles.badgeTextMuted]}
            numberOfLines={1}
          >
            {badgeLabel}
          </Text>
        </View>
      </View>

      {/* Les trois actions vivent dans une seule pilule : une barre de boutons
          separes deborderait la largeur a cote du badge gauche. */}
      <View style={styles.actions}>
        <Pressable
          onPress={onMenuPress}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel="Voir mes courses"
        >
          <Ionicons name="receipt-outline" size={20} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={onNotificationsPress}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={onProfilePress}
          style={[styles.action, styles.avatar]}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le profil"
        >
          <Text style={styles.avatarText}>{userInitial}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Hauteur commune aux deux pilules : elles doivent s'aligner exactement.
const PILL = 52;
const ACTION = 40;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  badge: {
    flexShrink: 1,
    height: PILL,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    ...shadows.floating,
  },
  badgeTexts: {
    flexShrink: 1,
  },
  badgeTitle: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 11,
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
  actions: {
    height: PILL,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    ...shadows.floating,
  },
  action: {
    width: ACTION,
    height: ACTION,
    borderRadius: ACTION / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    backgroundColor: colors.text,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "600",
  },
});
