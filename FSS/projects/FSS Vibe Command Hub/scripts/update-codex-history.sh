#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNS_DIR="$ROOT_DIR/docs/chat-history/codex-runs"
OUT_FILE="$ROOT_DIR/docs/chat-history/CODEX_CHAT_HISTORY.md"

mkdir -p "$(dirname "$OUT_FILE")"

{
  echo "# Codex Chat History (Aggregated)"
  echo
  echo "Auto-generated from \`docs/chat-history/codex-runs/*.prompt.txt\` + matching response files."
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo
}
> "$OUT_FILE"

shopt -s nullglob
prompts=$(ls -1 "$RUNS_DIR"/*.prompt.txt 2>/dev/null | sort || true)

while IFS= read -r prompt; do
  [[ -z "$prompt" ]] && continue
  base="${prompt%.prompt.txt}"
  ts="$(basename "$base")"
  response="$base.response.txt"

  {
    echo "---"
    echo
    echo "## Run: $ts"
    echo
    echo "### Prompt"
    echo
    echo '```text'
    cat "$prompt"
    echo
    echo '```'
    echo
    echo "### Response"
    echo
    echo '```text'
    if [[ -f "$response" ]]; then
      cat "$response"
    else
      echo "[missing response file]"
    fi
    echo
    echo '```'
    echo
  } >> "$OUT_FILE"
done <<< "$prompts"

echo "Wrote $OUT_FILE"
