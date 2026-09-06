import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  getSession,
  hasSeenOnboarding,
  signOut as clearSession,
  type Session,
  type UserRole,
} from '../services/session';

/**
 * AuthContext — source de verite de la session et de l'etape d'ouverture (R6).
 *
 * Il porte ce qui est PARTAGE : qui est connecte, avec quel role, et a quelle
 * etape du demarrage on se trouve. La saisie du numero et du code reste dans
 * `useAuthFlow`, monte par le seul ecran de connexion : c'est un etat de
 * formulaire, il n'a rien a faire dans un contexte global — il disparait des
 * que l'ecran se ferme.
 *
 * Ce qui vit ici est en revanche lu loin de l'endroit ou il est ecrit : un
 * ecran de profil enfoui doit pouvoir deconnecter, et afficher le role, sans
 * qu'on fasse descendre trois props a travers l'arbre.
 */

/** Etape du demarrage. Le routage de `App.tsx` en decoule directement. */
export type AuthStage = 'splash' | 'onboarding' | 'login' | 'app';

export type AuthState = {
  /** Session courante, ou `null` tant que personne n'est connecte. */
  session: Session | null;
  /** Role du compte connecte. `null` hors session — ne jamais supposer passager. */
  role: UserRole | null;
  stage: AuthStage;
  /** Fin du splash : la session a ete relue du disque, on aiguille. */
  completeSplash: () => void;
  /** Fin de l'onboarding : on passe a la connexion. */
  completeOnboarding: () => void;
  /** Connexion reussie : ouvre l'application du role du compte. */
  authenticate: (session: Session) => void;
  /** Deconnexion : efface la session et renvoie a l'ecran de connexion. */
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

type Props = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [stage, setStage] = useState<AuthStage>('splash');

  /**
   * Le splash a fini de relire le disque. Une session deja ouverte
   * court-circuite onboarding et connexion — c'est tout l'interet de la
   * persistance.
   */
  const completeSplash = useCallback(() => {
    const restored = getSession();
    if (restored != null) {
      setSession(restored);
      setStage('app');
      return;
    }
    setStage(hasSeenOnboarding() ? 'login' : 'onboarding');
  }, []);

  const completeOnboarding = useCallback(() => setStage('login'), []);

  const authenticate = useCallback((next: Session) => {
    setSession(next);
    setStage('app');
  }, []);

  /**
   * Deconnexion. L'effacement disque n'a pas a retarder le retour a l'ecran de
   * connexion : l'utilisateur est deja deconnecte en memoire, et l'echec de
   * l'ecriture est deja tolere cote service (R8).
   */
  const signOut = useCallback(() => {
    void clearSession();
    setSession(null);
    setStage('login');
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      role: session?.role ?? null,
      stage,
      completeSplash,
      completeOnboarding,
      authenticate,
      signOut,
    }),
    [authenticate, completeOnboarding, completeSplash, session, signOut, stage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Lecture du contexte.
 *
 * L'exception est volontaire : sans elle, un composant monte hors du Provider
 * recevrait `null` et planterait bien plus loin, dans un fichier qui n'a rien a
 * voir avec la cause. Echouer ici nomme le vrai probleme.
 */
export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error('useAuth doit etre utilise dans AuthProvider');
  }
  return value;
}
