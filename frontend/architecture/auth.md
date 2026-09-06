# Feature — Ouverture et authentification

R17 étape 1. Couvre le démarrage de l'application jusqu'à l'entrée dans le
parcours du rôle connecté.

## Flux

```text
SPLASH ─┬─ session restaurée du disque ───────► APP (passager | chauffeur)
        └─ pas de session ─┬─ onboarding déjà vu ──► CONNEXION
                           └─ première fois ───────► ONBOARDING → CONNEXION

CONNEXION : numéro (+237, 9 chiffres) → code à 4 chiffres → session

« Changer de compte » (profil passager ou chauffeur) → DÉCONNEXION → CONNEXION
```

Le splash attend **les deux** : la relecture disque et sa durée minimale de
1,5 s. Sortir dès la réponse du disque ferait clignoter l'écran sur un appareil
rapide ; sortir au seul minuteur risquerait d'aiguiller avant de savoir s'il y a
une session.

L'état de session vit dans **`src/contexts/AuthContext.tsx`** (R6) : session,
rôle, étape d'ouverture et déconnexion. `App.tsx` monte le Provider, et un
composant enfant `AppRouter` le consomme — un composant ne peut pas lire le
contexte qu'il fournit lui-même.

**Partage des rôles** : le contexte porte ce qui est lu loin d'où il est écrit
(qui est connecté, avec quel rôle). `useAuthFlow` reste monté par le seul
`LoginScreen` : la saisie du numéro et du code est un état de formulaire, qui
doit disparaître avec l'écran plutôt que vivre en global.

`useAuth()` **lève une exception** hors Provider. Sans cela un composant mal
monté recevrait `null` et planterait bien plus loin, dans un fichier sans
rapport avec la cause.

## Comptes de démonstration

Un numéro par rôle : c'est ce que le jury cherche pour tester, et cela
matérialise la séparation stricte des rôles (brief §10). Seuls les trois
derniers chiffres comptent. Code unique `1234`, annoncé comme simulé à l'écran.

| Suffixe | Rôle | État |
|---|---|---|
| `001` | Passager | Routé |
| `002` | Chauffeur | Routé |
| `003` | Administrateur | **Réservé, non routé** — dashboard web non livré, ouvre le compte passager |

Tout autre numéro à 9 chiffres ouvre un compte **passager** : un numéro mal
retenu ne doit jamais bloquer la démonstration.

Le lien **« Continuer comme chauffeur »** passe un `forcedRole` qui prime sur le
numéro. Il ne survivra pas au branchement du backend — c'est un confort de
démonstration, pas un mécanisme d'autorisation.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/contexts/AuthContext.tsx` | Session, rôle, étape d'ouverture, déconnexion — lu par `useAuth()` |
| `src/services/session.ts` | Session persistée (AsyncStorage), comptes de démo, validation et formatage du numéro, vérification du code — **simulé** |
| `src/features/auth/SplashScreen.tsx` | Logo sur fond de marque, 1,5 s, couvre la vérification de session |
| `src/features/onboarding/OnboardingScreen.tsx` | 3 écrans balayables, bouton « Passer », vu une seule fois |
| `src/features/onboarding/slides.tsx` | Textes et illustrations SVG maison des 3 écrans |
| `src/features/auth/LoginScreen.tsx` | Conteneur : mise en page, clavier, retour arrière |
| `src/features/auth/useAuthFlow.ts` | État du parcours : étape, numéro, code, rôle, chargement, erreur, rebours |
| `src/features/auth/components/PhoneStep.tsx` | Étape 1 : indicatif verrouillé, saisie formatée, lien « Continuer comme chauffeur » |
| `src/features/auth/components/CodeStep.tsx` | Étape 2 : 4 cases, rebours 30 s puis renvoi, rappel du numéro |

## Décisions

- **Indicatif +237 verrouillé** : l'app ne dessert que le Cameroun. Un sélecteur
  de pays n'ajouterait qu'une source d'erreur.
- **Le rôle est porté par le compte, pas par l'écran** : `roleForPhone()` le
  déduit du numéro. Un numéro passager ne peut donc pas ouvrir l'application
  chauffeur — c'est ce qui rend la séparation des rôles démontrable.
- **« Changer de compte » déconnecte** au lieu de basculer l'affichage :
  puisque le rôle vient du compte, une bascule sans reconnexion contournerait
  le contrôle d'accès qu'on vient de poser (R10).
- **Dégradation si AsyncStorage manque** : c'est un module natif, absent tant
  que le dev-client n'a pas été reconstruit. Le service le détecte et retombe
  sur une session en mémoire au lieu de planter au démarrage (R8) — un
  coéquipier qui pull sans rebuilder garde une application utilisable.
- **Session persistée sur l'appareil** : un utilisateur déjà connecté ne
  repasse pas par la connexion à chaque ouverture. Seule la session est
  stockée — aucun token, puisqu'il n'y en a pas encore ; le jour venu il devra
  aller en stockage sécurisé, pas dans AsyncStorage.
- **Une seule saisie invisible pour le code**, les 4 cases n'en sont que
  l'affichage : quatre champs séparés obligeraient à gérer focus, effacement et
  collage du SMS à la main (R18).
- **Bouton actif seulement si la saisie est valide** — 9 chiffres pour le
  numéro, 4 pour le code.

## Limites (état actuel)

- **Vérification simulée** : le code de démonstration est `1234`, aucun SMS
  n'est envoyé, et l'écran l'annonce explicitement — jamais présenter du faux
  comme du réel (brief §23).
- **Le rôle est décidé côté client**, à partir du numéro. C'est acceptable pour
  une démonstration sans backend, jamais en production : le serveur devra
  porter le rôle dans sa réponse (R10). À brancher sur `POST /auth/otp` et
  `POST /auth/verify` (R12), avec le token en stockage sécurisé.
- **Dashboard administrateur non livré** : le rôle `admin` existe dans le type
  mais n'a pas de branche dans `App.tsx`.
- **Pas de `RideContext` ni de `LocationContext`** : `AuthContext` est le
  premier des quatre contextes prévus (R6). Les autres suivront si la course
  et la géolocalisation doivent être lues hors de leur écran.
