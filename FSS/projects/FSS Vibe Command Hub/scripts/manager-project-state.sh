#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="${MANAGER_STATE_DIR:-$ROOT_DIR/.manager-state}"

now_ts() {
  date '+%Y-%m-%d %H:%M:%S %Z'
}

print_active_label() {
  local active="None"
  if [[ -f "$STATE_DIR/active_project.txt" ]]; then
    active="$(cat "$STATE_DIR/active_project.txt")"
  fi
  echo "Current project: $active"
}

ensure_state() {
  mkdir -p "$STATE_DIR/projects"
}

safe_id() {
  local raw="$1"
  local id
  id="$(printf '%s' "$raw" | tr '[:space:]/' '__' | tr -cd '[:alnum:]_.-')"
  if [[ -z "$id" ]]; then
    id="project"
  fi
  printf '%s' "$id"
}

project_dir() {
  local project="$1"
  local id
  id="$(safe_id "$project")"
  printf '%s/projects/%s' "$STATE_DIR" "$id"
}

ensure_project() {
  local project="$1"
  local pdir
  pdir="$(project_dir "$project")"

  mkdir -p "$pdir"
  printf '%s\n' "$project" > "$pdir/name.txt"

  touch "$pdir/updates.log" "$pdir/pending.log" "$pdir/errors.log" "$pdir/warnings.log" "$pdir/running_tasks.txt"
  [[ -f "$pdir/latest_status.txt" ]] || printf 'idle\n' > "$pdir/latest_status.txt"
  [[ -f "$pdir/last_refreshed.txt" ]] || printf 'n/a\n' > "$pdir/last_refreshed.txt"
}

