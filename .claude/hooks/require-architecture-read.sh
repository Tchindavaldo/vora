#!/usr/bin/env bash
# PreToolUse — deux protections :
#   1. (R2) bloque tout acces au backend sans autorisation explicite ;
#   2. (R3) bloque toute recherche (Grep/Glob/grep-shell) tant que l'agent n'a
#      pas lu le architecture/<feature>.md CORRESPONDANT a la cible, et interdit
#      les agents d'exploration.
#
# Motif (R3) : lire un seul architecture/*.md (ex. README.md) une fois par
# session ne dit rien sur l'ecran/la feature reellement grep-ee ensuite. On
# exige donc la lecture du doc de la feature concernee, par feature.
#
# Detection AUTOMATIQUE, sans liste codee en dur : la feature est deduite du
# chemin cible (segment apres src/features/, src/services/, app/, pages/).
# Une feature qui n'a pas encore de architecture/*.md n'est simplement pas
# couverte par le hook -> pas de blocage sur elle, rien a maintenir a chaque
# nouvelle feature.
#
# Le marqueur vit dans /tmp, cle par session ET par feature : il disparait a
# chaque nouvelle session, et chaque feature doit etre lue une fois.

set -uo pipefail

# shellcheck source=lib-payload.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib-payload.sh"

payload=$(cat)

tool=$(payload_get "$payload" '.tool_name') || payload_die
session=$(payload_get "$payload" '.session_id') || payload_die
[ -z "$session" ] && session="nosession"
marker_dir="/tmp/claude-arch-read-${session}"
arch_dir="${CLAUDE_PROJECT_DIR:-.}/architecture"

# --- R2 : perimetre backend -------------------------------------------------
# L'utilisateur peut lever le blocage pour la session en creant le fichier
# marqueur (voir le message ci-dessous).
backend_allow="/tmp/claude-backend-ok-${session}"

is_backend_path() {
  printf '%s' "$1" | grep -qiE '(^|/)(backend|server|api-server)(/|$)'
}

deny_backend() {
  cat >&2 <<EOF
BLOQUE (R2) — acces au backend sans autorisation explicite.

Cible : ${1}

R2 : « Interdit d'ouvrir, lire, explorer ou modifier backend/ sans demande ou
autorisation EXPLICITE de l'utilisateur. » Meme « juste pour comprendre » ou
« pour verifier un contrat d'API ».

Le travail par defaut se fait uniquement dans le frontend. Si un contrat backend
est necessaire, demande-le a l'utilisateur, ou fais un \`curl\` sur l'endpoint —
jamais lire le code source.

Si l'utilisateur t'a DEJA autorise, il peut lever le blocage pour cette session :
  touch ${backend_allow}
EOF
  exit 2
}
# ---------------------------------------------------------------------------

# --- Deduit le nom de doc feature (sans .md) depuis un chemin/pattern, en ne
# se basant QUE sur la structure du repo, puis en verifiant qu'un
# architecture/<x>.md existe reellement. ---
feature_of() {
  local s="$1" candidate=""

  if [[ "$s" =~ src/features/([a-zA-Z0-9_-]+) ]]; then
    candidate="${BASH_REMATCH[1]}"
  elif [[ "$s" =~ src/services/([a-zA-Z0-9_-]+) ]]; then
    candidate="${BASH_REMATCH[1]}"
  elif [[ "$s" =~ \((tabs|auth|passenger|driver|admin)\)/([a-zA-Z0-9_-]+)\.(tsx|ts|jsx|js|vue) ]]; then
    candidate="${BASH_REMATCH[2]}"
  elif [[ "$s" =~ (app|pages|views|screens)/([a-zA-Z0-9_-]+) ]]; then
    candidate="${BASH_REMATCH[2]}"
  fi

  [ -z "$candidate" ] && return

  # Le nom du dossier/fichier de code ne colle pas toujours 1:1 au nom du doc
  # (ex. feature "ride" -> ride-passenger.md / ride-driver.md). On cherche donc
  # tout architecture/*.md dont le nom COMMENCE par le candidat.
  local match
  match=$(find "$arch_dir" -maxdepth 1 -iname "${candidate}*.md" 2>/dev/null | head -1)
  [ -z "$match" ] && return
  basename "$match" .md
}

mkdir -p "$marker_dir" 2>/dev/null

