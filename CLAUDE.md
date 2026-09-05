# Consignes projet — VORA (Hackathon NuxCine 2026)

Ce fichier est **versionné** : ses règles s'appliquent automatiquement sur tout
PC où le projet est cloné/pull, dans n'importe quelle session Claude Code.

Contexte produit : `# NUXCINE HACKATON 2026.md` (brief officiel du hackathon) —
48 h, MVP d'une solution de mobilité intelligente adaptée au contexte camerounais.
Trois systèmes : **Passager**, **Chauffeur**, **Administration**.

> **18 règles numérotées R1 → R18.** Toute nouvelle règle ajoutée à ce fichier
> DOIT recevoir le numéro suivant (R19, R20, …) et le total ci-dessus doit être
> mis à jour. On cite une règle par son numéro (ex. « R1 » pour le style de réponse).

## R1 — Style de réponse (OBLIGATOIRE)

**Réponses COURTES.** Aller droit au but : le résultat, pas le cheminement.

- Pas de récapitulatif exhaustif des fichiers modifiés ni de tableaux explicatifs
  si l'utilisateur ne les demande pas. Quelques lignes suffisent.
- Ne pas reformuler la demande, ne pas annoncer ce qu'on va faire : le faire.
- Signaler un problème réel en 1 phrase, sans développer les alternatives.
- Répondre à une question posée = la réponse seule, sans contexte superflu.

**Plafonds DURS** (non négociables, y compris après un gros travail) :

| Type de message | Plafond |
|---|---|
| Question fermée (oui/non, « as-tu touché à X ? ») | **1 à 2 phrases**, la réponse et rien d'autre |
| Compte rendu après modif de code | **3 lignes MAX** |
| Explication demandée explicitement | **10 lignes MAX** |

**INTERDIT sauf demande explicite** :
- Lister les fichiers modifiés avec liens et numéros de ligne — l'utilisateur a le diff.
- Citer des extraits de code déjà écrits, ou expliquer *comment* on a codé.
- Les sections « Conséquences », « À valider », « Note », « Ce que je n'ai pas fait ».
- Proposer la suite du travail (« Tu veux que je… ? ») : s'arrêter après le résultat.
- Les puces qui détaillent chaque changement une par une.

> ⚠️ Après une modification, la réponse par défaut est **une seule phrase** disant
> ce qui marche maintenant. Rien de plus. Si un vrai blocage existe, l'ajouter en
> 1 phrase. Un travail long ne justifie JAMAIS une réponse longue.

## R2 — Périmètre : NE JAMAIS aller dans le backend sans permission (OBLIGATOIRE)

**Interdit d'ouvrir, lire, explorer ou modifier `backend/` (ou `../backend/`,
`api/`, `server/`) sans demande ou autorisation EXPLICITE de l'utilisateur.**
Pas de `Read`, pas de `grep`, pas d'agent, même « juste pour comprendre » ou
« pour vérifier un contrat d'API ».

- Le travail par défaut se fait UNIQUEMENT dans le frontend (app passager /
  chauffeur / dashboard admin).
- Si un contrat backend est nécessaire, l'utilisateur le fournit. À défaut,
  faire un `curl` sur l'endpoint — jamais lire le code source du backend.
- En cas de doute réel et bloquant : demander la permission, puis attendre.

## R3 — À lire en DÉBUT de session (OBLIGATOIRE)

> **AU TOUT PREMIER MESSAGE de chaque conversation**, le hook
> `.claude/hooks/session-start-read.sh` (déclaré dans `.claude/settings.json`)
> injecte automatiquement **ce fichier** et `architecture/README.md` en entier.
> La lecture est garantie côté harness — rien à invoquer, aucun `Read` à faire.
>
> **Accusé obligatoire** : la toute première réponse de la session doit commencer
> par la ligne fournie par le hook, seule sur sa ligne :
> `✅ CLAUDE.md lu en entier (N l., 18 règles R1→R18) + architecture/README.md (M l.)`
> Absence de cette ligne = hook non déclenché : le signaler et le réparer.

