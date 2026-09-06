import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../../theme';

/**
 * Contenu des trois ecrans d'onboarding.
 *
 * Les illustrations sont des SVG maison plutot que des images : elles suivent
 * les couleurs du theme, pesent quelques lignes, et evitent d'embarquer des
 * assets binaires dans le depot pour trois ecrans vus une seule fois (R18).
 */

const ILLUSTRATION_SIZE = 180;

function SpeedIllustration() {
  return (
    <Svg width={ILLUSTRATION_SIZE} height={ILLUSTRATION_SIZE} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="52" fill={colors.primarySoft} />
      <Path
        d="M32 74h56M40 74a8 8 0 1 0 16 0M68 74a8 8 0 1 0 16 0"
        stroke={colors.primary}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M36 66l6-16a6 6 0 0 1 6-4h24a6 6 0 0 1 6 4l6 16z"
        fill={colors.primary}
      />
      <Path
        d="M14 46h14M10 58h18M16 70h12"
        stroke={colors.primary}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PaymentIllustration() {
  return (
    <Svg width={ILLUSTRATION_SIZE} height={ILLUSTRATION_SIZE} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="52" fill={colors.primarySoft} />
      <Rect x="26" y="42" width="68" height="42" rx="8" fill={colors.primary} />
      <Rect x="26" y="54" width="68" height="8" fill={colors.surface} opacity={0.9} />
      <Circle cx="78" cy="74" r="7" fill={colors.surface} opacity={0.9} />
      <Path
        d="M40 74h16"
        stroke={colors.surface}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <Circle cx="86" cy="38" r="14" fill={colors.online} />
      <Path
        d="M80 38l4 4 8-8"
        stroke={colors.surface}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function SafetyIllustration() {
  return (
    <Svg width={ILLUSTRATION_SIZE} height={ILLUSTRATION_SIZE} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="52" fill={colors.primarySoft} />
      <Path
        d="M60 26l26 10v22c0 18-11 30-26 36-15-6-26-18-26-36V36z"
        fill={colors.primary}
      />
      <Path
        d="M50 62l7 7 15-16"
        stroke={colors.surface}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="30" cy="34" r="6" fill={colors.userDot} />
      <Circle cx="92" cy="80" r="6" fill={colors.userDot} />
    </Svg>
  );
}

export type OnboardingSlide = {
  key: string;
  title: string;
  illustration: React.ReactNode;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: 'speed',
    title: 'Trouvez une course en quelques secondes',
    illustration: <SpeedIllustration />,
  },
  {
    key: 'payment',
    title: 'Payez comme vous voulez — la monnaie est prévue à l’avance',
    illustration: <PaymentIllustration />,
  },
  {
    key: 'safety',
    title: 'Voyagez en sécurité, vos proches vous suivent',
    illustration: <SafetyIllustration />,
  },
];
