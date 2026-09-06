import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

import { colors } from '../../theme';
import { useDriverMapBearing } from './DriverMapCanvas';

/**
 * Vehicule DU chauffeur sur sa propre carte (R16).
 *
 * Copie dediee de `VehicleMarker` (feature `home`, cote passager), avec une
 * difference voulue : un halo ROUGE sous la voiture, la ou le passager voit
 * un halo bleu sous son point de position. Le chauffeur doit reperer sa
 * propre position d'un coup d'oeil et ne jamais la confondre avec celle de
 * son client ; deux couleurs distinctes suffisent, sans legende.
 */

const VEHICLE_IMAGES = {
  moto: require('../../../assets/vehicles/moto.png'),
  eco: require('../../../assets/vehicles/car-eco.png'),
  comfort: require('../../../assets/vehicles/car-comfort.png'),
};

export type DriverVehicleKind = keyof typeof VEHICLE_IMAGES;

const VEHICLE_SIZES: Record<DriverVehicleKind, number> = {
  moto: 32,
  eco: 38,
  comfort: 38,
};

/**
 * Diametre du halo par categorie.
 *
 * Une voiture occupe plus de place qu'une moto : au meme diametre, son halo
 * la serre de trop pres et ne se lit plus comme un cercle sous elle. La moto
 * garde le diametre d'origine.
 */
const HALO_SIZES: Record<DriverVehicleKind, number> = {
  moto: 46,
  eco: 54,
  comfort: 54,
};

/**
 * Demi-periode du battement du halo. 1100 ms : assez lent pour etre percu
 * comme une respiration et non comme un clignotement, qui fatiguerait sur un
 * ecran regarde en continu pendant une course.
 */
const PULSE_DURATION_MS = 1100;

type Props = {
  kind: DriverVehicleKind;
  /** Cap GEOGRAPHIQUE en degres (0 = nord, 90 = est). */
  bearing?: number;
};

export function DriverVehicleMarker({ kind, bearing = 0 }: Props) {
  const size = VEHICLE_SIZES[kind];
  const halo = HALO_SIZES[kind];

  // Le contenu d'un marqueur est pose a plat sur l'ecran : il ne tourne pas
  // avec la carte. Pour rester parallele a sa rue quand la vue pivote, le
  // vehicule compense le cap de la camera. Le halo, lui, est circulaire : il
  // n'a pas d'orientation a corriger.
  const cameraBearing = useDriverMapBearing();

  // Halo qui respire : le rayon enfle puis retombe en boucle, l'opacite
  // suivant l'inverse. Signale une position VIVE (mise a jour en continu)
  // plutot qu'un marqueur pose une fois pour toutes.
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
      <Animated.View
        style={[
          styles.halo,
          { width: halo, height: halo, borderRadius: halo / 2 },
          { transform: [{ scale }], opacity },
        ]}
        pointerEvents="none"
      />
      <View
        style={{
          width: size,
          height: size,
          transform: [{ rotate: `${bearing - cameraBearing}deg` }],
        }}
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

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pose en absolu DERRIERE le vehicule : il pulse sans jamais deplacer la
  // voiture, qui reste centree sur sa coordonnee.
  halo: {
    position: 'absolute',
    backgroundColor: colors.driverHalo,
  },
});
