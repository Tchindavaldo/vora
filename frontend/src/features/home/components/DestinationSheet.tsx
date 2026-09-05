import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing, typography } from '../../../theme';

export type Shortcut = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  shortcuts: Shortcut[];
  onSearchPress: () => void;
  onShortcutPress: (shortcut: Shortcut) => void;
};

/**
 * Bottom sheet d'accueil, pose sur la carte.
 *
 * IMPORTANT : le champ de recherche n'est PAS un TextInput. C'est un bouton
 * deguise qui pousse vers l'ecran de recherche de destination. Ouvrir le
 * clavier ici ferait remonter le sheet et casserait la transition, sans
 * aucun benefice : la saisie a besoin de la liste de suggestions plein
 * ecran, pas d'un champ coince sous le clavier.
 */
export function DestinationSheet({
  shortcuts,
  onSearchPress,
  onShortcutPress,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.handle} />

      <Text style={styles.title}>Où allez-vous ?</Text>

      <Pressable
        onPress={onSearchPress}
        style={styles.searchField}
        accessibilityRole="search"
        accessibilityLabel="Rechercher une destination"
      >
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <Text style={styles.searchPlaceholder}>
          Adresse, quartier, point de repère
        </Text>
      </Pressable>

      <View style={styles.shortcutRow}>
        {shortcuts.map((shortcut) => (
          <Pressable
            key={shortcut.id}
            onPress={() => onShortcutPress(shortcut)}
            style={styles.shortcut}
            accessibilityRole="button"
            accessibilityLabel={`Aller à ${shortcut.label}`}
          >
            <View style={styles.shortcutIcon}>
              <Ionicons name={shortcut.icon} size={18} color={colors.text} />
            </View>
            <Text style={styles.shortcutLabel}>{shortcut.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    ...shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.lg,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchPlaceholder: {
    ...typography.body,
    color: colors.textFaint,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  shortcutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    ...typography.label,
    color: colors.text,
  },
});
