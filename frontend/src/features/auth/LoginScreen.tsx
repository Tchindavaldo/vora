import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../theme';
import type { Session } from '../../services/session';
import { useAuthFlow } from './useAuthFlow';
import { PhoneStep } from './components/PhoneStep';
import { CodeStep } from './components/CodeStep';

type Props = {
  /** Session ouverte : l'appelant route vers l'app passager ou chauffeur. */
  onAuthenticated: (session: Session) => void;
};

/**
 * Connexion en deux etapes. L'ecran n'orchestre que la mise en page et le
 * clavier : la logique du parcours vit dans `useAuthFlow` (R12).
 */
export function LoginScreen({ onAuthenticated }: Props) {
  const insets = useSafeAreaInsets();
  const auth = useAuthFlow(onAuthenticated);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        {auth.step === 'code' ? (
          <Pressable
            onPress={auth.editPhone}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Revenir au numéro"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {auth.step === 'phone' ? (
            <PhoneStep
              phone={auth.phone}
              phoneValid={auth.phoneValid}
              pending={auth.pending}
              error={auth.error}
              onChangePhone={auth.setPhone}
              onSubmit={() => auth.submitPhone()}
              onSubmitDriver={() => auth.submitPhone('driver')}
            />
          ) : (
            <CodeStep
              phone={auth.phone}
              code={auth.code}
              codeComplete={auth.codeComplete}
              pending={auth.pending}
              error={auth.error}
              secondsLeft={auth.secondsLeft}
              demoCode={auth.demoCode}
              onChangeCode={auth.setCode}
              onSubmit={auth.submitCode}
              onResend={auth.resendCode}
              onEditPhone={auth.editPhone}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