Lis **`architecture/README.md`** (à la racine) avant de travailler : il donne une
vision 360 du projet (structure des fichiers, features isolées, contextes, hooks).

**⚠️ INTERDIT : lancer un agent Explore pour "découvrir" le projet.**
`architecture/README.md` et les fichiers `.md` par feature ont été rédigés
précisément pour éviter cette perte de temps. Lis avec `Read` direct (1 seul appel
outil) — c'est suffisant. Ne lance un agent Explore ou `grep`/`find` supplémentaire
QUE si tu cherches quelque chose d'ultra-précis introuvable dans `architecture/`
(ex. une signature de fonction exacte). Pas pour "comprendre le projet".

**Brief hackathon** : avant toute décision produit (fonctionnalité, innovation,
livrable, critère d'évaluation), relire `# NUXCINE HACKATON 2026.md`. C'est le
cahier des charges du jury — il prime sur les préférences techniques.

**Tenir à jour** : dès qu'un travail modifie la structure (nouveau fichier,
composant, hook, feature) ou rend une description obsolète, **mets à jour**
`architecture/README.md` et les fichiers `.md` concernés avant de clore.

## R4 — Architecture & modularité (OBLIGATOIRE)

L'architecture doit rester **propre, moderne, modulaire**, même sous contrainte
de 48 h. Règles non négociables :

- **Taille de fichier : viser ~400 lignes, 500 = plafond DUR.** Au-delà de 500,
  découper obligatoirement. Un fichier doit se lire d'un coup (par un humain ET
  par l'agent qui doit le parcourir). Si un fichier que tu touches dépasse,
  scinde-le avant de clore.
- **Un fichier = une responsabilité claire.** On découpe en modules par domaine ;
  on n'empile jamais dans un gros fichier fourre-tout.
- **Features isolées sous `src/features/`** : chaque feature (auth, map, booking,
  ride, driver, payment, safety, admin…) vit dans son dossier avec ses hooks,
  components et types locaux.
- **Contextes pour l'état partagé** : AuthContext, RideContext, LocationContext,
  SocketContext. Pas de props drilling.
- **Hooks/services partagés sous `src/services/`** : appels API, socket, géoloc,
  notifications.
- **Séparation des trois rôles** (passager / chauffeur / admin) au niveau des
  routes et des features. Un écran passager ne dépend jamais d'un écran chauffeur.

## R5 — Convention de branches Git (OBLIGATOIRE)

> ⚠️ Cette section parle **exclusivement de branches Git** (`git checkout -b ...`).
> Elle n'a rien à voir avec l'organisation des dossiers/features dans le code.
> Quand on dit "isoler un travail", on parle de **l'isoler sur sa propre branche Git**.

**Règle d'or : tout travail de changement — moyen ou important — doit se faire sur
une NOUVELLE branche Git créée AVANT de toucher au code.** Ne jamais coder
directement sur `main`. Avant la moindre modification non triviale, créer la
branche avec le bon préfixe, puis travailler dessus.

Sont concernés (liste non exhaustive) : nouvelle feature, refacto, ajout/duplication
de composant, modification d'un flux, correction de bug. Seules les retouches
ultra-mineures (typo, commentaire, log) peuvent rester sur la branche courante.

Toujours préfixer les branches selon leur nature :

- `debug/<sujet>` — **investigation/résolution d'un bug précis**. Une branche par
  bug. Ex: `debug/route-calculation`, `debug/socket-reconnection`.
- `feature/<sujet>` — nouvelle fonctionnalité ou durcissement d'une feature.
  Ex: `feature/authentication`, `feature/map`, `feature/booking`, `feature/driver`,
  `feature/security`, `feature/ai`.
- `backup/<sujet>` — sauvegarde d'un état (ne pas y travailler).

Règles de création :
- **Tout travail de debug** commence sur une branche `debug/`, créée depuis la
  branche d'où vient le problème (pas depuis `main`).
