#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_env_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  while IFS='=' read -r key value; do
    [[ -z "${key:-}" ]] && continue
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    key="${key%%[[:space:]]*}"
    value="${value:-}"
    value="${value#\"}"
    value="${value%\"}"
    [[ -n "$key" ]] && export "$key=$value"
  done < "$f"
}

load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.local"
load_env_file "$ROOT_DIR/.env.example"

BASE_URL="${CLOUDFLARE_LIVE_BASE_URL:-}"
PREVIEW_URL="${CLOUDFLARE_PREVIEW_URL:-}"
PROVIDER="${LIVE_TEST_PROVIDER:-cloudflare}"

fail=0

if [[ "$PROVIDER" != "cloudflare" ]]; then
  echo "FAIL: LIVE_TEST_PROVIDER must be 'cloudflare' (current: '$PROVIDER')."
  fail=1
fi

if [[ -z "$BASE_URL" ]]; then
  echo "FAIL: CLOUDFLARE_LIVE_BASE_URL is required."
  fail=1
elif [[ ! "$BASE_URL" =~ ^https:// ]]; then
  echo "FAIL: CLOUDFLARE_LIVE_BASE_URL must start with https://"
  fail=1
fi

if [[ -n "$PREVIEW_URL" && ! "$PREVIEW_URL" =~ ^https:// ]]; then
  echo "FAIL: CLOUDFLARE_PREVIEW_URL must start with https:// when set."
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "PASS: Cloudflare live-testing baseline is configured."
echo "- LIVE_TEST_PROVIDER=$PROVIDER"
echo "- CLOUDFLARE_LIVE_BASE_URL=$BASE_URL"
[[ -n "$PREVIEW_URL" ]] && echo "- CLOUDFLARE_PREVIEW_URL=$PREVIEW_URL"
