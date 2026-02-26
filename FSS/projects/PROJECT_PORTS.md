# PROJECT_PORTS.md

Runtime port reservations to keep local previews isolated.

## Frontend preview ports
- `dbk1` → `5173`
- `Jumia` → `3000` (Next dev/export preview)
- `real-estate` → `5175`

## Backend/API ports
- `dbk1` API → `4000`
- `Jumia` API → `8080`

## Rule
Before sending a preview link, verify the process on that port belongs to the active project.
