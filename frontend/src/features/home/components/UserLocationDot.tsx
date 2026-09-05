import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../../theme';

/**
 * Position de l'utilisateur : halo translucide + point plein cercle avec
 * anneau blanc.
 *
 * Forme volontairement circulaire (pas un pin en goutte) : le pin designe une
 * destination, le disque designe "vous etes ici". Les confondre brouille la
 * lecture de la carte.
 */
export function UserLocationDot() {
  return (
    <View style={styles.halo}>
      <View style={styles.dot} />
    </View>
  );
}

const HALO = 44;
const DOT = 16;

const styles = StyleSheet.create({
  halo: {
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: colors.userHalo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.userDot,
    borderWidth: 3,
    borderColor: colors.surface,
  },
});
