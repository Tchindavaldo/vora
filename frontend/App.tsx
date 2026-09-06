import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './src/features/home/HomeScreen';
import { DriverApp } from './src/features/driver/DriverApp';
import { SplashScreen } from './src/features/auth/SplashScreen';
import { OnboardingScreen } from './src/features/onboarding/OnboardingScreen';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

/**
 * Routage de haut niveau : splash → onboarding (une seule fois) → connexion →
 * application du role connecte.
 *
 * Composant SEPARE de `App` : un composant ne peut pas lire le contexte qu'il
 * fournit lui-meme. C'est `App` qui monte le Provider, et cet enfant qui le
 * consomme.
 */
function AppRouter() {
  const { stage, role, completeSplash, completeOnboarding } = useAuth();

  if (stage === 'splash') {
    return <SplashScreen onDone={completeSplash} />;
  }

  if (stage === 'onboarding') {
    return <OnboardingScreen onDone={completeOnboarding} />;
  }

  if (stage === 'login') {
    return <LoginScreen />;
  }

  // NOTE : `admin` n'a pas de branche — le dashboard administrateur est prevu
  // en web et n'existe pas encore. Un compte admin ouvre donc l'application
  // passager, plutot qu'un ecran vide.
  // La deconnexion n'est plus relayee : chaque profil la lit dans le contexte.
  return role === 'driver' ? <DriverApp /> : <HomeScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