- **Tout travail de feature / changement moyen ou important** commence sur une
  branche `feature/`, créée depuis `develop` (ou `main` à défaut).
- Une branche = un sujet. Ne pas mélanger plusieurs travaux sur la même branche.

**Commits** : format conventionnel exigé par le brief (§16) —
`feat: add ride booking`, `fix: correct route calculation`, `docs: update guide`.
Chaque membre de l'équipe doit apparaître dans l'historique : le jury évalue les
contributions GitHub (§25).

## R6 — État & Contextes (OBLIGATOIRE)

**Les contextes sont la source de vérité** pour l'état partagé. Règles :

- **AuthContext** : user connecté, rôle (passager / chauffeur / admin), tokens,
  refresh logic.
- **RideContext** : course en cours, statut (recherche → acceptée → en cours →
  terminée), historique.
- **LocationContext** : position courante, permissions géoloc, départ,
  destination, itinéraire calculé.
- **SocketContext** : connexion temps réel, rooms, handlers d'événements course.

**Ne JAMAIS** :
- Stocker l'état partagé en dehors des contextes (pas de singletons globaux, pas
  de Redux sans raison).
- Bypasser un contexte avec un stockage local pour de l'état temps réel.
- Props drilling sur plus de 2 niveaux — utiliser un contexte.

## R7 — Tests & Validation (OBLIGATOIRE avant démo)

Le jury teste le parcours principal. Avant de considérer une feature finie :

- **Parcours passager complet** : inscription → connexion → géoloc → destination
  → itinéraire → estimation prix → demande → chauffeur trouvé → suivi → fin →
  paiement → évaluation.
- **Parcours chauffeur** : connexion → disponibilité → réception demande →
  acceptation → navigation → fin de course.
- **Cas d'erreur (R8)** : pas d'Internet, géoloc refusée, aucun chauffeur
  disponible, API en échec, course annulée.
- **Responsive** : vérifier sur plusieurs tailles d'écran.
- Une application qui ne fonctionne que dans le scénario idéal sera pénalisée
  (brief §20).

## R8 — Gestion des erreurs (OBLIGATOIRE)

Toute fonction qui touche au réseau, à la géoloc ou au paiement doit prévoir
l'échec et **afficher un message clair à l'utilisateur** :

