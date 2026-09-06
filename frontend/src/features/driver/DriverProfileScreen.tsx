import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  LIST_BOTTOM_SAFE_GAP,
  radius,
  spacing,
  typography,
} from '../../theme';
import { formatXaf } from '../../services/pricing';
import { useAuth } from '../../contexts/AuthContext';
import { DEMO_DRIVER } from './useDriverSession';
import { useDriverEmergencyContacts } from './useDriverEmergencyContacts';

type Props = {
  earningsTodayXaf: number;
  ridesToday: number;
  /** Revient au tableau de bord chauffeur, sans quitter le mode chauffeur. */
  onClose: () => void;
  /** Ouvre le detail des revenus du jour. */
  onOpenEarnings: () => void;
  /** Ouvre l'historique des courses passees (brief §6, §14). */
  onOpenRideHistory: () => void;
  /** Ouvre la gestion des contacts d'urgence du chauffeur (R10). */
  onOpenEmergencyContacts: () => void;
};

/**
 * Profil chauffeur — copie dediee de `ProfileScreen` (R16) : contenu propre
 * au role chauffeur (vehicule, gains, retour vers le passager), jamais une
 * prop `variant` ajoutee a l'ecran passager.
 *
 * Deux sorties distinctes, a ne pas confondre : la fleche de l'en-tete revient
 * au tableau de bord chauffeur, le bouton du bas DECONNECTE et renvoie a
 * l'ecran de connexion. Sans la premiere, ouvrir son profil obligerait a se
 * deconnecter pour revenir a sa carte.
 */
export function DriverProfileScreen({
  earningsTodayXaf,
  ridesToday,
  onClose,
  onOpenEarnings,
  onOpenRideHistory,
  onOpenEmergencyContacts,
}: Props) {
  const insets = useSafeAreaInsets();
  // Le compte suit les ajouts et suppressions faits dans l'ecran dedie.
  const { items: emergencyContacts } = useDriverEmergencyContacts();
  const contactCount = emergencyContacts.length;
  // Deconnexion lue dans le contexte (R6) : elle ne traverse plus DriverApp.
  const { signOut } = useAuth();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour au tableau de bord"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        {/* IDENTITE DANS L'EN-TETE, et non en tete de liste : elle ne defile
            pas. Le chauffeur qui descend jusqu'a la deconnexion voit toujours
            de quel compte il parle — c'est la seule information de l'ecran qui
            doit rester visible en permanence. Le titre "Profil chauffeur"
            disparait : le nom et le role le disent deja. */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{DEMO_DRIVER.initial}</Text>
          </View>
          <View style={styles.identityBody}>
            <Text style={styles.name} numberOfLines={1}>
              {DEMO_DRIVER.name}
            </Text>
            <Text style={styles.role} numberOfLines={1}>
              Chauffeur · {DEMO_DRIVER.plate}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, LIST_BOTTOM_SAFE_GAP) + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionFirst}>Aujourd’hui</Text>

        {/* Second acces aux revenus, apres la card du tableau de bord : le
            chauffeur qui vient consulter son profil cherche le meme detail. */}
        <Row
          icon="cash-outline"
          label="Gains"
          hint={formatXaf(earningsTodayXaf)}
          onPress={onOpenEarnings}
        />
        <Row icon="car-sport-outline" label="Courses" hint={String(ridesToday)} />

        <Text style={styles.section}>Activité</Text>

        {/* L'historique vient SOUS les chiffres du jour : le chauffeur lit
            d'abord sa journee, puis remonte le temps s'il veut comparer. */}
        <Row
          icon="time-outline"
          label="Historique des courses"
          hint="Vos courses des 7 et 30 derniers jours"
          onPress={onOpenRideHistory}
        />

        <Text style={styles.section}>Véhicule</Text>

        <Row icon="car-outline" label={DEMO_DRIVER.vehicleModel} hint={DEMO_DRIVER.plate} />
        <Row icon="call-outline" label="Téléphone" hint={DEMO_DRIVER.phone} />

        <Text style={styles.section}>Sécurité</Text>

        <Row
          icon="shield-checkmark-outline"
          label="Contacts d’urgence"
          hint={
            contactCount === 0
              ? 'Aucun — le SOS n’aurait personne à prévenir'
              : `${contactCount} contact${contactCount > 1 ? 's' : ''}`
          }
          onPress={onOpenEmergencyContacts}
        />

        <Text style={styles.section}>Compte</Text>

        <Row
          icon="person-outline"
          label="Informations personnelles"
          hint="Bientôt : nom, téléphone, mot de passe"
          disabled
        />

        <Text style={styles.notice}>
          Profil de démonstration — les informations affichées arriveront avec
          le serveur.
        </Text>

        <Pressable
          style={styles.exitButton}
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter et changer de compte"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.surface} />
          <Text style={styles.exitLabel}>Changer de compte</Text>
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
  /** Rend la ligne cliquable et affiche le chevron. Absent = ligne de lecture. */
  onPress?: () => void;
};

function Row({ icon, label, hint, disabled = false, onPress }: RowProps) {
  const body = (
    <>
      <Ionicons name={icon} size={20} color={colors.text} />
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint} numberOfLines={2}>
          {hint}
        </Text>
      </View>
      {onPress !== undefined && (
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      )}
    </>
  );

  if (onPress === undefined) {
    return <View style={[styles.row, disabled && styles.rowDisabled]}>{body}</View>;
  }

  return (
    <Pressable
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {body}
    </Pressable>
  );
}

/** Avatar d'en-tete : plus petit qu'en tete de liste, la barre ne doit pas
 *  manger la hauteur utile de l'ecran. */
const AVATAR = 40;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  identity: {
    flex: 1,
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
    ...typography.subtitle,
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
  // La premiere section suit directement l'en-tete : pas de marge haute, sinon
  // l'ecran s'ouvre sur un vide.
  sectionFirst: {
    ...typography.caption,
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
