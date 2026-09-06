import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, SHEET_HEIGHT, spacing, typography } from '../../theme';
import type { DriverEmergencyContact } from '../../services/driverSafety';

type Props = {
  contacts: DriverEmergencyContact[];
  step: 'idle' | 'sending' | 'sent';
  error: string | null;
  onTriggerAlert: () => void;
  onCallContact: (phone: string) => void;
  onCallSupport: () => void;
  onClose: () => void;
};

/**
 * Panneau d'urgence du CHAUFFEUR (R10, brief §10.3).
 *
 * Copie dediee de `EmergencySheet` (feature `ride`, cote passager) — R16.
 * Memes deux voies volontairement distinctes : l'alerte previent les contacts
 * en un geste, l'appel direct passe par le telephone et ne depend d'aucun
 * serveur (R8). L'assistance appelee ici est la file chauffeur.
 */
export function DriverEmergencySheet({
  contacts,
  step,
  error,
  onTriggerAlert,
  onCallContact,
  onCallSupport,
  onClose,
}: Props) {
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
          <Text style={styles.title}>Urgence</Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fermer l’urgence"
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {step === 'sent' ? (
          <View style={styles.sentBox}>
            <Ionicons name="checkmark-circle" size={20} color={colors.online} />
            <Text style={styles.sentText}>
              Vos contacts ont été prévenus avec votre position et la course en
              cours.
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={onTriggerAlert}
            disabled={step === 'sending' || contacts.length === 0}
            style={[
              styles.alert,
              (step === 'sending' || contacts.length === 0) && styles.alertDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Prévenir mes contacts d’urgence"
          >
            {step === 'sending' ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Ionicons name="warning" size={20} color={colors.surface} />
                <Text style={styles.alertLabel}>Prévenir mes contacts</Text>
              </>
            )}
          </Pressable>
        )}

        {error !== null && <Text style={styles.error}>{error}</Text>}

        {/* L'appel direct reste toujours accessible : c'est la voie qui ne
            depend d'aucun serveur. */}
        <Text style={styles.section}>Appeler</Text>

        {/* Sans contact enregistre, l'alerte n'a personne a joindre : le dire
            ici plutot que de laisser un vide inexplique (R8). */}
        {contacts.length === 0 && (
          <Text style={styles.rowMeta}>
            Aucun contact enregistré. Ajoutez-en depuis votre profil.
          </Text>
        )}

        {contacts.map((contact) => (
          <Pressable
            key={contact.id}
            onPress={() => onCallContact(contact.phone)}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`Appeler ${contact.name}`}
          >
            <Ionicons name="call-outline" size={18} color={colors.text} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {contact.name}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {contact.relation} · {contact.phone}
              </Text>
            </View>
          </Pressable>
        ))}

        <Pressable
          onPress={onCallSupport}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel="Appeler l’assistance chauffeur VORA"
        >
          <Ionicons name="headset-outline" size={18} color={colors.text} />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Assistance chauffeur VORA</Text>
            <Text style={styles.rowMeta}>Disponible 24 h/24</Text>
          </View>
        </Pressable>

        {/* Ne jamais laisser croire qu'un secours a ete prevenu (R13, §23). */}
        <Text style={styles.simulated}>
          Alerte simulée — aucun secours n’est réellement contacté.
        </Text>
      </ScrollView>
    </View>
  );
}

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
  title: {
    ...typography.subtitle,
    flex: 1,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
  },
  alertDisabled: {
    opacity: 0.6,
  },
  alertLabel: {
    ...typography.subtitle,
    color: colors.surface,
  },
  sentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  sentText: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  error: {
    ...typography.label,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  section: {
    ...typography.caption,
    marginTop: spacing.lg,
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
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...typography.label,
    color: colors.text,
  },
  rowMeta: typography.caption,
  simulated: {
    ...typography.caption,
    marginTop: spacing.md,
  },
});
