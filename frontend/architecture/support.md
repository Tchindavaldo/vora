# Feature `support` — assistance passager

Ecran d'assistance du passager (brief §14) : contacter le support, questions
frequentes, litige sur une course. Simule (aucun backend).

## Pourquoi une feature separee de `safety`

La securite traite l'URGENCE et le comportement (SOS, partage de course,
signalement d'un chauffeur) ; l'assistance traite la RELATION CLIENT (une
question, un montant conteste, un objet oublie). Les melanger enterrerait le
bouton SOS sous des questions de facturation, et enverrait un litige de
facturation a l'equipe qui traite les agressions.

D'ou deux services (`services/safety.ts` et `services/support.ts`) et deux
listes de motifs qui ne se recoupent pas :

| | Signalement (`safety`) | Litige (`support`) |
|---|---|---|
| Porte sur | le chauffeur | la course |
| Motifs | conduite dangereuse, comportement deplace, vehicule non conforme, tarif abusif, autre | montant incorrect, trajet non respecte, course non effectuee, objet oublie, autre |
| Traite par | equipe securite | support client |

## Flux

```text
PROFIL -> ligne "Assistance VORA" -> ECRAN ASSISTANCE
  Nous contacter      : appel (tel:) ou mail (mailto:), jamais compose seul
  Questions frequentes: accordeon, une question ouverte a la fois
  Litige              -> choix d'une course passee -> DisputeSheet
                          motif (liste fermee) + commentaire facultatif
                          -> envoi -> accuse de reception
```

Ordre des blocs VOULU : le contact d'abord, la FAQ ensuite. Un passager qui
ouvre cet ecran a deja un probleme — lui imposer de defiler une liste de
questions avant de trouver le numero repondrait mal a son urgence. Le litige
vient en dernier : il suppose d'avoir deja roule.

## Ecrans et composants

| Fichier | Role |
|---|---|
| `SupportScreen.tsx` | Ecran plein : contact, FAQ, choix de la course a contester |
| `DisputeSheet.tsx` | Panneau du litige (copie de `ReportSheet`, R16) |
| `useSupport.ts` | Etat de l'ecran + envoi du litige (chargement / envoye / erreur, R8) |
| `../../services/support.ts` | Numeros, FAQ, motifs et envoi **simules** — seul fichier a remplacer |

Les courses proposees au litige viennent de `useTransactions` (feature
`history`) : un litige porte toujours sur une course precise, jamais « en
general ». Si cette lecture echoue, l'ecran le dit MAIS garde le numero du
support visible au-dessus — l'assistance doit rester joignable meme quand le
reste tombe (R8).

⚠️ Litige SIMULE : le panneau le dit (brief §23).

## Simulations a remplacer

- `submitDispute` -> `POST /support/disputes`.
- `FAQ_ENTRIES` -> `GET /support/faq` (contenu modifiable sans relivrer l'app).
- `SUPPORT_PHONE` / `SUPPORT_EMAIL` / `SUPPORT_HOURS` -> configuration
  d'environnement (R9).
