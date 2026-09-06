/**
 * Session locale : role connecte, numero, passage de l'onboarding.
 *
 * ⚠️ SIMULE, comme le paiement (R13) : aucun backend n'existe encore. La session
 * vit en memoire pour la duree de l'execution — au prochain lancement, on
 * repasse par l'onboarding puis la connexion. Quand l'API arrivera, ce module
 * appellera `POST /auth/otp` puis `POST /auth/verify` (R12) et stockera le
 * token dans un stockage securise, jamais en clair (R10).
 *
 * Il est volontairement sans etat React : le splash doit pouvoir l'interroger
 * avant tout rendu, et l'AuthContext (R6) s'appuiera dessus sans le reecrire.
 */

export type UserRole = 'passenger' | 'driver';

export type Session = {
  role: UserRole;
  /** Numero national a 9 chiffres, sans indicatif. */
  phone: string;
};

/** Indicatif Cameroun : verrouille dans l'UI, le pays n'est pas un choix ici. */
export const COUNTRY_CODE = '+237';

/** Longueur d'un numero camerounais sans indicatif. */
export const PHONE_LENGTH = 9;

/** Longueur du code de verification envoye par SMS. */
export const OTP_LENGTH = 4;

/**
 * Code accepte en demonstration. En production c'est le serveur qui verifie :
 * un code cote client n'est pas une securite, seulement un decor de demo — et
 * l'ecran doit le dire clairement, jamais faire passer du faux pour du reel.
 */
export const DEMO_OTP = '1234';

/** Delai avant de pouvoir demander un nouveau code, en secondes. */
export const RESEND_DELAY_SECONDS = 30;

let session: Session | null = null;
let onboardingSeen = false;

export function getSession(): Session | null {
  return session;
}

export function hasSeenOnboarding(): boolean {
  return onboardingSeen;
}

export function markOnboardingSeen(): void {
  onboardingSeen = true;
}

/** Un numero est valide s'il fait exactement 9 chiffres. */
export function isValidPhone(digits: string): boolean {
  return /^\d{9}$/.test(digits);
}

/** Ne garde que les chiffres, plafonnes a la longueur d'un numero. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, PHONE_LENGTH);
}

/**
 * Formate pour la lecture : 6 XX XX XX XX.
 *
 * Les groupes suivent la maniere dont un numero est dicte au Cameroun, pas un
 * decoupage arbitraire : l'utilisateur doit reconnaitre son propre numero.
 */
export function formatPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (d.length <= 1) return d;
  const groups = [
    d.slice(0, 1),
    d.slice(1, 3),
    d.slice(3, 5),
    d.slice(5, 7),
    d.slice(7, 9),
  ];
  return groups.filter((group) => group.length > 0).join(' ');
}

/**
 * Demande d'envoi du code. Simule la latence reseau pour que l'ecran suivant
 * ne s'affiche pas instantanement — un envoi instantane n'est pas credible et
 * masquerait l'etat de chargement qu'il faudra gerer en vrai (R8).
 */
export function requestOtp(phone: string): Promise<void> {
  if (!isValidPhone(phone)) {
    return Promise.reject(new Error('Numero invalide.'));
  }
  return new Promise((resolve) => setTimeout(resolve, 600));
}

/**
 * Verifie le code et ouvre la session. Rejette avec un message affichable tel
 * quel a l'utilisateur (R8) : l'appelant n'a pas a traduire un code d'erreur.
 */
export function verifyOtp(
  phone: string,
  code: string,
  role: UserRole,
): Promise<Session> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (code !== DEMO_OTP) {
        reject(new Error('Code incorrect. Reessayez.'));
        return;
      }
      session = { role, phone };
      resolve(session);
    }, 600);
  });
}

export function signOut(): void {
  session = null;
}
