import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEMO_OTP,
  OTP_LENGTH,
  RESEND_DELAY_SECONDS,
  isValidPhone,
  normalizePhone,
  requestOtp,
  verifyOtp,
  type Session,
  type UserRole,
} from '../../services/session';

/**
 * Pilote la connexion en deux etapes : numero, puis code.
 *
 * Tout l'etat du parcours (numero, code, role vise, chargement, erreur, compte
 * a rebours) vit ici et non dans les ecrans : les deux ecrans partagent le meme
 * numero, et le retour arriere depuis le code ne doit rien perdre (R12 — aucun
 * appel reseau brut dans un composant).
 */

export type AuthStep = 'phone' | 'code';

export function useAuthFlow(onAuthenticated: (session: Session) => void) {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhoneRaw] = useState('');
  const [code, setCodeRaw] = useState('');
  // Role IMPOSE par le raccourci de demonstration. `undefined` = laisser le
  // numero decider (cas normal), ce qui est le comportement a garder quand
  // l'authentification passera cote serveur.
  const [forcedRole, setForcedRole] = useState<UserRole | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Evite de repousser une session sur un ecran demonte (envoi annule,
  // retour arriere pendant la latence simulee).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Compte a rebours du renvoi de code. Un seul intervalle, arrete des qu'il
  // atteint zero : laisser tourner un timer invisible draine la batterie.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const setPhone = useCallback((raw: string) => {
    setPhoneRaw(normalizePhone(raw));
    setError(null);
  }, []);

  const setCode = useCallback((raw: string) => {
    setCodeRaw(raw.replace(/\D/g, '').slice(0, OTP_LENGTH));
    setError(null);
  }, []);

  const phoneValid = isValidPhone(phone);
  const codeComplete = code.length === OTP_LENGTH;

  /** Envoie le code et passe a l'etape suivante. */
  const submitPhone = useCallback(
    async (nextForcedRole?: UserRole) => {
      if (!phoneValid || pending) return;
      setForcedRole(nextForcedRole);
      setPending(true);
      setError(null);
      try {
        await requestOtp(phone);
        if (!mounted.current) return;
        setCodeRaw('');
        setSecondsLeft(RESEND_DELAY_SECONDS);
        setStep('code');
      } catch {
        if (!mounted.current) return;
        // Message affichable tel quel : ni code technique ni trace (R8).
        setError("Envoi impossible. Vérifiez votre connexion et réessayez.");
      } finally {
        if (mounted.current) setPending(false);
      }
    },
    [phone, phoneValid, pending],
  );

  const submitCode = useCallback(async () => {
    if (!codeComplete || pending) return;
    setPending(true);
    setError(null);
    try {
      const session = await verifyOtp(phone, code, forcedRole);
      if (!mounted.current) return;
      onAuthenticated(session);
    } catch (cause) {
      if (!mounted.current) return;
      setError(
        cause instanceof Error ? cause.message : 'Vérification impossible.',
      );
    } finally {
      if (mounted.current) setPending(false);
    }
  }, [code, codeComplete, forcedRole, onAuthenticated, pending, phone]);

  const resendCode = useCallback(async () => {
    if (secondsLeft > 0 || pending) return;
    setPending(true);
    setError(null);
    try {
      await requestOtp(phone);
      if (!mounted.current) return;
      setCodeRaw('');
      setSecondsLeft(RESEND_DELAY_SECONDS);
    } catch {
      if (!mounted.current) return;
      setError("Envoi impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      if (mounted.current) setPending(false);
    }
  }, [pending, phone, secondsLeft]);

  /** Retour a la saisie du numero, pour le corriger. */
  const editPhone = useCallback(() => {
    setStep('phone');
    setCodeRaw('');
    setError(null);
  }, []);

  return {
    step,
    phone,
    code,
    forcedRole,
    pending,
    error,
    secondsLeft,
    phoneValid,
    codeComplete,
    demoCode: DEMO_OTP,
    setPhone,
    setCode,
    submitPhone,
    submitCode,
    resendCode,
    editPhone,
  };
}
