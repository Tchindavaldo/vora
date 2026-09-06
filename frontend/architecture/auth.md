# Feature — Ouverture et authentification

R17 étape 1. Couvre le démarrage de l'application jusqu'à l'entrée dans le
parcours du rôle connecté.

## Flux

```text
SPLASH (1,5 s) ─┬─ session ouverte ──────────────► APP (passager | chauffeur)
                └─ pas de session ─┬─ onboarding déjà vu ──► CONNEXION
                                   └─ première fois ───────► ONBOARDING → CONNEXION

CONNEXION : numéro (+237, 9 chiffres) → code à 4 chiffres → session
```

L'aiguillage vit dans `App.tsx` (`AppStage`). Il passera dans l'`AuthContext`
(R6) quand un écran profond devra déconnecter ou lire le rôle sans prop.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/services/session.ts` | Session, validation et formatage du numéro, envoi et vérification du code — **simulé** |
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
- **Le lien « Continuer comme chauffeur » tient lieu de sélecteur de rôle** :
  pas d'écran de choix imposé à l'ouverture. Le rôle est transmis avec la
  demande de code et fixé à la vérification.
- **Une seule saisie invisible pour le code**, les 4 cases n'en sont que
  l'affichage : quatre champs séparés obligeraient à gérer focus, effacement et
  collage du SMS à la main (R18).
- **Bouton actif seulement si la saisie est valide** — 9 chiffres pour le
  numéro, 4 pour le code.

## Limites (état actuel)

- **Vérification simulée** : le code de démonstration est `1234`, aucun SMS
  n'est envoyé, et l'écran l'annonce explicitement — jamais présenter du faux
  comme du réel (brief §23).
- **Session en mémoire** : perdue au redémarrage de l'application, donc on
  repasse par onboarding puis connexion. À brancher sur `POST /auth/otp` et
  `POST /auth/verify` (R12), avec le token en stockage sécurisé (R10).
- **Pas de déconnexion depuis le profil** tant que l'`AuthContext` n'existe pas.
