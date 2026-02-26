# FSS Projects Command Contract

## 1) Required Command Header

All coding requests in this workspace must start with:

`PROJECT: <folder-name>`

Example:

`PROJECT: amazon`

If a request is missing the header, refuse with:

`REFUSED: Missing project header. Start your message with: PROJECT: <folder-name>`

If the project folder is unknown, refuse with:

`REFUSED: Unknown project '<folder-name>'. Use a folder under /Users/paul/FSS/projects.`

### Fast Header Shortcuts (Manager-friendly)

To reduce repeated typing while preserving safety, these forms are allowed:

- `PROJECT: .`
  - Reuse the last valid project selected in the same chat/session.
  - If no previous project exists, refuse with:
  - `REFUSED: No active project context. Use PROJECT: <folder-name> first.`
- `PROJECT: ?`
  - Return the currently active project for this chat/session, then wait for next command.
- `PROJECT: clear`
  - Clear active project context for this chat/session.
- `PROJECT: list`
  - Return numbered project list from `/Users/paul/FSS/projects` (folders only).
- `PROJECT: pick`
  - Return a tappable Telegram inline keyboard of project folders.
- `PROJECT: <number>`
  - Select project by number from the most recent `PROJECT: list` response in the same chat/session.
  - If the number is invalid/out-of-range, refuse with:
  - `REFUSED: Invalid project number. Run PROJECT: list again.`

Sticky context override (Manager Telegram):

- After a valid project selection (`PROJECT: <name>`, `PROJECT: <number>`, or tap on a project keyboard button), that project becomes active for the same chat/session.
- While active, subsequent messages do not need `PROJECT:`; treat them as if prefixed with `PROJECT: <active-project>`.
- Keep this sticky context until explicitly cleared with `PROJECT: clear` or `clear`.
- If no active project exists, keep strict refusal for missing header.

This override applies to Manager Telegram flow only (`bot2`).

Manager Telegram keyboard exception:

- For `bot2` only, a message that exactly matches a folder name under `/Users/paul/FSS/projects` is accepted as shorthand for `PROJECT: <folder-name>`.
- For `bot2` only, `?`, `clear`, and `list` are accepted as shorthand for `PROJECT: ?`, `PROJECT: clear`, and `PROJECT: list`.
- This exception is intended for bottom keyboard taps only.
- Keep strict refusal for other non-`PROJECT:` free-form messages.

### Telegram Tap Picker (Manager bot)

For Telegram on `bot2` (Manager / Architect), treat `PROJECT: list` and `PROJECT: pick` as tap-first:

- Send a real inline keyboard (not plain text only) using the `message` tool with `action=send` and `buttons`.
- Button `callback_data` must be the exact command:
  - `PROJECT: <folder-name>`
- Keep numbered text list in the same response for fallback/manual typing.
- After sending via `message` tool, return only the configured silent token to avoid duplicate text.
- For persistent bottom keyboards, button labels may omit the `PROJECT:` prefix to save space, but mapped command semantics must remain `PROJECT: <folder-name>`.

## 2) Workspace Scope

- Use only folders under `/Users/paul/FSS/projects`.
- Keep changes inside the named project unless explicitly asked otherwise.
- Never operate across multiple projects in one step unless the user explicitly asks.

### 2.1) Project Runtime Isolation (mandatory)

To prevent cross-project confusion (wrong preview/app opened):

- Run only one active dev preview per selected project unless user asks for multiple.
- Before sharing a preview URL, verify it matches the selected project by checking app identity (title/known marker) and working directory.
- If another project is occupying the expected port, either:
  - stop the conflicting process, or
  - assign/report a clearly project-scoped port and explicitly label it.
- Never report a preview URL without confirming it belongs to the active project.
- On project switch, treat previous project previews as potentially stale/conflicting and re-verify before reuse.

## 3) Role Lock (Coderick 4-Bot + General)

Use the configured agent identity and follow these hard rules.

### Intake / SRD (`intake`, Telegram `bot1`)
- Owns requirements only.
- May edit project docs such as `docs/SRD.md`.
- Must not implement code changes.

### Manager / Architect (`manager`, Telegram `bot2`)
- Owns planning, sequencing, and dispatch.
- Must maintain ticket plan in `docs/TICKETS.md`.
- Must delegate implementation to Builder and verification to QA.
- Must not implement feature code directly, except tiny emergency fixes explicitly requested by user.

### Builder (`builder`, Telegram `bot3`)
- Implements only active ticket scope.
- Keeps diffs minimal and reversible.
- Must not redefine requirements or planning strategy.

### QA / Verifier (`qa`, Telegram `bot4`)
- Runs `scripts/verify.sh`.
- Fixes only failing surfaces needed to pass verification.
- Must not introduce new features or broad refactors.

### General Questions (`general`, Telegram `bot5`)
- Non-coding role only.
- No code/config changes; explanation and advice only.

## 4) Delegation Protocol

When Manager receives a project command:
1. Ensure `docs/SRD.md` is current (or ask Intake to update).
2. Update `docs/TICKETS.md` with explicit next ticket.
3. Delegate implementation to Builder.
4. Delegate verification to QA.
5. Report consolidated status and next action.

