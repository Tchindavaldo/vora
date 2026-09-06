import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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
const SPLASH_DURATION_MS = 1500;

type Props = {
  /** Appele une fois la session relue ET le delai ecoule. */
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