list_projects() {
  local pdir
  for pdir in "$STATE_DIR"/projects/*; do
    [[ -d "$pdir" ]] || continue
    if [[ -f "$pdir/name.txt" ]]; then
      cat "$pdir/name.txt"
    fi
  done
}

set_last_refreshed() {
  local project="$1"
  local pdir
  pdir="$(project_dir "$project")"
  now_ts > "$pdir/last_refreshed.txt"
}

set_latest_status() {
  local project="$1"
  local status="$2"
  local pdir
  pdir="$(project_dir "$project")"
  printf '%s\n' "$status" > "$pdir/latest_status.txt"
  set_last_refreshed "$project"
}

is_active_project() {
  local project="$1"
  [[ -f "$STATE_DIR/active_project.txt" ]] || return 1
  [[ "$(cat "$STATE_DIR/active_project.txt")" == "$project" ]]
}

queue_pending_if_non_active() {
  local project="$1"
  local line="$2"
  local pdir
  pdir="$(project_dir "$project")"

  if ! is_active_project "$project"; then
    printf '%s\n' "$line" >> "$pdir/pending.log"
  fi
}

append_update() {
  local project="$1"
  local kind="$2"
  local message="$3"
  local ts line pdir

  pdir="$(project_dir "$project")"
  ts="$(now_ts)"
  line="[$ts] [$kind] $message"

  printf '%s\n' "$line" >> "$pdir/updates.log"
  case "$kind" in
    warning) printf '%s\n' "$line" >> "$pdir/warnings.log" ;;
    error) printf '%s\n' "$line" >> "$pdir/errors.log" ;;
  esac

  set_latest_status "$project" "$kind: $message"
  queue_pending_if_non_active "$project" "$line"
}

task_start() {
  local project="$1"
  local task_id="$2"
  local description="$3"
  local pdir ts line

  pdir="$(project_dir "$project")"
  ts="$(now_ts)"
  line="$task_id|$description|$ts"

  if ! grep -Fq "$task_id|" "$pdir/running_tasks.txt"; then
    printf '%s\n' "$line" >> "$pdir/running_tasks.txt"
  fi

  set_latest_status "$project" "task-started: $task_id"
  queue_pending_if_non_active "$project" "[$ts] [task] started $task_id - $description"
}

task_finish() {
  local project="$1"
  local task_id="$2"
  local outcome="$3"
  local pdir tmp ts

  pdir="$(project_dir "$project")"
  tmp="$pdir/running_tasks.txt.tmp"
  ts="$(now_ts)"

  if [[ -f "$pdir/running_tasks.txt" ]]; then
    grep -v -F "$task_id|" "$pdir/running_tasks.txt" > "$tmp" || true
    mv "$tmp" "$pdir/running_tasks.txt"
  fi

  set_latest_status "$project" "task-finished: $task_id ($outcome)"
  queue_pending_if_non_active "$project" "[$ts] [task] finished $task_id ($outcome)"
}

print_project_view() {
  local project="$1"
  local pdir pending_count running_count warning_count error_count

  pdir="$(project_dir "$project")"
  pending_count=$(wc -l < "$pdir/pending.log" | tr -d ' ')
  running_count=$(grep -cve '^[[:space:]]*$' "$pdir/running_tasks.txt" || true)
  warning_count=$(wc -l < "$pdir/warnings.log" | tr -d ' ')
  error_count=$(wc -l < "$pdir/errors.log" | tr -d ' ')

  print_active_label
  echo "Project: $project"
  echo "Latest status: $(cat "$pdir/latest_status.txt")"
  echo "Last refreshed: $(cat "$pdir/last_refreshed.txt")"
  echo "Running tasks: $running_count"
  echo "Warnings: $warning_count"
  echo "Errors: $error_count"

  if [[ "$pending_count" -gt 0 ]]; then
    echo "Pending updates ($pending_count):"
    cat "$pdir/pending.log"
    : > "$pdir/pending.log"
  else
    echo "Pending updates (0):"
  fi
}

print_overview() {
  local projects total pending_total project pdir pending_count

  print_active_label
  echo "Global overview"

  total=0
  pending_total=0
  while IFS= read -r project; do
    [[ -n "$project" ]] || continue
    total=$((total + 1))
    pdir="$(project_dir "$project")"
    pending_count=$(wc -l < "$pdir/pending.log" | tr -d ' ')
    pending_total=$((pending_total + pending_count))
    echo "- $project | status=$(cat "$pdir/latest_status.txt") | pending=$pending_count"
  done < <(list_projects)

  echo "Projects tracked: $total"
  echo "Pending updates total: $pending_total"
}

usage() {
  cat <<USAGE
Usage:
  $0 tap <project>
  $0 clear
  $0 add-update <project> <info|warning|error|status> <message>
  $0 task-start <project> <task-id> <description>
  $0 task-finish <project> <task-id> <outcome>
  $0 view
  $0 overview
USAGE
}

main() {
  ensure_state

  local cmd="${1:-}"
  case "$cmd" in
    tap)
      local project="${2:-}"
      [[ -n "$project" ]] || { usage; exit 1; }
      ensure_project "$project"
      printf '%s\n' "$project" > "$STATE_DIR/active_project.txt"
      print_project_view "$project"
      ;;
    clear)
      rm -f "$STATE_DIR/active_project.txt"
      print_overview
      ;;
    add-update)
      local project="${2:-}"
      local kind="${3:-}"
      shift 3 || true
      local message="$*"
      [[ -n "$project" && -n "$kind" && -n "$message" ]] || { usage; exit 1; }
      case "$kind" in
        info|warning|error|status) ;;
        *)
          echo "Invalid update kind: $kind" >&2
          exit 1
          ;;
      esac
      ensure_project "$project"
      append_update "$project" "$kind" "$message"
      print_active_label
      echo "Update recorded for $project"
      ;;
    task-start)
      local project="${2:-}"
      local task_id="${3:-}"
      shift 3 || true
      local description="$*"
      [[ -n "$project" && -n "$task_id" && -n "$description" ]] || { usage; exit 1; }
      ensure_project "$project"
      task_start "$project" "$task_id" "$description"
      print_active_label
      echo "Task started for $project: $task_id"
      ;;
    task-finish)
      local project="${2:-}"
      local task_id="${3:-}"
      local outcome="${4:-done}"
      [[ -n "$project" && -n "$task_id" ]] || { usage; exit 1; }
      ensure_project "$project"
      task_finish "$project" "$task_id" "$outcome"
      print_active_label
      echo "Task finished for $project: $task_id"
      ;;
    view)
      if [[ -f "$STATE_DIR/active_project.txt" ]]; then
        local active
        active="$(cat "$STATE_DIR/active_project.txt")"
        ensure_project "$active"
        print_project_view "$active"
      else
        print_overview
      fi
      ;;
    overview)
      print_overview
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