- absence de connexion Internet (contexte camerounais : connectivité instable —
  prévoir un mode dégradé / cache local quand c'est pertinent) ;
- localisation refusée ou indisponible ;
- destination invalide / non géocodable ;
- aucun chauffeur disponible ;
- course annulée par l'une des parties ;
- erreur serveur, API cartographique indisponible ;
- paiement échoué.

**Pas de `try-catch` sans gestion d'erreur** : toujours un feedback utilisateur
(toast / écran d'état) + un log exploitable. Jamais un échec silencieux.

## R9 — Secrets & Configuration (OBLIGATOIRE — critère jury)

Le brief (§10.4, §23) sanctionne explicitement les secrets commités.

- `.env` est **gitignoré** et ne doit JAMAIS être commité.
- Un `.env.example` **doit** exister à la racine, avec toutes les clés vides :
  `MAP_API_KEY=`, `DATABASE_URL=`, `AI_API_KEY=`, `JWT_SECRET=`…
- Aucune clé API, aucun token, aucun mot de passe en dur dans le code. Tout passe
  par une config centralisée (ex. `src/config/env.ts`) qui lit l'environnement.
- Les clés à coût (cartographie, IA, paiement) ne sont **jamais exposées au
  frontend** : les appels sensibles passent par le backend.
- Avant tout commit, vérifier qu'aucun secret n'a fuité dans le diff.

## R10 — Sécurité applicative (OBLIGATOIRE — critère jury)

La sécurité est un critère d'évaluation à part entière (brief §10, §25).

**Comptes** : mots de passe hachés (jamais en clair), validation des entrées côté
serveur ET client, sessions/tokens expirables, contrôle d'accès par rôle
(passager / chauffeur / admin strictement séparés), protection des données
personnelles.

**Passager** : bouton SOS, partage de course/position, informations vérifiées sur
le chauffeur, identification du véhicule, contact d'urgence, signalement.

**Chauffeur** : signalement d'un passager, alerte d'urgence, contact assistance,
protection de ses informations personnelles.

**Technique** : validation des entrées, protection des routes API (auth +
autorisation), limitation des accès aux ressources, pas de donnée sensible dans
les logs.

Ne jamais implémenter une route qui expose des données d'un utilisateur à un
autre rôle sans contrôle explicite.

## R11 — Cartographie & géolocalisation

- Le choix de la solution (Mapbox / Google Maps / OpenStreetMap) est libre mais
  doit être **justifiable** (brief §4.2) : documenter le pourquoi dans
  `architecture/README.md`.
- Encapsuler le fournisseur derrière un service (`src/services/maps.ts`) : aucun
  composant n'appelle directement le SDK. Changer de fournisseur ne doit toucher
  qu'un fichier.
- Toujours gérer : permission refusée, position indisponible, timeout, quota API
  dépassé.
- Contexte local : prévoir les repères géographiques informels et les zones mal
  cartographiées — un champ « point de repère » libre vaut mieux qu'une adresse
  imposée.

## R12 — API & appels réseau

- Base URL depuis la config d'environnement, jamais en dur.
- Encapsuler chaque appel API dans un hook dédié (`useAuth`, `useRide`,
  `useDrivers`…), jamais d'appel réseau brut dans un composant.
- Gérer systématiquement : loading, succès, erreur (R8).
- Prévoir les timeouts et un retry raisonnable sur les appels critiques
  (connectivité instable).

## R13 — Paiement

Un paiement **simulé est explicitement acceptable** pour le hackathon (brief §8).

- Le simulateur doit être isolé dans son propre service et clairement signalé
  comme simulé dans l'UI de démo — jamais présenter du faux comme du réel
  (brief §23).
- Ordre logique : valider la course → créer la commande/course côté backend →
  déclencher le paiement → afficher l'état → écouter/poller le verdict →
  afficher le résultat.
- Espèces, portefeuille virtuel et paiement électronique doivent pouvoir coexister
  derrière la même interface de service.
- Historique des transactions et calcul des revenus chauffeur : dérivés du
  backend, jamais recalculés côté client comme source de vérité.

## R14 — Documentation (OBLIGATOIRE — livrable noté)

Le `README.md` est un **livrable obligatoire** (brief §17, §19) et un critère
d'évaluation. Il doit contenir les 20 sections du brief §19, dont au minimum :
présentation, problème, solution, fonctionnalités, innovation, sécurité,
architecture, technologies, installation, configuration, variables
d'environnement, base de données, lancement, comptes de démonstration, structure,
API utilisées, limites, membres de l'équipe, lien Figma, démonstration.

Le manuel de démarrage doit répondre à : « **Je viens de cloner votre dépôt.
Que dois-je faire pour lancer votre projet ?** » — commandes exactes, dans
l'ordre, sans étape implicite.

Après toute modif des features/hooks/components, **mettre à jour** :
- `architecture/README.md` : index, stack, structure
- `architecture/<feature>.md` : si la feature change (hooks, props, flux)
- `README.md` : si l'installation, la config ou les fonctionnalités changent

## R15 — Emojis : statut SEULEMENT (OBLIGATOIRE)

**Aucun emoji décoratif**, nulle part : ni dans le code, ni dans les commentaires,
ni dans la doc technique, ni dans les logs, ni dans les messages de commit.

INTERDIT (décoratif) : `⭐` `📏` `🚨` `🎉` `🎬` `🎁` `🚀` `🔔` `🚖` `🛵` `★` `➕`…
Pour mettre en avant, utiliser du **texte** (`IMPORTANT`, `NOTE`, `OBLIGATOIRE`)
ou le gras Markdown. Une icône d'interface passe par une bibliothèque d'icônes,
jamais par un caractère emoji.

AUTORISÉ (statut, valeur sémantique) : `⚠️` avertissement · `✅` / `✓` succès ·
`❌` erreur · `✕` fermeture. Ils portent une information lue d'un coup d'œil dans
les logs, les tableaux de doc et les encadrés — on les garde.

> Exception : le `README.md` public et les supports de présentation destinés au
> jury peuvent garder les emojis du brief. Le code et la doc technique, non.
> Un emoji décoratif croisé dans un fichier de code qu'on touche = le retirer
> avant de clore, même s'il était déjà là.

## R16 — Jamais de composant partagé entre écrans (OBLIGATOIRE)

**Ne JAMAIS modifier un composant utilisé par un autre écran pour les besoins
de l'écran courant. On DUPLIQUE, toujours.**

Quand un écran a besoin d'un composant qui existe déjà ailleurs (overlay, carte,
card, bottom sheet, ligne de validation…), on en fait une **copie dédiée** dans le
dossier de la feature courante, puis on l'adapte librement. On n'ajoute pas de
prop `variant`/`mode` à l'original pour couvrir les deux cas.

- Pourquoi : une prop ajoutée « juste pour ce cas » fait porter à l'original le
  risque de casser l'écran d'origine à chaque évolution. Deux écrans qui se
  ressemblent aujourd'hui divergent demain. En 48 h, une régression sur un écran
  déjà validé coûte plus cher que la duplication.
- Nommage : préfixer la copie par le domaine (`DriverRideOverlay` copié de
  `RideOverlay`), et le dire en commentaire d'en-tête.
- La duplication vaut pour les **composants** (rendu/UI). Les **services purs** et
  utilitaires sans état (calcul de distance, formatage de prix, géocodage…)
  restent partagés : ils n'ont pas de rendu à faire diverger.
- Un fichier dupliqué reste soumis à R4 : s'il dépasse 500 lignes, le découper.

## R17 — MVP d'abord (OBLIGATOIRE — contrainte 48 h)

Le brief (§27) est explicite : « Une petite solution qui fonctionne parfaitement
sera généralement plus convaincante qu'une immense solution à moitié terminée. »

Ordre de priorité non négociable :

1. authentification → 2. carte → 3. destination → 4. itinéraire →
5. estimation prix → 6. réservation → 7. chauffeur → 8. suivi →
9. **une** fonctionnalité innovante → 10. sécurité → 11. tests → 12. documentation

**Ne jamais commencer une feature de la couche N+1 tant que la couche N n'est pas
fonctionnelle de bout en bout.** Ne pas ajouter de fonctionnalité hors de cette
liste sans demande explicite de l'utilisateur : le jury pénalise les
fonctionnalités inutiles et incomplètes (brief §11, §23).

Si une demande implique du scope au-delà du MVP, le signaler en 1 phrase (R1) et
faire ce qui est demandé.

## R18 — Compréhension par l'équipe (OBLIGATOIRE)

Le brief (§22) exige que chaque membre puisse expliquer le code, l'architecture et
les choix techniques. L'IA accompagne, elle ne remplace pas l'équipe.

En conséquence, dans ce projet :

- **Pas de solution « magique »** : privilégier le code lisible et explicite à
  l'astuce concise. Un pattern non évident doit porter un commentaire d'en-tête
  expliquant le *pourquoi*.
- **Pas de dépendance ajoutée sans nécessité** : chaque bibliothèque doit être
  justifiable devant le jury (§4.2). En cas de doute, préférer une implémentation
  maison courte.
- **Pas d'abstraction anticipée** : on n'introduit une couche générique que
  lorsqu'un deuxième cas réel l'exige.
- Documenter dans `architecture/<feature>.md` le flux de chaque feature livrée,
  pour que l'équipe puisse le relire avant la soutenance.
