#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT_DIR/scripts/manager-project-state.sh"
STATE_DIR="$(mktemp -d)"
trap 'rm -rf "$STATE_DIR"' EXIT

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if [[ "$haystack" != *"$needle"* ]]; then
    fail "$label (missing: $needle)"
  fi
}

run() {
  MANAGER_STATE_DIR="$STATE_DIR" "$SCRIPT" "$@"
}

# 1) Active project is shown and non-active updates are queued.
out="$(run tap Alpha)"
assert_contains "$out" "Current project: Alpha" "tap should set current project"
out="$(run add-update Beta info "Background sync done")"
assert_contains "$out" "Current project: Alpha" "current label should remain Alpha"
out="$(run tap Beta)"
assert_contains "$out" "Current project: Beta" "tap should switch current project"
assert_contains "$out" "Pending updates (1):" "queued update should surface on tap"
assert_contains "$out" "Background sync done" "queued update text should be shown"
out="$(run tap Beta)"
assert_contains "$out" "Pending updates (0):" "pending updates should clear after surfacing"

# 2) Per-project isolated state includes running tasks/errors/warnings/last refreshed.
out="$(run task-start Alpha T-1 "Build API")"
assert_contains "$out" "Current project: Beta" "non-active task start should keep current label"
out="$(run add-update Alpha warning "Rate limit high")"
out="$(run add-update Alpha error "API timeout")"
out="$(run tap Alpha)"
assert_contains "$out" "Running tasks: 1" "running task count should be isolated per project"
assert_contains "$out" "Warnings: 1" "warning count should be tracked"
assert_contains "$out" "Errors: 1" "error count should be tracked"
assert_contains "$out" "Last refreshed:" "last refreshed should be present"
assert_contains "$out" "Pending updates (3):" "queued task+warning+error should be surfaced"

# 3) Clear removes active filter and returns global overview.
out="$(run clear)"
assert_contains "$out" "Current project: None" "clear should remove active filter"
assert_contains "$out" "Global overview" "clear should return overview"
assert_contains "$out" "- Alpha |" "overview should include Alpha"
assert_contains "$out" "- Beta |" "overview should include Beta"

echo "PASS: manager-project-state tests"
