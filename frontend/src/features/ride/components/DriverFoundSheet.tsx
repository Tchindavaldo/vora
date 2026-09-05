import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import type { Driver, Ride } from '../../../services/rides';

type Props = {
  ride: Ride;
  driver: Driver;
  onCancel: () => void;
};

/**
 * Chauffeur trouve : photo, note, vehicule, plaque et delai d'arrivee.
 *
 * La plaque et le modele sont mis en avant plutot que reduits a une ligne de
 * detail : c'est ce que le passager compare au vehicule qui se presente devant
 * lui, et c'est un point de securite explicite du brief (R10).
 *
 * NOTE : panneau dedie a la feature `ride` (R16), independant du `FareSheet`.
 */
export function DriverFoundSheet({ ride, driver, onCancel }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.sheet,
        {
          height: SHEET_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eta}>
            {ride.etaMinutes !== null
              ? `Votre chauffeur arrive dans ${ride.etaMinutes} min`
              : 'Votre chauffeur arrive'}
          </Text>

          <Pressable
            onPress={onCancel}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Annuler la course"
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.driver}>
          {driver.photoUrl !== null ? (
            <Image source={{ uri: driver.photoUrl }} style={styles.photo} />
          ) : (
            // Pas de photo : l'initiale, plutot qu'une silhouette generique qui
            // n'identifie personne.
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.initial}>{driver.name.charAt(0)}</Text>
            </View>
          )}

          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {driver.name}
            </Text>

            <View style={styles.rating}>
              <Ionicons name="star" size={14} color={colors.primary} />
              <Text style={styles.ratingValue}>{driver.rating.toFixed(1)}</Text>
              <Text style={styles.ridesCount}>({driver.ridesCount} courses)</Text>
            </View>
          </View>

          <View style={styles.vehicle}>
            <Text style={styles.plate}>{driver.plate}</Text>
            <Text style={styles.model} numberOfLines={1}>
              {driver.vehicleModel}
            </Text>
          </View>
        </View>

        <View style={styles.trip}>
          <Text style={styles.tripLine} numberOfLines={1}>
            {TIER_LABELS[ride.tier]} · {ride.destinationLabel}
          </Text>
          <Text style={styles.amount}>{formatXaf(ride.amountXaf)}</Text>
        </View>

        {/* Donnees de demonstration : jamais presentees comme reelles (R13). */}
        <Text style={styles.simulated}>
          Chauffeur de démonstration — attribution simulée.
        </Text>

        <Pressable
          onPress={onCancel}
          style={styles.cancel}
          accessibilityRole="button"
          accessibilityLabel="Annuler la course"
        >
          <Text style={styles.cancelLabel}>Annuler la course</Text>
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
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eta: {
    ...typography.subtitle,
    flex: 1,
  },
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
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingValue: {
    ...typography.label,
    color: colors.text,
  },
  ridesCount: typography.caption,
  // Plaque et modele alignes a droite : le passager les lit d'un coup d'oeil
  // en comparant au vehicule devant lui.
  vehicle: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  plate: {
    ...typography.subtitle,
    letterSpacing: 1,
  },
  model: typography.caption,
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripLine: {
    ...typography.label,
    flex: 1,
  },
  amount: typography.subtitle,
  simulated: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  cancel: {
    marginTop: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
});
