import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadows, spacing, typography } from '../../theme';
import { DriverStatusSheet } from './DriverStatusSheet';
import { DEMO_DRIVER } from './useDriverSession';

type Props = {
  isOnline: boolean;
  earningsTodayXaf: number;
  ridesToday: number;
  distanceTodayMeters: number;
  onToggleOnline: (value: boolean) => void;
  onOpenProfile: () => void;
};

/**
 * Tableau de bord chauffeur — ecran d'accueil du mode chauffeur.
 *
 * Ne rend QUE l'en-tete et le panneau bas : la carte plein ecran et le
 * vehicule du chauffeur sont montes par `DriverApp`, en dessous, et partages
 * avec l'ecran de course pour eviter un rechargement a l'acceptation.
 */
export function DriverDashboardScreen({
  isOnline,
  earningsTodayXaf,
  ridesToday,
  distanceTodayMeters,
  onToggleOnline,
  onOpenProfile,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root} pointerEvents="box-none">
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={onOpenProfile}
          style={styles.identity}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le profil chauffeur"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{DEMO_DRIVER.initial}</Text>
          </View>
          <View>
            <Text style={styles.name}>{DEMO_DRIVER.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.text} />
              <Text style={styles.ratingText}>{DEMO_DRIVER.rating.toFixed(1)}</Text>
            </View>
          </View>
        </Pressable>
      </View>

      <View style={styles.sheetStack} pointerEvents="box-none">
        <DriverStatusSheet
          isOnline={isOnline}
          earningsTodayXaf={earningsTodayXaf}
          ridesToday={ridesToday}
          distanceTodayMeters={distanceTodayMeters}
          rating={DEMO_DRIVER.rating}
          vehicleTier={DEMO_DRIVER.vehicleTier}
          vehicleModel={DEMO_DRIVER.vehicleModel}
          vehiclePlate={DEMO_DRIVER.plate}
          onToggleOnline={onToggleOnline}
        />
      </View>
    </View>
  );
}

const AVATAR = 44;

const styles = StyleSheet.create({
  // Transparent : la carte est montee par `DriverApp`, en dessous.
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingRight: spacing.lg,
    paddingLeft: spacing.xs,
    ...shadows.floating,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.subtitle,
    color: colors.surface,
  },
  name: typography.subtitle,
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: typography.caption,
  sheetStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
