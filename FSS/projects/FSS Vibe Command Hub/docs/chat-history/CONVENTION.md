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

Append the latest run (timestamp + prompt + response):

```bash
./scripts/append-codex-history.sh
```

## Optional full rebuild

If you ever want to regenerate the full timeline from all `*.prompt.txt` files:

```bash
./scripts/update-codex-history.sh
```

## Working rule

After each important Codex run, append once so history stays easy to read in one place.
