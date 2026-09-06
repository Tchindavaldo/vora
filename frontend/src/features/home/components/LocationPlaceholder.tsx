import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { colors } from "../../../theme";

/**
 * Remplace la carte quand la geolocalisation n'est pas active (R8).
 *
 * Parti pris : sans position reelle, afficher une carte centree sur une ville
 * par defaut laisse croire que l'app sait ou l'on est. On montre a la place un
 * point de localisation seul, avec des ondes qui se propagent — la lecture
 * immediate est "on cherche votre position", pas "voici votre position".
 */
export function LocationPlaceholder() {
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Wave delay={0} />
        <Wave delay={800} />
        <Wave delay={1600} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

/**
 * Une onde : un cercle qui part du point, grandit et s'efface.
 *
 * Les trois ondes partagent la meme animation, decalee dans le temps
 * (`delay`), ce qui donne la propagation continue d'un radar.
 */
function Wave({ delay }: { delay: number }) {
  // `useRef` : la valeur animee doit survivre aux rendus, sinon l'animation
  // repart de zero a chaque fois.
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2400,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        styles.wave,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.45, 0],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ],
        },
      ]}
    />
  );
}

const WAVE = 260;
const DOT = 20;

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.mapFallback,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    width: WAVE,
    height: WAVE,
    alignItems: "center",
    justifyContent: "center",
  },
  wave: {
    position: "absolute",
    width: WAVE,
    height: WAVE,
    borderRadius: WAVE / 2,
    backgroundColor: colors.userHalo,
    borderWidth: 2,
    borderColor: colors.userDot,
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
