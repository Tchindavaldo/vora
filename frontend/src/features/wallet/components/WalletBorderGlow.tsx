// Copie dediee au portefeuille de `payment/components/AnimatedBorderGlow` (R16).
// Difference : le segment lumineux est multicolore au lieu d'un degrade unique.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Teintes du segment tournant. Le degrade est fixe DANS le repere du bouton :
// il colore donc la bordure par position, pas par avancee du segment. Toutes
// les teintes sont a pleine opacite, sinon les extremites (gauche et droite)
// paraissent eteintes quand le segment y passe.
const GLOW_STOPS = [
  { offset: '0', color: '#EF4444' },
  { offset: '0.2', color: '#F59E0B' },
  { offset: '0.4', color: '#22C55E' },
  { offset: '0.6', color: '#06B6D4' },
  { offset: '0.8', color: '#2563EB' },
  { offset: '1', color: '#A855F7' },
];

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
 * Bordure lumineuse multicolore : un segment arc-en-ciel parcourt le contour
 * du bouton de recharge pendant l'attente du verdict Mobile Money.
 *
 * Le trace est calcule a partir de la taille MESUREE du bouton (`onLayout`) :
 * la longueur du tour depend de sa largeur, qu'on ne connait pas a l'avance.
 */
export function WalletBorderGlow({
  active,
  borderRadius = 14,
  strokeWidth = 4,
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

  // Longueur du segment lumineux : un tiers du tour, pour laisser la place aux
  // six teintes sans les ecraser. Le reste du pointille est vide.
  const dashLength = perimeter * 0.33;

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
            <LinearGradient id="voraWalletGlow" x1="0" y1="0" x2="1" y2="0">
              {GLOW_STOPS.map((stop) => (
                <Stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                />
              ))}
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
            stroke="url(#voraWalletGlow)"
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
