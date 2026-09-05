#!/usr/bin/env bash
# Hook UserPromptSubmit — injecte CLAUDE.md + architecture/README.md EN ENTIER
# au tout premier prompt de chaque session. Execute par le harness, pas par le
# modele : la lecture ne peut donc pas etre « oubliee ».
#
# Un marqueur par session_id garantit une injection unique (pas a chaque message).

set -euo pipefail

payload=$(cat)

session_id=$(printf '%s' "$payload" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
project_dir=$(printf '%s' "$payload" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -n "$project_dir" ] || project_dir="$CLAUDE_PROJECT_DIR"

marker_dir="${TMPDIR:-/tmp}/claude-session-start"
marker="$marker_dir/${session_id:-unknown}"
mkdir -p "$marker_dir"

# Deja injecte pour cette session -> ne rien faire.
[ -f "$marker" ] && exit 0
touch "$marker"

claude_md="$project_dir/CLAUDE.md"
arch_md="$project_dir/architecture/README.md"

claude_lines=0; arch_lines=0; rules=0
[ -f "$claude_md" ] && claude_lines=$(wc -l < "$claude_md" | tr -d ' ') \
  && rules=$(grep -c '^## R[0-9]\+ — ' "$claude_md" || true)
[ -f "$arch_md" ] && arch_lines=$(wc -l < "$arch_md" | tr -d ' ')

echo "=== LECTURE DE FOND EN COMBLE (hook session-start, injection automatique) ==="
echo "Les fichiers ci-dessous sont fournis INTEGRALEMENT. Applique-les"
echo "immediatement, des cette premiere reponse. Ne les resume pas."
echo
echo "ACCUSE OBLIGATOIRE — commence ta toute premiere reponse de cette session"
echo "par cette ligne EXACTE, seule sur sa ligne, puis reponds normalement :"
echo
echo "✅ CLAUDE.md lu en entier (${claude_lines} l., ${rules} règles R1→R${rules}) + architecture/README.md (${arch_lines} l.)"
echo

if [ -f "$claude_md" ]; then
  echo "----- BEGIN CLAUDE.md (${claude_lines} lignes) -----"
  cat "$claude_md"
  echo "----- END CLAUDE.md -----"
else
  echo "⚠️ CLAUDE.md introuvable à $claude_md"
fi
echo

if [ -f "$arch_md" ]; then
  echo "----- BEGIN architecture/README.md (${arch_lines} lignes) -----"
  cat "$arch_md"
  echo "----- END architecture/README.md -----"
else
  echo "⚠️ architecture/README.md introuvable à $arch_md"
  echo "   R3/R14 : ce fichier est obligatoire. Le creer avant de coder."
fi
echo

# Rappel du brief hackathon — non injecte en entier (trop long), mais son
# existence et sa primaute doivent etre rappelees a chaque session.
brief="$project_dir/# NUXCINE HACKATON 2026.md"
if [ -f "$brief" ]; then
  echo "----- RAPPEL BRIEF -----"
  echo "Le cahier des charges du jury est : '# NUXCINE HACKATON 2026.md'"
  echo "($(wc -l < "$brief" | tr -d ' ') lignes, a la racine du projet)."
  echo "Il PRIME sur toute preference technique. Le lire avec Read avant toute"
  echo "decision produit (fonctionnalite, innovation, livrable, criteres §25)."
  echo "----- FIN RAPPEL BRIEF -----"
  echo
fi

echo "=== FIN LECTURE OBLIGATOIRE ==="
