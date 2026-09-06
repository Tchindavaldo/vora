# Architecture — VORA

> Index général du projet. **À tenir à jour** (R3, R14) : dès qu'un travail
> modifie la structure ou rend une description obsolète, mettre à jour ce
> fichier et le `architecture/<feature>.md` concerné avant de clore.

## 1. État du projet

**Phase actuelle** : frontend initialisé — ouverture (splash, onboarding,
connexion par numéro et code, simulée — R17 étape 1), accueil, recherche de destination,
itinéraire, estimation de prix, paiement simulé, commande, recherche de
chauffeur, suivi de la course jusqu'à sa fin, évaluation du chauffeur,
historique des courses, sécurité et assistance du passager (support, FAQ,
litige) (R17 étapes 2 à 8 et 10, la course étant simulée). **Mode chauffeur** livré également : tableau de bord,
demande entrante, course en quatre étapes jusqu'à l'encaissement, revenus du jour
et historique des courses passées (R17
étape 9, simulé). Backend non démarré.

| Couche | Choix | Justification |
|---|---|---|
| Frontend passager | Expo SDK 54 + React Native + TypeScript | Un seul code Android/iOS, itération rapide sur 48 h |
| Frontend chauffeur | Même base Expo, feature `driver/` isolée | Un seul binaire pour la démo : on bascule de rôle depuis le profil, sans second projet à installer |
| Dashboard admin | _à définir_ | |
| Backend / API | _à définir_ | |
| Base de données | _à définir_ | |
| Cartographie | MapLibre GL Native + tuiles MapTiler | Open source, styles personnalisables, gratuit sans carte bancaire |
| Géocodage | MapTiler Geocoding | La clé des tuiles couvre déjà l'usage — aucun service de plus à configurer |
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
      auth/            splash, connexion par numero et code — FAIT, simulé
      onboarding/      3 écrans de première ouverture — FAIT
      map/             encapsulation MapLibre (R11)
      home/            écran d'accueil — FAIT
      search/          recherche de destination — FAIT
      booking/         estimation, confirmation — FAIT
      payment/         paiement (espèces + monnaie, portefeuille, MoMo) — FAIT, simulé
      ride/            course : chauffeur, suivi, évaluation — FAIT
      driver/          mode chauffeur : tableau de bord, demande, course,
                       revenus du jour, historique des courses,
                       assistance (urgence, support, signalement) — FAIT, simulé
      history/         historique des courses et de leurs reçus — FAIT
      support/         assistance passager : contact, FAQ, litige — FAIT, simulé
      profile/         profil, paramètres, contacts d'urgence — FAIT
    services/          géocodage (MapTiler), routage (ORS), tarifs, paiement,
                       évaluations, transactions, sécurité et session
                       (persistée, comptes de démo) — simulés
    contexts/          AuthContext (session, rôle, étape d'ouverture) — FAIT ;
                       Ride et Location restent à faire
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
| [`frontend/architecture/auth.md`](../frontend/architecture/auth.md) | Ouverture : splash, onboarding, connexion par numéro et code |
| [`frontend/architecture/home.md`](../frontend/architecture/home.md) | Écran d'accueil passager |
| [`frontend/architecture/search.md`](../frontend/architecture/search.md) | Recherche de destination |
| [`frontend/architecture/booking.md`](../frontend/architecture/booking.md) | Itinéraire et estimation de prix |
| [`frontend/architecture/ride.md`](../frontend/architecture/ride.md) | Course : commande, chauffeur, suivi jusqu'à la fin |
| [`frontend/architecture/payment.md`](../frontend/architecture/payment.md) | Paiement : espèces et monnaie annoncée, portefeuille, Mobile Money (simulé) |
| [`frontend/architecture/history.md`](../frontend/architecture/history.md) | Historique des courses et de leurs reçus |
| [`frontend/architecture/safety.md`](../frontend/architecture/safety.md) | Sécurité : SOS, partage, signalement, contacts d'urgence |
| [`frontend/architecture/support.md`](../frontend/architecture/support.md) | Assistance passager : contact du support, FAQ, litige sur une course |
| [`frontend/architecture/driver.md`](../frontend/architecture/driver.md) | Parcours chauffeur : demande, course en 4 étapes, encaissement |

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
