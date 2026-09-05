import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, shadows, spacing, typography } from "../../../theme";
import type { LocationStatus } from "../useUserLocation";

type Props = {
  status: LocationStatus;
  cityLabel: string;
};

/**
 * Bandeau affiche quand la carte ne montre PAS la vraie position (R8).
 *
 * On dit ou l'on est ("carte centree sur Douala") plutot que d'afficher une
 * erreur technique : l'utilisateur peut continuer a saisir sa destination,
 * l'app reste utilisable sans geolocalisation.
 */
export function LocationNotice({ status, cityLabel }: Props) {
  const insets = useSafeAreaInsets();

  if (status === "loading" || status === "granted") return null;

  const message =
    status === "denied"
      ? `Localisation désactivée · carte centrée sur ${cityLabel}`
      : `Position introuvable · carte centrée sur ${cityLabel}`;

  return (
    // Quand la geoloc est coupee, ce bandeau est le dernier element de l'ecran :
    // c'est donc lui qui doit degager la zone systeme du bas, sinon il colle au
    // bord et passe sous la barre de navigation.
    <View
      style={[styles.container, { marginBottom: insets.bottom + spacing.md }]}
    >
      <Ionicons name="location-outline" size={16} color={colors.surface} />
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {status === "denied" && (
        <Pressable
          onPress={() => Linking.openSettings()}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir les réglages de localisation"
        >
          <Text style={styles.action}>Activer</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    // Fond sombre : ce bandeau doit se detacher franchement de la carte claire,
    // la ou une surface blanche s'y fondait.
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    marginHorizontal: spacing.lg,
    ...shadows.floating,
  },
  message: {
    ...typography.caption,
    color: colors.surface,
    flex: 1,
    lineHeight: 16,
  },
  // Pilule blanche sur fond noir : l'action doit se lire comme un bouton, pas
  // comme un mot du message.
  actionButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  action: {
    ...typography.label,
    color: colors.text,
    fontWeight: "600",
  },
});
