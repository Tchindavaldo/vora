import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '../../../theme';
import type { LocationStatus } from '../useUserLocation';

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
  if (status === 'loading' || status === 'granted') return null;

  const message =
    status === 'denied'
      ? `Localisation désactivée · carte centrée sur ${cityLabel}`
      : `Position introuvable · carte centrée sur ${cityLabel}`;

  return (
    <View style={styles.container}>
      <Ionicons name="location-outline" size={16} color={colors.text} />
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {status === 'denied' && (
        <Pressable
          onPress={() => Linking.openSettings()}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    ...shadows.floating,
  },
  message: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    lineHeight: 16,
  },
  action: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '600',
  },
});
