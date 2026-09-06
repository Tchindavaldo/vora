import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, LIST_BOTTOM_SAFE_GAP } from '../theme';

type Props = {
  /**
   * Contenu de l'ecran, generalement une liste ou un `ScrollView`. Il occupe
   * toute la hauteur RESTANTE, une fois la zone basse reservee.
   */
  children: React.ReactNode;
};

/**
 * Reserve la zone basse de l'ecran (encoche, barre de gestes Android) EN
 * DEHORS du contenu qui defile.
 *
 * Meme parti pris que les bottom sheets, qui posent `paddingBottom:
 * insets.bottom` sur leur conteneur et non sur leur `contentContainerStyle` :
 * la bande basse appartient au systeme, le contenu s'arrete au-dessus et y est
 * COUPE au defilement au lieu de passer dessous. Une marge posee dans le
 * contenu, elle, defile avec lui : au milieu de la liste la derniere ligne
 * visible se retrouvait de nouveau sous la barre de gestes.
 *
 * `LIST_BOTTOM_SAFE_GAP` sert de plancher : sur les Android a navigation
 * gestuelle `insets.bottom` vaut souvent 0 alors que la barre est bien la.
 *
 * Composant partage et non duplique par ecran (R16) : il n'a pas de rendu
 * propre a un ecran — c'est une mesure, pas une interface.
 */
export function SafeBottomArea({ children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { paddingBottom: Math.max(insets.bottom, LIST_BOTTOM_SAFE_GAP) },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // La bande reservee prend la couleur de l'ecran : sans cela, elle laisserait
    // voir le fond de la fenetre sous la liste.
    backgroundColor: colors.surface,
  },
});
