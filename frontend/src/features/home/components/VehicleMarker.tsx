import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

import { colors } from '../../../theme';
import { useMapBearing } from '../../map/MapCanvas';

/**
 * Categories de vehicules, alignees sur les paliers de tarif proposes a
 * l'estimation : moto-taxi, berline economique, berline confort.
 */
export type VehicleKind = 'moto' | 'eco' | 'comfort';

/**
 * Illustrations, fournies en 1x/2x/3x : React Native choisit la densite selon
 * l'ecran, l'image reste nette sans embarquer un fichier lourd.
 *
 * Eco et Confort partagent la meme silhouette et ne different que par la
 * teinte. A 38 px, une difference de carrosserie (berline contre SUV) serait
 * invisible ; un contraste clair/sombre se lit immediatement.
 */
const VEHICLE_IMAGES: Record<VehicleKind, number> = {
  moto: require('../../../../assets/vehicles/moto.png'),
  eco: require('../../../../assets/vehicles/car-eco.png'),
  comfort: require('../../../../assets/vehicles/car-comfort.png'),
};

/**
 * Taille d'affichage par categorie.
 *
 * La moto est plus longue et bien plus etroite qu'une voiture : a taille de
 * cadre egale, elle paraitrait disproportionnee. On la reduit legerement.
 */
const VEHICLE_SIZES: Record<VehicleKind, number> = {
  moto: 32,
  eco: 38,
  comfort: 38,
};

type Props = {
  kind: VehicleKind;
  /**
   * Cap GEOGRAPHIQUE en degres (0 = nord, 90 = est). Sert a aligner le
   * vehicule sur l'axe de sa rue.
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
 * La rotation s'applique autour du centre du cadre, ce qui suppose un vehicule
 * centre dans son image.
 */
export function VehicleMarker({ kind, bearing = 0 }: Props) {
  const size = VEHICLE_SIZES[kind];
  const halo = HALO_SIZES[kind];

  // Le contenu d'un marqueur est pose a plat sur l'ecran : il ne tourne pas
  // avec la carte. Pour rester parallele a sa rue quand l'utilisateur fait
  // pivoter la vue, le vehicule doit compenser le cap de la camera.
  const cameraBearing = useMapBearing();

  // Halo qui respire sous le vehicule : le rayon enfle puis retombe en boucle,
  // l'opacite suivant l'inverse. Signale des voitures VIVES, dont la position
  // bouge, et non des icones posees sur la carte.
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PULSE_DURATION_MS,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] });

  return (
    <View style={[styles.frame, { width: halo, height: halo }]}>
      {/*
        Pose en absolu DERRIERE le vehicule : il pulse sans jamais deplacer la
        voiture, qui reste centree sur sa coordonnee.
      */}
      <Animated.View
        style={[
          styles.halo,
          { width: halo, height: halo, borderRadius: halo / 2 },
          { transform: [{ scale }], opacity },
        ]}
        pointerEvents="none"
      />

      <View
        style={[
          styles.marker,
          {
            width: size,
            height: size,
            transform: [{ rotate: `${bearing - cameraBearing}deg` }],
          },
        ]}
      >
        <Image
          source={VEHICLE_IMAGES[kind]}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

/**
 * Diametre du halo par categorie.
 *
 * Une voiture occupe plus de place qu'une moto : au meme diametre, son halo
 * la serre de trop pres et ne se lit plus comme un cercle sous elle. La moto
 * garde le diametre d'origine.
 */
const HALO_SIZES: Record<VehicleKind, number> = {
  moto: 46,
  eco: 50,
  comfort: 50,
};

/**
 * Demi-periode du battement du halo. 1100 ms : percu comme une respiration et
 * non comme un clignotement, qui fatiguerait sur une carte regardee en continu.
 */
const PULSE_DURATION_MS = 1100;

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: colors.vehicleHalo,
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
