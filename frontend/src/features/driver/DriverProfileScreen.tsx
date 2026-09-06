import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import { formatXaf } from '../../services/pricing';
import { DEMO_DRIVER } from './useDriverSession';

type Props = {
  earningsTodayXaf: number;
  ridesToday: number;
  /** Ferme le mode chauffeur et revient a l'accueil passager, avec ses mises a jour. */
  onExitToHome: () => void;
};

/**
 * Profil chauffeur — copie dediee de `ProfileScreen` (R16) : contenu propre
 * au role chauffeur (vehicule, gains, retour vers le passager), jamais une
 * prop `variant` ajoutee a l'ecran passager.
 *
 * Le bouton de retour ne revient pas au tableau de bord chauffeur : il quitte
 * le mode chauffeur et renvoie sur l'accueil passager, gains et courses du
 * jour deja pris en compte cote tableau de bord.
 */
export function DriverProfileScreen({ earningsTodayXaf, ridesToday, onExitToHome }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Profil chauffeur</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{DEMO_DRIVER.initial}</Text>
          </View>
          <View style={styles.identityBody}>
            <Text style={styles.name}>{DEMO_DRIVER.name}</Text>
            <Text style={styles.role}>Chauffeur</Text>
          </View>
        </View>

        <Text style={styles.section}>Aujourd’hui</Text>

        <Row icon="cash-outline" label="Gains" hint={formatXaf(earningsTodayXaf)} />
        <Row icon="car-sport-outline" label="Courses" hint={String(ridesToday)} />

        <Text style={styles.section}>Véhicule</Text>

        <Row icon="car-outline" label={DEMO_DRIVER.vehicleModel} hint={DEMO_DRIVER.plate} />
        <Row icon="call-outline" label="Téléphone" hint={DEMO_DRIVER.phone} />

        <Text style={styles.section}>Compte</Text>

        <Row
          icon="person-outline"
          label="Informations personnelles"
          hint="Bientôt : nom, téléphone, mot de passe"
          disabled
        />

        <Text style={styles.notice}>
          Profil de démonstration — le compte et l’authentification chauffeur
          arriveront avec le serveur.
        </Text>

        <Pressable
          style={styles.exitButton}
          onPress={onExitToHome}
          accessibilityRole="button"
          accessibilityLabel="Revenir à l’accueil passager"
        >
          <Ionicons name="arrow-back" size={18} color={colors.surface} />
          <Text style={styles.exitLabel}>Revenir au passager</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  disabled?: boolean;
};

function Row({ icon, label, hint, disabled = false }: RowProps) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint} numberOfLines={2}>
          {hint}
        </Text>
      </View>
    </View>
  );
}

const AVATAR = 56;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: typography.subtitle,
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
    ...typography.title,
    color: colors.surface,
  },
  identityBody: {
    flex: 1,
    gap: 2,
  },
  name: typography.subtitle,
  role: typography.caption,
  section: {
    ...typography.caption,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...typography.label,
    color: colors.text,
  },
  rowHint: typography.caption,
  notice: {
    ...typography.caption,
    marginTop: spacing.xl,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
  },
  exitLabel: {
    ...typography.label,
    color: colors.surface,
    fontWeight: '600',
  },
});
