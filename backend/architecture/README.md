# Architecture — Backend VORA

> **Non initialisé.** Ce dossier ne contient que sa documentation ; aucun projet
> n'a encore été créé. À remplir quand la stack backend sera arrêtée.

## Stack

| Couche | Choix | Justification (brief §4.2) |
|---|---|---|
| Runtime / framework | _à définir_ | |
| Base de données | _à définir_ | |
| Authentification | _à définir_ | |
| Temps réel | _à définir_ | |

## Endpoints attendus par le frontend

Recensés depuis les besoins déjà identifiés côté application :

| Méthode | Route | Usage |
|---|---|---|
| `GET` | `/drivers/nearby?lng=&lat=` | Véhicules disponibles autour du passager (remplace `demoData.ts`) |
| `POST` | `/auth/register` | Inscription passager / chauffeur |
| `POST` | `/auth/login` | Connexion, renvoie un token |
| `POST` | `/rides/estimate` | Distance, durée, prix par catégorie |
| `POST` | `/rides` | Création d'une demande de course |
| `GET` | `/rides/:id` | Suivi d'une course |
| `POST` | `/rides/:id/cancel` | Annulation |

Liste indicative, à figer avec l'équipe backend.

## Règles applicables

- **R9** : aucune clé en dur. Les clés sensibles (paiement, services payants)
  vivent **uniquement** ici, jamais dans le bundle mobile.
- **R10** : mots de passe hachés, validation des entrées côté serveur, contrôle
  d'accès par rôle (passager / chauffeur / admin strictement séparés).
- **R4** : ~400 lignes par fichier, 500 en plafond dur.

## À faire

1. Choisir la stack et la documenter ci-dessus
2. Initialiser le projet
3. Figer le contrat d'API avec le frontend
4. Créer `.env.example`
