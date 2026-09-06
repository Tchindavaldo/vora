import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../../../theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

type Props = {
  /** Active l'animation. Inactif, le composant ne rend rien. */
  active: boolean;
  /** Rayon des coins : doit correspondre a celui du bouton parent. */
  borderRadius?: number;
  /** Epaisseur du trait lumineux. */
  strokeWidth?: number;
  /** Duree d'un tour complet, en millisecondes. */
  duration?: number;
};

/**
 * Bordure lumineuse animee : un segment brillant parcourt le contour du bouton.
 *
 * Pose DANS le bouton, en `absoluteFill`, au-dessus du fond mais sous le
 * libelle. Elle remplace le spinner pendant l'attente d'un paiement : le
 * bouton reste a sa place et garde sa forme, ce qui evite le saut de mise en
 * page d'un indicateur qui apparait et disparait.
 *
 * Le trace est calcule a partir de la taille MESUREE du bouton (`onLayout`) :
 * la longueur du tour depend de sa largeur, qu'on ne connait pas a l'avance.
 */
export function AnimatedBorderGlow({
  active,
  borderRadius = 14,
  strokeWidth = 3,
  duration = 1800,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    );

    loop.start();

    return () => loop.stop();
  }, [active, duration, progress]);

  if (!active) return null;

  const { width, height } = size;

  // Perimetre approche du rectangle arrondi : les quatre cotes moins les coins
  // coupes, plus la circonference du cercle que forment ces quatre coins.
  const perimeter =
    2 * (width + height) - 8 * borderRadius + 2 * Math.PI * borderRadius;

  // Longueur du segment lumineux : un quart du tour. Le reste du pointille est
  // vide, ce qui donne un seul segment qui tourne.
  const dashLength = perimeter * 0.25;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(event) =>
        setSize({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        })
      }
    >
      {width > 0 && height > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="voraGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.surface} />
              <Stop offset="0.5" stopColor={colors.primarySoft} />
              <Stop offset="1" stopColor={colors.surface} />
            </LinearGradient>
          </Defs>

          <AnimatedRect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={width - strokeWidth}
            height={height - strokeWidth}
            rx={borderRadius}
            ry={borderRadius}
            fill="none"
            stroke="url(#voraGlow)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={[dashLength, perimeter - dashLength]}
            strokeDashoffset={progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -perimeter],
            })}
          />
        </Svg>
      )}
    </View>
  );
}
