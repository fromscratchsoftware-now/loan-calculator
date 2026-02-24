# Cloudflare Live Testing Baseline

This project uses **Cloudflare-only endpoints** for live/preview testing.

## Baseline
- Live testing host should be a Cloudflare-managed domain/subdomain.
- Legacy SiteGround live-testing instructions are **deprecated** for testing and should not be used as the default path.
- Local development remains supported.

## Environment variables
Use these variables in local env and CI templates:

- `CLOUDFLARE_LIVE_BASE_URL` (required for live checks)
- `CLOUDFLARE_PREVIEW_URL` (optional preview endpoint)
- `CLOUDFLARE_ZONE` (optional)
- `CLOUDFLARE_PROJECT_NAME` (optional)
- `LIVE_TEST_PROVIDER=cloudflare`

## Quick check
Run:

```bash
./scripts/check.cloudflare-live.sh
```

The check validates Cloudflare URL variables and returns non-zero if required values are missing or malformed.
