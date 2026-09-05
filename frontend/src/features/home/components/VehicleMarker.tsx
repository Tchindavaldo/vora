import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, shadows } from '../../../theme';

export type VehicleKind = 'moto' | 'car';

type Props = {
  kind: VehicleKind;
};

/**
 * Marqueur d'un vehicule disponible sur la carte.
 *
 * Choix de design : pastille blanche + icone sombre, PAS de silhouette de
 * vehicule vue de dessus. A 32 px, une silhouette vue de dessus se reduit a
 * une tache illisible ; une icone vue de cote dans un cercle reste
 * reconnaissable.
 *
 * Le marqueur n'est jamais pivote. Une rotation n'a de sens que si elle suit
 * un vrai cap GPS ; des vehicules orientes au hasard font desordre.
 */
export function VehicleMarker({ kind }: Props) {
  return (
    <View style={styles.bubble}>
      <Ionicons
        name={kind === 'moto' ? 'bicycle' : 'car-sport'}
        size={17}
        color={colors.text}
      />
    </View>
  );
}

const SIZE = 32;

const styles = StyleSheet.create({
  bubble: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.marker,
  },
});
