# Feature — Sécurité du passager (`src/features/ride/` + `src/features/profile/`)

Étape 10 de l'ordre de construction (R17), critère d'évaluation à part entière
(brief §10, §25). Quatre actions : partager sa course, alerter ses contacts,
appeler l'assistance, signaler un chauffeur. Plus l'écran où le passager
**définit** les contacts que l'alerte préviendra.

## Position dans le flux

```text
RideTrackingSheet (chauffeur arrivé ou course en cours)
├── « Partager la course »  → feuille de partage du système
├── « SOS »                 → EmergencySheet   → alerte + appels
└── « Signaler ce chauffeur » → ReportSheet    → motif + détails

HomeHeader (avatar) → ProfileScreen → « Contacts d'urgence »
                                    → EmergencyContactsScreen
```

Le signalement reste accessible **après** la descente (`completed`) : c'est
souvent une fois hors du véhicule que le passager ose signaler.

## Fichiers

| Fichier | Rôle |
|---|---|
| `ride/useRideSafety.ts` | Partage, alerte, appels, signalement — états et erreurs (R8) |
| `ride/components/EmergencySheet.tsx` | Panneau d'urgence : alerte, contacts, assistance |
| `ride/components/ReportSheet.tsx` | Signalement : motifs fermés + détails facultatifs |
| `profile/ProfileScreen.tsx` | Paramètres du passager, section **Sécurité** en tête |
| `profile/EmergencyContactsScreen.tsx` | Ajout et suppression des contacts d'urgence |
| `profile/useEmergencyContacts.ts` | Liste partagée + validation des saisies |
| `../../services/safety.ts` | Alerte et signalement **simulés** — seul fichier à remplacer par l'API |

## Les deux voies de l'urgence

Volontairement distinctes, et affichées ensemble :

1. **Alerte** — un geste, et tous les contacts reçoivent position, chauffeur,
   plaque et destination (`alertMessage`). Elle passe par le réseau.
2. **Appel direct** — le numéro est pré-rempli dans le composeur, le passager
   déclenche. Aucun serveur n'intervient.

Si l'alerte échoue, l'appel est déjà sous les yeux du passager et le message
d'erreur y renvoie (R8). L'app ne compose **jamais** l'appel à la place de
l'utilisateur : un appel parti tout seul est une surprise, même bien intentionnée.

## Contacts d'urgence

Ce sont eux que le SOS alerte. Sans contact enregistré, l'alerte n'a personne à
joindre — le profil et l'écran de contacts le signalent **en rouge** plutôt que
de laisser le passager le découvrir en urgence.

La liste vit dans `useEmergencyContacts`, partagée au niveau du module et
diffusée aux écrans abonnés : le panneau d'urgence de la course et les
paramètres voient les mêmes contacts. En mémoire pour la session, comme
l'historique : en production ils sont rattachés au compte côté backend, jamais
au téléphone seul — un passager qui change d'appareil ne doit pas les perdre.

`validateContact` vérifie la forme du numéro (numéros camerounais et services
courts type 117). Les mêmes règles devront être rejouées côté serveur : une
validation client seule ne protège rien (R10).

## Signalement

Motifs en liste fermée — conduite dangereuse, comportement déplacé, véhicule non
conforme, tarif abusif, autre — plutôt qu'un champ libre seul : ils se traitent
automatiquement côté back-office et évitent au passager de formuler lui-même un
fait désagréable. Le commentaire reste facultatif : l'exiger dissuaderait de
signaler.

## Écran Profil

Trois sections : **Sécurité** (contacts, assistance, partage automatique),
**Mes courses** (historique, portefeuille), **Compte** (informations,
confidentialité).

Les entrées non encore construites sont **grisées et annoncées « Bientôt »**
plutôt que masquées : elles montrent où va le produit sans faire croire qu'elles
fonctionnent (brief §23).

## États dégradés (R8)

| Situation | Comportement |
|---|---|
| Feuille de partage indisponible | Alerte « Partage indisponible » |
| Alerte non transmise | Message + renvoi vers l'appel direct |
| Composeur téléphonique indisponible | Le numéro est affiché en clair dans l'alerte |
| Aucun contact enregistré | Averti en rouge dans le profil et l'écran contacts |
| Signalement en échec | Message + « Réessayer », motif et texte conservés |
| Panneau fermé pendant un envoi | Aucun `setState` sur composant démonté |
| Position indisponible | L'alerte part quand même, « Position indisponible » |

## Simulation assumée (R13, brief §23)

Ni l'alerte ni le signalement ne partent réellement ; chaque panneau le dit.
Seuls le partage système et les appels téléphoniques sont de vraies actions.
Quand l'API arrivera, `sendEmergencyAlert` et `submitReport` deviennent des
appels backend — l'UI ne change pas.

## Reste à faire

- Partage automatique de la course à chaque départ (annoncé, non construit)
- Vérification d'identité du chauffeur et photo réelle
- Suivi de l'alerte côté assistance (back-office admin)
