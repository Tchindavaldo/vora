import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { colors, spacing } from '../../theme';

/**
 * Splash de demarrage.
 *
 * Il ne sert PAS a faire joli : il couvre le temps de verification de la
 * session et du chargement des polices, pour que l'utilisateur ne voie jamais
 * un ecran a moitie rendu. D'ou sa duree plafonnee : passe ce delai, l'app
 * continue meme si le reste n'est pas pret.
 */
const SPLASH_DURATION_MS = 1500;

type Props = {
  /** Appele une fois le delai ecoule : l'appelant decide de la suite. */
  onDone: () => void;
};

export function SplashScreen({ onDone }: Props) {
  // Le logo apparait en fondu plutot que d'apparaitre sec : sur un demarrage
  // rapide, un affichage brutal se lit comme un clignotement.
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(onDone, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDone, opacity]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.View style={[styles.brand, { opacity }]}>
        <Text style={styles.logo}>VORA</Text>
        <Text style={styles.tagline}>Votre course, sans détour</Text>
      </Animated.View>
    </View>
  );
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
