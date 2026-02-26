# PROJECT_PORTS.md

Runtime port reservations to keep local previews isolated.

## Frontend preview ports
- `dbk1` → `5173`
- `church` → `5176`
- `real-estate` → `5175`
- `Jumia` → `3000` (Next dev/static preview)

## Backend/API ports
- `dbk1` API → `4000`
- `Jumia` API → `8080`

## Enforcement rules
1) Before sharing a preview link, verify the port serves the active project (title/marker check).
2) If the reserved port is occupied by another project, stop the conflicting process first.
3) Do not reuse stale URLs after switching projects; re-verify every time.
