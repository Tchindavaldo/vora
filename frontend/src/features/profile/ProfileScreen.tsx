import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import { SafeBottomArea } from '../../components/SafeBottomArea';
import { COUNTRY_CODE, formatPhone } from '../../services/session';
import { useAuth } from '../../contexts/AuthContext';
import { useEmergencyContacts } from './useEmergencyContacts';

type Props = {
  userName: string;
  userInitial: string;
  onOpenEmergencyContacts: () => void;
  /** Ouvre l'assistance : contact du support, FAQ, litige (brief §14). */
  onOpenSupport: () => void;
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
  onOpenSupport,
  onOpenHistory,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { items } = useEmergencyContacts();
  // La deconnexion et le numero connecte viennent du contexte (R6) : ils
  // n'ont pas a traverser l'accueil pour arriver jusqu'ici.
  const { session, signOut } = useAuth();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        {/* IDENTITE DANS L'EN-TETE, et non en tete de liste : elle ne defile
            pas. Le passager qui descend jusqu'a la deconnexion voit toujours
            de quel compte il parle. Le titre "Profil" disparait : le nom et le
            role le disent deja. */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <View style={styles.identityBody}>
            <Text style={styles.name} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.role} numberOfLines={1}>
              {session != null
                ? `Passager · ${COUNTRY_CODE} ${formatPhone(session.phone)}`
                : 'Passager'}
            </Text>
          </View>
        </View>

        {/* Retour a DROITE : le pouce l'atteint sans changer de main sur un
            grand telephone, et il ne se confond plus avec l'avatar. */}
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour à l’accueil"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <SafeBottomArea>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionFirst}>Sécurité</Text>

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
            hint="Nous contacter, questions fréquentes, litige sur une course"
            onPress={onOpenSupport}
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

          <Row
            icon="log-out-outline"
            label="Changer de compte"
            hint="Déconnexion, puis retour à l’écran de connexion"
            onPress={signOut}
          />

          <Text style={styles.notice}>
            Profil de démonstration — les informations affichées arriveront avec
            le serveur.
          </Text>
        </ScrollView>
      </SafeBottomArea>
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
  // La premiere section suit directement l'en-tete : pas de marge haute, sinon
  // l'ecran s'ouvre sur un vide.
  sectionFirst: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
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
