#!/usr/bin/env bash
# Helper partage par les hooks PreToolUse : lecture d'un champ du payload JSON.
#
# Motif : les hooks utilisaient `jq`, absent de Git Bash sur Windows. Resultat,
# ils plantaient et sortaient en `exit 0` — un hook de securite qui AUTORISE
# quand il casse (fail-open).
#
# On utilise donc `jq` s'il est disponible, `node` en repli. Si aucun des deux
# ne repond, `payload_die` fait echouer le hook en `exit 2` : il vaut mieux
# bloquer a tort que laisser passer en silence.

# payload_get <json> <chemin.jq>  ->  valeur, ou "" si absente.
# Le chemin est donne en syntaxe jq (ex. `.tool_input.file_path`).
payload_get() {
  local json="$1" path="$2"

  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$json" | jq -r "${path} // empty"
    return
  fi

  if command -v node >/dev/null 2>&1; then
    # `.a.b` -> ["a","b"] : on descend le chemin sans evaluer de code.
    printf '%s' "$json" | node -e '
      const parts = process.argv[1].replace(/^\./, "").split(".").filter(Boolean);
      let raw = "";
      process.stdin.on("data", (d) => (raw += d));
      process.stdin.on("end", () => {
        let cur;
        try { cur = JSON.parse(raw); } catch { process.exit(3); }
        for (const p of parts) {
          if (cur === null || typeof cur !== "object" || !(p in cur)) { cur = ""; break; }
          cur = cur[p];
        }
        process.stdout.write(cur === null || cur === undefined ? "" : String(cur));
      });
    ' "$path"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$json" | python3 -c '
import json, sys
parts = [p for p in sys.argv[1].lstrip(".").split(".") if p]
try:
    cur = json.load(sys.stdin)
except Exception:
    sys.exit(3)
for p in parts:
    if not isinstance(cur, dict) or p not in cur:
        cur = ""
        break
    cur = cur[p]
sys.stdout.write("" if cur is None else str(cur))
' "$path"
    return
  fi

  return 3
}

# A appeler quand le payload est illisible : on BLOQUE plutot que de laisser
# passer, pour ne pas retomber dans le fail-open decrit plus haut.
payload_die() {
  cat >&2 <<'EOF'
BLOQUE — le hook ne peut pas lire le payload JSON.

Ni `jq`, ni `node`, ni `python3` ne sont disponibles dans le PATH de ce shell.
Le hook refuse l'appel au lieu de l'autoriser en silence (un hook de securite
qui casse doit bloquer, pas ouvrir).

Corriger : installer jq (`sudo apt install jq`) ou rendre node accessible.
EOF
  exit 2
}
