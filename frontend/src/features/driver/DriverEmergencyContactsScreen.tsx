import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import {
  useDriverEmergencyContacts,
  validateDriverContact,
  type DriverContactDraft,
} from './useDriverEmergencyContacts';

type Props = {
  onClose: () => void;
};

const EMPTY_DRAFT: DriverContactDraft = { name: '', relation: '', phone: '' };

/**
 * Contacts prevenus quand le CHAUFFEUR declenche son alerte (R10, brief §10.3).
 *
 * Copie dediee de `EmergencyContactsScreen` (feature `profile`, cote passager)
 * — R16. Ce sont EUX que le bouton SOS chauffeur alerte : sans contact
 * enregistre, l'alerte n'a personne a joindre. L'ecran le dit plutot que de
 * laisser le chauffeur le decouvrir en urgence.
 */
export function DriverEmergencyContactsScreen({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { items, add, remove } = useDriverEmergencyContacts();

  const [draft, setDraft] = useState<DriverContactDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const message = validateDriverContact(draft);
    if (message !== null) {
      setError(message);
      return;
    }

    add(draft);
    setDraft(EMPTY_DRAFT);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour au profil"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>Contacts d’urgence</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Ces personnes reçoivent votre position et la course en cours quand vous
          déclenchez une alerte, y compris entre deux courses.
        </Text>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.emptyText}>
              Aucun contact enregistré : le bouton SOS n’aurait personne à
              prévenir.
            </Text>
          </View>
        ) : (
          items.map((contact) => (
            <View key={contact.id} style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {contact.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {contact.relation} · {contact.phone}
                </Text>
              </View>

              <Pressable
                onPress={() => remove(contact.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${contact.name}`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}

        <Text style={styles.section}>Ajouter un contact</Text>

        <TextInput
          style={styles.input}
          value={draft.name}
          onChangeText={(name) => setDraft({ ...draft, name })}
          placeholder="Nom"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Nom du contact"
        />

        <TextInput
          style={styles.input}
          value={draft.relation}
          onChangeText={(relation) => setDraft({ ...draft, relation })}
          placeholder="Lien (épouse, frère…)"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Lien avec le contact"
        />

        <TextInput
          style={styles.input}
          value={draft.phone}
          onChangeText={(phone) => setDraft({ ...draft, phone })}
          placeholder="+237 6 90 00 00 21"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          accessibilityLabel="Numéro du contact"
        />

        {error !== null && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={handleAdd}
          style={styles.add}
          accessibilityRole="button"
          accessibilityLabel="Ajouter ce contact"
        >
          <Text style={styles.addLabel}>Ajouter</Text>
        </Pressable>

        <Text style={styles.notice}>
          Contacts conservés le temps de la session — ils seront rattachés à
          votre compte chauffeur quand le serveur existera.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
  intro: {
    ...typography.label,
    marginBottom: spacing.lg,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  emptyText: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  section: {
    ...typography.caption,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.label,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.label,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  add: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  addLabel: {
    ...typography.subtitle,
    color: colors.surface,
  },
  notice: {
    ...typography.caption,
    marginTop: spacing.lg,
  },
});
