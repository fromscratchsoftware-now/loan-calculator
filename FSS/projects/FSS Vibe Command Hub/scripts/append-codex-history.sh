#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNS_DIR="$ROOT_DIR/docs/chat-history/codex-runs"
OUT_FILE="$ROOT_DIR/docs/chat-history/CODEX_CHAT_HISTORY.md"

LATEST_META="$RUNS_DIR/latest.meta.json"
LATEST_PROMPT="$RUNS_DIR/latest.prompt.txt"
LATEST_RESPONSE="$RUNS_DIR/latest.response.txt"

mkdir -p "$(dirname "$OUT_FILE")"

if [[ ! -f "$LATEST_PROMPT" || ! -f "$LATEST_RESPONSE" ]]; then
  echo "Missing latest prompt/response artifacts in $RUNS_DIR" >&2
  exit 1
fi

if [[ ! -f "$OUT_FILE" ]]; then
  {
    echo "# Codex Chat History"
    echo
    echo "Append-only readable timeline (timestamp + prompt + response)."
    echo
  } > "$OUT_FILE"
fi

RUN_TS="$(date '+%Y-%m-%d %H:%M:%S %Z')"
RUN_ID="unknown"

if [[ -f "$LATEST_META" ]]; then
  RUN_ID="$(grep -E '"runId"\s*:' "$LATEST_META" | head -n1 | sed -E 's/.*"runId"\s*:\s*"([^"]+)".*/\1/' || true)"
  [[ -z "$RUN_ID" ]] && RUN_ID="unknown"
fi

{
  echo "---"
  echo
  echo "## Run: $RUN_TS"
  echo
  echo "Run ID: $RUN_ID"
  echo
  echo "### Prompt"
  echo
  echo '```text'
  cat "$LATEST_PROMPT"
  echo
  echo '```'
  echo
  echo "### Response"
  echo
  echo '```text'
  cat "$LATEST_RESPONSE"
  echo
  echo '```'
  echo
} >> "$OUT_FILE"

echo "Appended latest run to $OUT_FILE"
