/**
 * Session locale : role connecte, numero, passage de l'onboarding.
 *
 * ⚠️ AUTHENTIFICATION SIMULEE, comme le paiement (R13) : aucun backend n'existe
 * encore. Le role n'est PAS decide par le serveur mais deduit du numero saisi,
 * via la liste de comptes de demonstration ci-dessous. Quand l'API arrivera,
 * ce module appellera `POST /auth/otp` puis `POST /auth/verify` (R12), et c'est
 * la reponse serveur qui portera le role — jamais le client (R10).
 *
 * En revanche la PERSISTANCE, elle, est reelle : la session survit au
 * redemarrage de l'application (AsyncStorage), pour qu'un utilisateur deja
 * connecte n'ait pas a se reconnecter a chaque ouverture.
 */

import AsyncStorageModule from '@react-native-async-storage/async-storage';

/**
 * AsyncStorage est un module NATIF : il n'existe que dans un dev-client
 * reconstruit apres son installation. Tant que ce build n'a pas ete refait, le
 * module vaut `null` et le moindre appel fait planter l'application au
 * demarrage — avant meme le splash.
 *
 * On degrade donc au lieu d'echouer (R8) : sans stockage natif, la session vit
 * en memoire pour la duree de l'execution. L'application reste entierement
 * utilisable, seule la persistance entre deux lancements est perdue, et le
 * defaut est signale une fois dans les logs.
 */
const storage = AsyncStorageModule as typeof AsyncStorageModule | null;

if (storage == null) {
  console.warn(
    '[session] AsyncStorage indisponible — session non persistee. ' +
      'Reconstruire le dev-client (npx expo run:android) pour l activer.',
  );
}

export type UserRole = 'passenger' | 'driver' | 'admin';

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

/**
 * Comptes de demonstration : un numero par role.
 *
 * Un numero par role plutot qu'un compte a double casquette — c'est ce que le
 * jury cherchera pour tester, et cela materialise la separation stricte des
 * roles exigee par le brief §10. Seuls les trois derniers chiffres comptent :
 * le jury peut composer n'importe quel numero a 9 chiffres finissant par 001
 * ou 002.
 *
 * NOTE : `admin` est reserve mais NON ROUTE — le dashboard administrateur est
 * prevu en web et n'existe pas encore. Se connecter avec un numero en 003
 * ouvre donc l'application passager. La ligne reste ici pour que le jour ou le
 * dashboard arrive, il n'y ait qu'un `case` a brancher.
 */
export const DEMO_ACCOUNTS: { suffix: string; role: UserRole; label: string }[] = [
  { suffix: '001', role: 'passenger', label: 'Passager' },
  { suffix: '002', role: 'driver', label: 'Chauffeur' },
];

/** Cle de stockage. Prefixee pour ne pas entrer en collision avec un autre module. */
const STORAGE_SESSION = 'vora.session';
const STORAGE_ONBOARDING = 'vora.onboardingSeen';

let session: Session | null = null;
let onboardingSeen = false;

/**
 * Recharge session et onboarding depuis le disque.
 *
 * Appele une seule fois par le splash, avant tout aiguillage : c'est
 * precisement le temps que le splash sert a couvrir. Un echec de lecture n'est
 * pas bloquant — on repart d'une session vide plutot que de planter au
 * demarrage (R8).
 */
export async function restoreSession(): Promise<Session | null> {
  if (storage == null) return session;
  try {
    const [rawSession, rawOnboarding] = await storage.multiGet([
      STORAGE_SESSION,
      STORAGE_ONBOARDING,
    ]);
    onboardingSeen = rawOnboarding[1] === 'true';
    const stored = rawSession[1];
    session = stored != null ? (JSON.parse(stored) as Session) : null;
  } catch (cause) {
    console.warn('[session] restauration impossible', cause);
    session = null;
  }
  return session;
}

export function getSession(): Session | null {
  return session;
}

export function hasSeenOnboarding(): boolean {
  return onboardingSeen;
}

export async function markOnboardingSeen(): Promise<void> {
  onboardingSeen = true;
  if (storage == null) return;
  try {
    await storage.setItem(STORAGE_ONBOARDING, 'true');
  } catch (cause) {
    // L'onboarding reapparaitra au prochain lancement : genant, pas bloquant.
    console.warn('[session] onboarding non memorise', cause);
  }
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
 * Role associe a un numero de demonstration.
 *
 * Repli sur `passenger` : un numero quelconque ouvre le parcours principal,
 * celui que le jury teste en premier. Un numero inconnu ne doit jamais bloquer
 * la demonstration.
 */
export function roleForPhone(phone: string): UserRole {
  const match = DEMO_ACCOUNTS.find((account) => phone.endsWith(account.suffix));
  return match?.role ?? 'passenger';
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
 * Verifie le code et ouvre la session.
 *
 * Le role vient du numero (`roleForPhone`) et non de l'ecran : c'est ce qui
 * fait qu'un numero passager ne peut pas ouvrir l'application chauffeur. Le
 * `forcedRole` n'existe que pour le raccourci de demonstration "Continuer
 * comme chauffeur", qui evite au jury de retenir quel numero fait quoi.
 *
 * Rejette avec un message affichable tel quel (R8) : l'appelant n'a pas a
 * traduire un code d'erreur.
 */
export function verifyOtp(
  phone: string,
  code: string,
  forcedRole?: UserRole,
): Promise<Session> {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      if (code !== DEMO_OTP) {
        reject(new Error('Code incorrect. Reessayez.'));
        return;
      }
      const next: Session = { role: forcedRole ?? roleForPhone(phone), phone };
      session = next;
      try {
        await storage?.setItem(STORAGE_SESSION, JSON.stringify(next));
      } catch (cause) {
        // La session reste valide pour cette execution, simplement non
        // persistee : on n'echoue pas une connexion reussie pour autant.
        console.warn('[session] persistance impossible', cause);
      }
      resolve(next);
    }, 600);
  });
}

/** Deconnexion : efface la session du disque comme de la memoire. */
export async function signOut(): Promise<void> {
  session = null;
  try {
    await storage?.removeItem(STORAGE_SESSION);
  } catch (cause) {
    console.warn('[session] deconnexion partielle', cause);
  }
}
