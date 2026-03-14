#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BRIDGE="${MANAGER_BRIDGE_PATH:-$ROOT_DIR/scripts/manager-live-bridge.sh}"
APPEND_SCRIPT="$ROOT_DIR/scripts/append-codex-history.sh"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 \"PROJECT: <name>\n<instruction>\"" >&2
  exit 1
fi

PROMPT="$1"

# Run Codex via existing bridge (prints codex output to stdout)
"$BRIDGE" "$PROMPT"

# Auto-append latest artifacts to readable history file
if [[ -x "$APPEND_SCRIPT" ]]; then
  "$APPEND_SCRIPT" >/dev/null
else
  echo "Warning: append script missing or not executable: $APPEND_SCRIPT" >&2
fi