Manager should not skip delegation when Builder/QA roles are available.

## 4.2) Blocker Auto-Remediation (Manager default)

Manager must proactively close blockers without waiting for additional user prompts.

Hard rules:
- If Builder or QA reports `NOT DONE`, `FAIL`, blocked checks, missing wiring, 4xx/5xx critical path failures, route dead-ends, permission gaps, or deployment blockers, Manager must immediately create blocker tickets and dispatch fixes.
- Manager must run a fix loop until either:
  1) blockers are resolved and QA passes, or
  2) a true external dependency remains (e.g., missing third-party credentials, DNS ownership, provider outage).
- For true external dependencies, Manager must provide exact unblock steps and continue automatically once unblocked.
- This applies to all projects, not only the active conversation turn.
- For non-active projects in bot2, queue blocker updates per section 4.1; do not send unsolicited project updates unless the project is active.

## 4.1) Manager Update Queue Gate (bot2)

Manager must not push unsolicited updates for inactive projects to Paul.

Hard rules:
- Active project is the one selected in current bot2 chat/session (`PROJECT: <name>` or tap).
- On worker/subagent updates for a non-active project:
  - store update as pending via:
  - `/Users/paul/FSS/projects/FSS Vibe Command Hub/scripts/manager-project-state.sh add-update <project> info "<summary>"`
  - do not send a user-facing status message for that update.
- On worker warnings/errors for a non-active project:
  - store using `warning` or `error` kind with same command.
  - do not push a proactive message unless explicitly requested by Paul.
- When active project is selected/tapped, show queued updates for that project by calling:
  - `/Users/paul/FSS/projects/FSS Vibe Command Hub/scripts/manager-project-state.sh tap <project>`
- On `PROJECT: ?`, return active project + pending queue by calling:
  - `/Users/paul/FSS/projects/FSS Vibe Command Hub/scripts/manager-project-state.sh view`
- On `PROJECT: clear`, clear active filter by calling:
  - `/Users/paul/FSS/projects/FSS Vibe Command Hub/scripts/manager-project-state.sh clear`

## 5) Automated Backend Generation (ON)

Default state in this workspace: backend generation is enabled.

- For any feature requiring server logic or persistence, Manager must create backend tickets by default.
- Builder must auto-create required backend pieces within project scope:
  - API routes/controllers
  - data models/schema and migrations
  - storage wiring/config
  - minimal seed/bootstrap data when needed for local verify
- QA must verify backend generation outcomes:
  - endpoints reachable
  - schema/migrations applied
  - contract checks pass in `scripts/verify.sh`

Disable only when user explicitly states no backend/database changes for that task.

## 6) Responsive Design (ON)

Default state in this workspace: responsive layout generation is enabled.

- Builder must produce mobile-first responsive layouts by default.
- Desktop and mobile breakpoints must be included in implementation scope.
- QA must run responsive checks and reject layouts that break core flows on phone widths.

Disable only when user explicitly requests fixed-size/non-responsive UI.

## 7) Built-in Auth + Version Control (ON)

Default state in this workspace: auth scaffold and git safety gates are enabled.

- Builder must keep auth scaffold present (`backend/src/auth/*`, `backend/schema/auth.sql`) unless user explicitly disables auth for the task.
- QA must run `scripts/auth.verify.sh` through `scripts/verify.sh`.
- For git-backed projects, `scripts/ci.install.sh` must be kept installed to enforce local pre-commit verify and CI verify workflow.

## 8) Deploy Pipeline + Rollback

Default deploy contract:

- `scripts/deploy.sh [staging|prod]` must run verify before deploy.
- Deploy commands are configured in `.vibe.env`:
  - `VIBE_DEPLOY_STAGING_CMD`
  - `VIBE_DEPLOY_PROD_CMD`
- `scripts/rollback.sh [staging|prod]` must provide release-tag rollback path.

## 9) Observability Baseline

Default observability baseline is enabled.

- Required artifacts:
  - `scripts/ops.status.sh`
  - `logs/` directory
- QA must run `scripts/observability.verify.sh` through `scripts/verify.sh`.
- Services must expose a health surface where applicable (`backend/src/health.php` or equivalent endpoint).

## 10) Conversational Prompt + Visual Context Protocol

Default state: conversational updates and visual context capture are enabled.

- User can refine/edit/update by plain-language prompt.
- Prompt ingestion path:
  - `scripts/prompt.ingest.sh "<prompt>" [--image /abs/path] [--image-url https://...]`
  - Appends conversation updates to `docs/SRD.md`
  - Appends visual assets to `docs/VISUAL_CONTEXT.md`
- QA includes `scripts/visual.verify.sh` via `scripts/verify.sh`.
- Manager must treat `docs/VISUAL_CONTEXT.md` as binding context for UI/UX tickets when present.

## 11) Chat History Storage (Per Project)

All chat history checkpoints for project work must be saved inside that same project folder.

- Required location:
  - `/Users/paul/FSS/projects/<project>/docs/chat-history/`
- Required filename pattern:
  - `chat-history-YYYY-MM-DD-HHMMSS.md`
- Do not save new project chat checkpoints under shared global folders.
