# Codex Chat History Convention

## Source of truth

Raw run artifacts live in:

- `docs/chat-history/codex-runs/*.prompt.txt`
- `docs/chat-history/codex-runs/*.response.txt`
- `docs/chat-history/codex-runs/*.codex.log`
- `docs/chat-history/codex-runs/latest.*` (latest run pointers)

## One readable append-only file

Primary file to browse:

- `docs/chat-history/CODEX_CHAT_HISTORY.md`

## Fully automatic mode (recommended)

Use this wrapper for Codex runs:

```bash
./scripts/codex-run-auto-history.sh "PROJECT: FSS Vibe Command Hub
<your instruction>"
```

It does both automatically:
1. Runs Codex through the bridge
2. Appends timestamp + prompt + response to `CODEX_CHAT_HISTORY.md`

## Manual append (optional)

If needed, append latest artifacts manually:

```bash
./scripts/append-codex-history.sh
```

## Optional full rebuild

Regenerate full timeline from all `*.prompt.txt` files:

```bash
./scripts/update-codex-history.sh
```
