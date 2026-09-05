# Architecture — VORA

> Index général du projet. **À tenir à jour** (R3, R14) : dès qu'un travail
> modifie la structure ou rend une description obsolète, mettre à jour ce
> fichier et le `architecture/<feature>.md` concerné avant de clore.

## 1. État du projet

**Phase actuelle** : frontend initialisé, écran d'accueil passager fonctionnel.
Backend non démarré.

| Couche | Choix | Justification |
|---|---|---|
| Frontend passager | Expo SDK 54 + React Native + TypeScript | Un seul code Android/iOS, itération rapide sur 48 h |
| Frontend chauffeur | _à définir_ (même base envisagée) | |
| Dashboard admin | _à définir_ | |
| Backend / API | _à définir_ | |
| Base de données | _à définir_ | |
| Cartographie | MapLibre GL Native + tuiles MapTiler | Open source, styles personnalisables, gratuit sans carte bancaire |
| Temps réel | _à définir_ | |
| IA / innovation | _à définir_ | |

Détail des choix : [`frontend/architecture/README.md`](../frontend/architecture/README.md).

## 2. Structure des dossiers

```text
frontend/              application mobile passager (Expo, initialisé)
  src/
    config/            variables d'environnement (R9)
    theme/             design system
    features/
      map/             encapsulation MapLibre (R11)
      home/            écran d'accueil — FAIT
      booking/         (vide) estimation, confirmation
    services/          (vide) API, routage, géocodage
    contexts/          (vide) Auth, Ride, Location
  architecture/        doc du frontend
backend/               (non initialisé)
  architecture/        doc du backend, contrat d'API attendu
architecture/          cette documentation (vue projet)
```

Chaque partie a son propre `architecture/` : c'est là que vit le détail. Ce
fichier-ci ne donne que la vue d'ensemble.

## 3. Contextes (R6)

| Contexte | Responsabilité |
|---|---|
| `AuthContext` | user connecté, rôle (passager / chauffeur / admin), tokens |
| `RideContext` | course en cours, statut, historique |
| `LocationContext` | position, permissions, départ, destination, itinéraire |
| `SocketContext` | connexion temps réel, rooms, événements de course |

## 4. Docs par feature

Un `<partie>/architecture/<feature>.md` par feature livrée. Le hook
`require-architecture-read.sh` exige sa lecture avant toute recherche sur cette
feature.

| Doc | Feature |
|---|---|
| [`frontend/architecture/home.md`](../frontend/architecture/home.md) | Écran d'accueil passager |

## 5. Flux principal (brief §13)

```text
OUVERTURE → CONNEXION → LOCALISATION → DESTINATION → ITINÉRAIRE
→ ESTIMATION PRIX → CONFIRMATION → RECHERCHE CHAUFFEUR → ACCEPTÉ
→ SUIVI → COURSE → FIN → PAIEMENT → ÉVALUATION
```

## 6. Ordre de construction (R17)

1. authentification · 2. carte · 3. destination · 4. itinéraire ·
5. estimation prix · 6. réservation · 7. chauffeur · 8. suivi ·
9. innovation · 10. sécurité · 11. tests · 12. documentation

Ne pas entamer une étape tant que la précédente n'est pas fonctionnelle de bout
en bout.
