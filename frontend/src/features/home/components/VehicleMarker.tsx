import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

/**
 * Categories de vehicules, alignees sur les paliers de tarif proposes a
 * l'estimation : moto-taxi, berline economique, berline confort.
 */
export type VehicleKind = 'moto' | 'eco' | 'comfort';

/**
 * Illustrations des berlines, fournies en 1x/2x/3x : React Native choisit la
 * densite selon l'ecran, l'image reste nette sans embarquer un fichier lourd.
 *
 * Eco et Confort partagent la meme silhouette et ne different que par la
 * teinte. A 38 px, une difference de carrosserie (berline contre SUV) serait
 * invisible ; un contraste clair/sombre se lit immediatement.
 */
const CAR_IMAGES: Record<'eco' | 'comfort', number> = {
  eco: require('../../../../assets/vehicles/car-eco.png'),
  comfort: require('../../../../assets/vehicles/car-comfort.png'),
};

type Props = {
  kind: VehicleKind;
  /**
   * Cap en degres (0 = le vehicule pointe vers le haut de l'ecran, 90 = vers
   * la droite). Sert a aligner le vehicule sur l'axe de sa rue.
   */
  bearing?: number;
};

/**
 * Vehicule vu de DESSUS, oriente selon son cap.
 *
 * Vu de dessus et non de cote : c'est la seule projection coherente avec une
 * carte, et la seule qui rende l'orientation lisible. Une icone vue de cote ne
 * peut pas "suivre" une rue.
 *
 * La voiture est une illustration (PNG en trois densites), la moto reste
 * dessinee en SVG faute d'asset equivalent. Les deux tournent autour de leur
 * centre, ce qui suppose un vehicule centre dans son cadre.
 */
export function VehicleMarker({ kind, bearing = 0 }: Props) {
  // Les voitures sont des illustrations fournies ; la moto reste dessinee en
  // SVG tant qu'aucun asset equivalent n'existe.
  if (kind !== 'moto') {
    return (
      <View style={[styles.marker, { transform: [{ rotate: `${bearing}deg` }] }]}>
        <Image
          source={CAR_IMAGES[kind]}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 40 40">
      <G rotation={bearing} origin="20, 20">
        <MotoShape />
      </G>
    </Svg>
  );
}

/**
 * Moto vue de dessus — la categorie la plus utilisee au Cameroun.
 * Plus etroite que la voiture, pour que les deux se distinguent d'un coup
 * d'oeil sans avoir a les comparer.
 */
function MotoShape() {
  return (
    <G>
      <Ellipse cx={20} cy={20.8} rx={5.4} ry={11.4} fill="rgba(16, 24, 40, 0.2)" />

      {/* Roues. */}
      <Rect x={18.6} y={7.4} width={2.8} height={6.4} rx={1.4} fill="#2B3442" />
      <Rect x={18.6} y={26.4} width={2.8} height={6.6} rx={1.4} fill="#2B3442" />

      {/* Chassis. */}
      <Path
        d="M20 9.4 C17.6 13, 17.2 16.4, 17.4 20 C17.6 23.6, 18.2 26.6, 20 29.6 C21.8 26.6, 22.4 23.6, 22.6 20 C22.8 16.4, 22.4 13, 20 9.4 Z"
        fill="#F7F8F9"
        stroke="#C9CDD3"
        strokeWidth={0.9}
      />

      {/* Guidon. */}
      <Rect x={13.8} y={13.2} width={12.4} height={2.1} rx={1.05} fill="#2B3442" />

      {/* Selle. */}
      <Rect x={17.6} y={19.4} width={4.8} height={7.2} rx={2.2} fill="#2B3442" />

      {/* Phare avant. */}
      <Rect x={18.4} y={10.4} width={3.2} height={1.8} rx={0.9} fill="#FFF4D6" />

      {/* Feu arriere. */}
      <Rect x={18.6} y={28.4} width={2.8} height={1.6} rx={0.8} fill="#E5484D" />
    </G>
  );
}

const SIZE = 38;

const styles = StyleSheet.create({
  marker: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SIZE,
    height: SIZE,
  },
});
