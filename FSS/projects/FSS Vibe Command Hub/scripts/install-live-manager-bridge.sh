#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXTERNAL_SCRIPTS_DIR="${OPENCLAW_SCRIPTS_DIR:-/Users/paul/FSS/openclaw-ops/scripts}"
TARGET_BRIDGE="$EXTERNAL_SCRIPTS_DIR/codex_hub_bridge.sh"
UPSTREAM_BRIDGE="$EXTERNAL_SCRIPTS_DIR/codex_hub_bridge.upstream.sh"
BACKUP_DIR="$EXTERNAL_SCRIPTS_DIR/.codex-backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

if [[ ! -f "$TARGET_BRIDGE" ]]; then
  echo "ERROR: Target bridge not found: $TARGET_BRIDGE" >&2
  exit 1
fi

if [[ ! -x "$ROOT_DIR/scripts/manager-live-bridge.sh" ]]; then
  echo "ERROR: Missing manager bridge wrapper: $ROOT_DIR/scripts/manager-live-bridge.sh" >&2
  exit 1
fi

BACKUP_FILE="$BACKUP_DIR/codex_hub_bridge.sh.$STAMP.bak"

cat <<INFO
Installing manager live-bridge integration:
- external bridge: $TARGET_BRIDGE
- upstream backup: $UPSTREAM_BRIDGE
- backup copy: $BACKUP_FILE
- wrapper source: $ROOT_DIR/scripts/manager-live-bridge.sh
INFO

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "DRY-RUN: No files changed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
cp "$TARGET_BRIDGE" "$BACKUP_FILE"

# Preserve a real upstream bridge (avoid copying wrapper onto upstream).
if [[ -f "$UPSTREAM_BRIDGE" ]] && ! grep -q "manager-live-bridge.sh" "$UPSTREAM_BRIDGE"; then
  : # keep existing real upstream
elif ! grep -q "manager-live-bridge.sh" "$TARGET_BRIDGE"; then
  cp "$TARGET_BRIDGE" "$UPSTREAM_BRIDGE"
  chmod +x "$UPSTREAM_BRIDGE"
else
  # TARGET is already wrapper and upstream is missing/invalid; restore latest backup that is not wrapper.
  RESTORE_CANDIDATE="$(ls -1t "$BACKUP_DIR"/codex_hub_bridge.sh.*.bak 2>/dev/null | while read -r f; do if ! grep -q "manager-live-bridge.sh" "$f"; then echo "$f"; break; fi; done)"
  if [[ -n "${RESTORE_CANDIDATE:-}" ]]; then
    cp "$RESTORE_CANDIDATE" "$UPSTREAM_BRIDGE"
    chmod +x "$UPSTREAM_BRIDGE"
  else
    echo "ERROR: Could not find a non-wrapper bridge backup to restore upstream." >&2
    exit 1
  fi
fi

cat > "$TARGET_BRIDGE" <<SH
#!/usr/bin/env bash
set -euo pipefail
export OPENCLAW_MANAGER_UPSTREAM_BRIDGE="$UPSTREAM_BRIDGE"
exec "$ROOT_DIR/scripts/manager-live-bridge.sh" "\$@"
SH
chmod +x "$TARGET_BRIDGE"

echo "PASS: Installed manager live-bridge integration."
