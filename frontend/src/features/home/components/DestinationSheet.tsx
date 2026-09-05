import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  // Hauteur fixe (SHEET_HEIGHT) a laquelle la marge systeme s'AJOUTE : la barre
  // de navigation du telephone garde son espace au lieu de rogner le contenu.
  // Le contenu lui-meme defile dans la zone restante, sans que son design ait a
  // changer selon la taille de l'ecran.
  return (
    <View
      style={[
        styles.sheet,
        { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    // Hauteur fixe partagee par tous les sheets : voir SHEET_HEIGHT.
    height: SHEET_HEIGHT,
    backgroundColor: colors.surface,
    // La hauteur etant fixe, un contenu plus grand deborderait sous le bord de
    // l'ecran : on le decoupe au lieu de le laisser passer dessous.
    overflow: 'hidden',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    ...shadows.sheet,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
  // Grille et non simple rangee : au-dela de trois raccourcis, les tuiles
  // passent a la ligne au lieu de s'ecraser en largeur.
  shortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  shortcut: {
    // Trois par ligne : une base sous le tiers de la largeur force le retour a
    // la ligne au quatrieme, `flexGrow` rattrape l'espace restant.
    flexBasis: '30%',
    flexGrow: 1,
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
