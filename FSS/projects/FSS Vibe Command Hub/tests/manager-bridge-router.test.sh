#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROUTER="$ROOT_DIR/scripts/manager-bridge-router.sh"
STATE_SCRIPT="$ROOT_DIR/scripts/manager-project-state.sh"
TMP_DIR="$(mktemp -d)"
PROJECTS_DIR="$TMP_DIR/projects"
STATE_ROOT="$TMP_DIR/state"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$PROJECTS_DIR/Alpha" "$PROJECTS_DIR/Beta"

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

route() {
  PROJECTS_DIR="$PROJECTS_DIR" \
  MANAGER_STATE_ROOT="$STATE_ROOT" \
  MANAGER_PROJECT_STATE_SCRIPT="$STATE_SCRIPT" \
    "$ROUTER" --chat-id bot2-test --prompt "$1"
}

# 1) Missing project header with no active context refuses.
out="$(route "Implement auth")"
assert_contains "$out" "ACTION:refuse" "should refuse when no active context"
assert_contains "$out" "REFUSED: Missing project header" "should show missing header refusal"

# 2) Keyboard tap shorthand sets active project and forwards PROJECT header.
out="$(route "Alpha")"
assert_contains "$out" "ACTION:forward" "tap should forward"
assert_contains "$out" "PROJECT: Alpha" "tap should normalize to PROJECT header"

# 3) Free-form message without header uses active project.
out="$(route "Add endpoint health check")"
assert_contains "$out" "ACTION:forward" "free-form should forward with active context"
assert_contains "$out" $'PROJECT: Alpha\nAdd endpoint health check' "free-form should be prefixed with active project"

# 4) PROJECT: . expands to active project.
out="$(route $'PROJECT: .\nContinue now')"
assert_contains "$out" "ACTION:forward" "dot shortcut should forward"
assert_contains "$out" $'PROJECT: Alpha\nContinue now' "dot shortcut should resolve active project"

# 5) PROJECT: ? responds with current active project view.
out="$(route "PROJECT: ?")"
assert_contains "$out" "ACTION:reply" "question shortcut should reply directly"
assert_contains "$out" "Current project: Alpha" "question shortcut should show current project"

# 6) clear switches to global mode and free-form is refused again.
out="$(route "clear")"
assert_contains "$out" "ACTION:forward" "clear should forward as PROJECT command"
assert_contains "$out" "PROJECT: clear" "clear shorthand should normalize"
out="$(route "Do more work")"
assert_contains "$out" "ACTION:refuse" "after clear, free-form should refuse again"

echo "PASS: manager-bridge-router tests"
