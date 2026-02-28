#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${1:-}"
PHASE="${2:-manual}"
CONFIG_PATH="${3:-}"

if [[ -z "$PROJECT_ROOT" ]]; then
  echo "usage: artifact-normalize.sh <project_root> [phase] [config_path]" >&2
  exit 2
fi

CANON_ROOT="$PROJECT_ROOT/docs/evidence"
INDEX_JSON="$CANON_ROOT/artifact-index.json"
INDEX_MD="$CANON_ROOT/artifact-index.md"
MIRROR_ROOT="$CANON_ROOT/_normalized"
mkdir -p "$CANON_ROOT" "$MIRROR_ROOT"

# Default sources (project-relative)
SOURCES=(
  "docs/evidence"
  "docs/qa"
  "frontend/artifacts"
  "frontend/docs/evidence"
)

if [[ -n "$CONFIG_PATH" && -f "$CONFIG_PATH" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_PATH"
  if [[ ${#ARTIFACT_SOURCES[@]:-0} -gt 0 ]]; then
    SOURCES=("${ARTIFACT_SOURCES[@]}")
  fi
fi

STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TMP_JSON="$(mktemp)"
TMP_MD="$(mktemp)"

{
  echo "{"
  echo "  \"generatedAt\": \"$STAMP\","
  echo "  \"phase\": \"$PHASE\","
  echo "  \"projectRoot\": \"$PROJECT_ROOT\","
  echo "  \"canonicalRoot\": \"$CANON_ROOT\","
  echo "  \"entries\": ["

  first=1
  for src in "${SOURCES[@]}"; do
    src_abs="$PROJECT_ROOT/$src"
    [[ -d "$src_abs" ]] || continue

    # Avoid recursion from canonical mirror
    if [[ "$src" == "docs/evidence" ]]; then
      find_cmd=(find "$src_abs" -type f ! -path "$src_abs/_normalized/*" ! -name "artifact-index.json" ! -name "artifact-index.md")
    else
      find_cmd=(find "$src_abs" -type f)
    fi

    while IFS= read -r file; do
      rel="${file#$PROJECT_ROOT/}"
      label="$(echo "$src" | tr '/ ' '__')"
      dest="$MIRROR_ROOT/$label/$rel"
      mkdir -p "$(dirname "$dest")"
      cp -fp "$file" "$dest"
      dest_rel="${dest#$PROJECT_ROOT/}"

      [[ $first -eq 1 ]] || echo ","
      first=0
      printf '    {"source":"%s","canonical":"%s"}' "$rel" "$dest_rel"
    done < <("${find_cmd[@]}" | sort)
  done

  echo
  echo "  ]"
  echo "}"
} > "$TMP_JSON"

{
  echo "# Artifact Index"
  echo
  echo "Generated: $STAMP"
  echo "Phase: $PHASE"
  echo "Project: $PROJECT_ROOT"
  echo
  echo "| Source | Canonical |"
  echo "|---|---|"
  jq -r '.entries[] | "| `\(.source)` | `\(.canonical)` |"' "$TMP_JSON"
} > "$TMP_MD"

mv "$TMP_JSON" "$INDEX_JSON"
mv "$TMP_MD" "$INDEX_MD"

echo "[artifact-normalize] phase=$PHASE entries=$(jq '.entries|length' "$INDEX_JSON") index=$INDEX_JSON"
