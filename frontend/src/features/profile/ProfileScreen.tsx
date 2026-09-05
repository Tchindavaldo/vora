import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import { SUPPORT_PHONE } from '../../services/safety';
import { useEmergencyContacts } from './useEmergencyContacts';

type Props = {
  userName: string;
  userInitial: string;
  onOpenEmergencyContacts: () => void;
  onOpenHistory: () => void;
  onClose: () => void;
};

/**
 * Profil et parametres du passager.
 *
 * Ecran de reglages classique — en-tete d'identite puis sections. La section
 * SECURITE est celle qui compte pour le brief §10 : c'est ici que le passager
 * definit les contacts que le bouton SOS alertera pendant la course. Sans cet
 * ecran, le SOS n'aurait que des contacts de demonstration.
 *
 * Les entrees non encore construites sont affichees GRISEES plutot que
 * masquees : elles disent ou va le produit sans faire croire qu'elles marchent
 * (brief §23).
 */
export function ProfileScreen({
  userName,
  userInitial,
  onOpenEmergencyContacts,
  onOpenHistory,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { items } = useEmergencyContacts();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour à l’accueil"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>Profil</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <View style={styles.identityBody}>
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.role}>Passager</Text>
          </View>
        </View>

        <Text style={styles.section}>Sécurité</Text>

        <Row
          icon="people-outline"
          label="Contacts d’urgence"
          hint={
            items.length === 0
              ? 'Aucun contact — le SOS n’aurait personne à prévenir'
              : `${items.length} contact${items.length > 1 ? 's' : ''} prévenu${
                  items.length > 1 ? 's' : ''
                } en cas d’alerte`
          }
          warn={items.length === 0}
          onPress={onOpenEmergencyContacts}
        />

        <Row
          icon="headset-outline"
          label="Assistance VORA"
          hint={SUPPORT_PHONE}
          disabled
        />

        <Row
          icon="shield-checkmark-outline"
          label="Partage automatique de course"
          hint="Bientôt : prévenir un proche à chaque départ"
          disabled
        />

        <Text style={styles.section}>Mes courses</Text>

        <Row
          icon="receipt-outline"
          label="Historique et reçus"
          hint="Courses passées, montants et monnaie rendue"
          onPress={onOpenHistory}
        />

        <Row
          icon="wallet-outline"
          label="Portefeuille"
          hint="Bientôt : solde et recharge"
          disabled
        />

        <Text style={styles.section}>Compte</Text>

        <Row
          icon="person-outline"
          label="Informations personnelles"
          hint="Bientôt : nom, téléphone, mot de passe"
          disabled
        />

        <Row
          icon="lock-closed-outline"
          label="Confidentialité"
          hint="Bientôt : données partagées et suppression du compte"
          disabled
        />

        <Text style={styles.notice}>
          Profil de démonstration — le compte et l’authentification arriveront
          avec le serveur.
        </Text>
      </ScrollView>
    </View>
  );
}

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress?: () => void;
  /** Entree annoncee mais pas encore construite : grisee, non cliquable. */
  disabled?: boolean;
  /** Attire l'oeil sur un reglage de securite manquant. */
  warn?: boolean;
};

function Row({ icon, label, hint, onPress, disabled = false, warn = false }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.row, disabled && styles.rowDisabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={20}
        color={warn ? colors.danger : colors.text}
      />

      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowHint, warn && styles.rowHintWarn]} numberOfLines={2}>
          {hint}
        </Text>
      </View>

      {!disabled && (
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      )}
    </Pressable>
  );
}

const AVATAR = 56;

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
  title: {
    ...typography.subtitle,
    flex: 1,
  },
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
  rowHintWarn: {
    color: colors.danger,
  },
  notice: {
    ...typography.caption,
    marginTop: spacing.xl,
  },
});
