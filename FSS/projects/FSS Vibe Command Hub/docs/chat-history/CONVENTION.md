# Codex Chat History Convention

## Source of truth

Raw run artifacts live in:

- `docs/chat-history/codex-runs/*.prompt.txt`
- `docs/chat-history/codex-runs/*.response.txt`
- `docs/chat-history/codex-runs/*.codex.log`

## Human-readable rollup

Use this command to rebuild a single readable timeline:

```bash
./scripts/update-codex-history.sh
```

Output file:

- `docs/chat-history/CODEX_CHAT_HISTORY.md`

## Working rule

After any important Codex run, regenerate the rollup so project chat context is easy to inspect.
