import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { colors, spacing } from '../../theme';
import { restoreSession } from '../../services/session';

/**
 * Splash de demarrage.
 *
 * Il ne sert PAS a faire joli : il couvre la relecture de la session sur le
 * disque et le chargement des polices, pour que l'utilisateur ne voie jamais
 * un ecran a moitie rendu ni un passage eclair par la connexion alors qu'il
 * est deja identifie.
 */
const SPLASH_DURATION_MS = 2600;

/** Le nom de marque, decoupe en lettres pour les animer une par une. */
const BRAND_LETTERS = ['V', 'O', 'R', 'A'];

/** Decalage entre deux lettres : assez court pour rester sous la duree du splash. */
const LETTER_STAGGER_MS = 210;

/** Duree de l'entree d'une lettre. */
const LETTER_DURATION_MS = 700;

type Props = {
  /** Appele une fois la session relue ET le delai ecoule. */
  onDone: () => void;
};

export function SplashScreen({ onDone }: Props) {
  // Une valeur par lettre : chacune pilote a la fois son opacite et sa
  // translation, ce qui evite d'entretenir deux tableaux paralleles.
  const letters = useRef(
    BRAND_LETTERS.map(() => new Animated.Value(0)),
  ).current;

  // La tagline entre apres la derniere lettre, pour que l'oeil suive un seul
  // mouvement de gauche a droite puis descende.
  const tagline = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const letterAnimations = letters.map((value) =>
      Animated.timing(value, {
        toValue: 1,
        duration: LETTER_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    Animated.sequence([
      Animated.stagger(LETTER_STAGGER_MS, letterAnimations),
      Animated.timing(tagline, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // On attend les DEUX : la relecture de session et la duree minimale. Sortir
    // des que le disque a repondu ferait clignoter le splash sur un appareil
    // rapide ; sortir au seul minuteur risquerait d'aiguiller avant de savoir
    // s'il y a une session.
    let cancelled = false;
    const minimumDelay = new Promise((resolve) =>
      setTimeout(resolve, SPLASH_DURATION_MS),
    );

    Promise.all([restoreSession(), minimumDelay]).then(() => {
      if (!cancelled) onDone();
    });

    return () => {
      cancelled = true;
    };
  }, [onDone, letters, tagline]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.brand}>
        <View style={styles.logoRow}>
          {BRAND_LETTERS.map((letter, index) => (
            <AnimatedLetter
              key={`${letter}-${index}`}
              letter={letter}
              progress={letters[index]}
            />
          ))}
        </View>
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: tagline,
              transform: [
                {
                  translateY: tagline.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Votre course, sans détour
        </Animated.Text>
      </View>
    </View>
  );
}

/**
 * Une lettre du logo. Elle monte legerement et grandit en apparaissant : le
 * mouvement se lit comme une frappe, ce qui donne du rythme la ou un simple
 * fondu resterait plat.
 */
function AnimatedLetter({
  letter,
  progress,
}: {
  letter: string;
  progress: Animated.Value;
}) {
  const style = useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 0],
          }),
        },
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
          }),
        },
      ],
    }),
    [progress],
  );

  return <Animated.Text style={[styles.logo, style]}>{letter}</Animated.Text>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 6,
    color: colors.surface,
  },
  tagline: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
