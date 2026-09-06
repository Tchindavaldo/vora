import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './src/features/home/HomeScreen';
import { DriverApp } from './src/features/driver/DriverApp';

/**
 * Bascule passager / chauffeur, pour la demonstration (R17 etape 9).
 *
 * Pas de compte chauffeur reel : le passage se fait depuis le profil
 * passager ("Changer de compte"), en attendant l'authentification par role
 * (R6, AuthContext).
 */
type AppRole = 'passenger' | 'driver';

export default function App() {
  const [role, setRole] = useState<AppRole>('passenger');

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
