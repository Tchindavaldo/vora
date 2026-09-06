import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../theme';
import { markOnboardingSeen } from '../../services/session';
import { ONBOARDING_SLIDES } from './slides';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  /** Fin de l'onboarding, qu'on l'ait balaye jusqu'au bout ou passe. */
  onDone: () => void;
};

/**
 * Onboarding : trois ecrans balayables, une phrase et une illustration chacun.
 *
 * Vu UNE SEULE FOIS : le passage est memorise des la sortie, quelle que soit la
 * maniere d'en sortir. Un onboarding qui revient a chaque lancement est percu
 * comme un bug, pas comme une explication.
 */
export function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === ONBOARDING_SLIDES.length - 1;

  const finish = useCallback(() => {
    // L'ecriture disque n'a pas a retarder la sortie : elle ne sert qu'au
    // prochain lancement, et son echec est deja tolere cote service (R8).
    void markOnboardingSeen();
    onDone();
  }, [onDone]);

  const goNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setIndex(next);
  }, [finish, index, isLast]);

  // L'index suit le balayage manuel : les puces et le libelle du bouton
  // doivent rester justes meme quand l'utilisateur fait defiler lui-meme.
  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setIndex(page);
    },
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <Pressable
          onPress={finish}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Passer l'introduction"
        >
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {ONBOARDING_SLIDES.map((slide) => (
          <View key={slide.key} style={styles.slide}>
            <View style={styles.illustration}>{slide.illustration}</View>
            <Text style={styles.title}>{slide.title}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.dots}>
          {ONBOARDING_SLIDES.map((slide, dotIndex) => (
            <View
              key={slide.key}
              style={[styles.dot, dotIndex === index && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable
          onPress={goNext}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaLabel}>{isLast ? 'Commencer' : 'Suivant'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  skip: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
  pager: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  illustration: {
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.title,
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 32,
  },
  footer: {
    paddingHorizontal: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
  cta: {
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    backgroundColor: colors.primaryPressed,
  },
  ctaLabel: {
    ...typography.subtitle,
    color: colors.surface,
    fontSize: 17,
  },
});