# --- Cas 1 : Read ---
# Un architecture/*.md lu -> on pose le marqueur pour CETTE feature.
# Un chemin backend -> R2.
if [ "$tool" = "Read" ]; then
  path=$(payload_get "$payload" '.tool_input.file_path') || payload_die
  if is_backend_path "$path" && [ ! -f "$backend_allow" ]; then
    deny_backend "$path"
  fi
  case "$path" in
    */architecture/*.md)
      base=$(basename "$path" .md)
      : > "$marker_dir/$base"
      ;;
  esac
  exit 0
fi

# --- Cas 2 : agent d'exploration -> INTERDIT sans condition (R3) ---
#
# R3 interdit de lancer un agent pour "decouvrir" le projet : architecture/ est
# ecrit precisement pour ca. Aucun marqueur ne leve ce blocage — contrairement
# aux recherches, il n'y a pas de lecture prealable qui rendrait l'agent
# legitime. Les agents non exploratoires (ex. statusline-setup) passent.
if [ "$tool" = "Agent" ] || [ "$tool" = "Task" ]; then
  subagent=$(payload_get "$payload" '.tool_input.subagent_type') || payload_die
  case "$subagent" in
    Explore|general-purpose|Plan|claude)
      cat >&2 <<EOF
BLOQUE (R3) — agent "${subagent}" lance pour explorer le projet.

R3 : « INTERDIT : lancer un agent Explore pour "decouvrir" le projet. »
architecture/README.md et les .md par feature sont ecrits pour eviter cette
perte de temps. Lis-les avec Read direct (1 seul appel), c'est suffisant.

Un agent ne se justifie QUE pour une recherche ultra-precise introuvable dans
architecture/ (ex. une signature de fonction exacte) — et dans ce cas, fais la
recherche toi-meme avec Grep plutot que de deleguer.
EOF
      exit 2
      ;;
  esac
  exit 0
fi

# --- Cas 3 : recherche -> R2 puis feature/marqueur ---
target=""
case "$tool" in
  Grep|Glob)
    pattern=$(payload_get "$payload" '.tool_input.pattern') || payload_die
    gpath=$(payload_get "$payload" '.tool_input.path') || payload_die
    target="${pattern} ${gpath}"
    [ -n "$gpath" ] && is_backend_path "$gpath" && [ ! -f "$backend_allow" ] \
      && deny_backend "$gpath"
    ;;
  Bash)
    cmd=$(payload_get "$payload" '.tool_input.command') || payload_die
    case "$cmd" in
      *grep*|*"rg "*|*"find "*|*"cat "*|*"ls "*) target="$cmd" ;;
      *) exit 0 ;;
    esac
    if is_backend_path "$cmd" && [ ! -f "$backend_allow" ]; then
      deny_backend "$cmd"
    fi
    ;;
  *)
    exit 0
    ;;
esac

feature=$(feature_of "$target")

# Chemin non reconnu (recherche generique, config...) -> pas de blocage.
if [ -z "$feature" ]; then
  # Sous-cas : le chemin DESIGNE bien une feature, mais elle n'a aucun
  # architecture/*.md. Le hook ne peut rien exiger — on le SIGNALE au lieu de
  # laisser passer en silence, sinon une feature non documentee reste un angle
  # mort permanent.
  raw=""
  if [[ "$target" =~ src/features/([a-zA-Z0-9_-]+) ]]; then
    raw="${BASH_REMATCH[1]}"
  fi
  if [ -n "$raw" ]; then
    cat >&2 <<EOF
NOTE (R3) — la feature "${raw}" n'a pas de architecture/${raw}*.md.

La recherche est autorisee (rien a exiger), mais R14 demande que chaque feature
soit documentee. Pense a creer architecture/${raw}.md et a l'ajouter a l'index
de architecture/README.md.
EOF
  fi
  exit 0
fi

# Marqueur deja pose pour CETTE feature -> ok.
[ -f "$marker_dir/$feature" ] && exit 0

cat >&2 <<EOF
BLOQUE (R3) — recherche sur la feature "${feature}" avant d'avoir lu son architecture.

Recherche refusee : ${target}

Lis d'abord architecture/${feature}.md avec l'outil Read (architecture/README.md
donne l'index general). Chaque feature grep-ee doit avoir son doc lu au moins
une fois dans la session, pas seulement un README generique.

Une fois architecture/${feature}.md lu, les recherches sur CETTE feature sont
autorisees pour le reste de la session.
EOF
exit 2
