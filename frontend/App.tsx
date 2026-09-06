import React, { useCallback, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './src/features/home/HomeScreen';
import { DriverApp } from './src/features/driver/DriverApp';
import { SplashScreen } from './src/features/auth/SplashScreen';
import { OnboardingScreen } from './src/features/onboarding/OnboardingScreen';
import { LoginScreen } from './src/features/auth/LoginScreen';
import {
  getSession,
  hasSeenOnboarding,
  type Session,
  type UserRole,
} from './src/services/session';

/**
 * Routage de haut niveau : splash → onboarding (une seule fois) → connexion →
 * application du role connecte.
 *
 * L'aiguillage tient dans un `useState` tant qu'il n'y a qu'un seul point de
 * decision. Il passera dans l'AuthContext (R6) le jour ou un ecran profond
 * devra deconnecter ou lire le role sans le recevoir en prop.
 */
type AppStage = 'splash' | 'onboarding' | 'login' | 'app';

export default function App() {
  const [stage, setStage] = useState<AppStage>('splash');
  const [role, setRole] = useState<UserRole>('passenger');

  // Fin du splash : une session ouverte court-circuite onboarding et connexion.
  const onSplashDone = useCallback(() => {
    const session = getSession();
    if (session != null) {
      setRole(session.role);
      setStage('app');
      return;
    }
    setStage(hasSeenOnboarding() ? 'login' : 'onboarding');
  }, []);

  const onAuthenticated = useCallback((session: Session) => {
    setRole(session.role);
    setStage('app');
  }, []);

  if (stage === 'splash') {
    return (
      <SafeAreaProvider>
        <SplashScreen onDone={onSplashDone} />
      </SafeAreaProvider>
    );
  }

  if (stage === 'onboarding') {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onDone={() => setStage('login')} />
      </SafeAreaProvider>
    );
  }

  if (stage === 'login') {
    return (
      <SafeAreaProvider>
        <LoginScreen onAuthenticated={onAuthenticated} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {role === 'driver' ? (
        <DriverApp onExitToHome={() => setRole('passenger')} />
      ) : (
        <HomeScreen onSwitchToDriver={() => setRole('driver')} />
      )}
    </SafeAreaProvider>
  );
}
