# Artifact Canonicalization Standard (Global)

Version: 1.0

## Canonical root (per project)
- `<project>/docs/evidence/`

## Reusable tooling
- Script: `/Users/paul/FSS/projects/FSS Vibe Command Hub/scripts/artifact-normalize.sh`
- Template config: `/Users/paul/FSS/projects/FSS Vibe Command Hub/templates/artifact-normalize.sources.conf`

## Onboarding pattern for a new project
1. Copy template config to `<project>/docs/artifact-sources.conf`.
2. Add wrapper script `<project>/scripts/artifact.normalize.sh` to call shared normalizer.
3. Hook normalizer into:
   - pre-verify + post-verify
   - pre-qa + post-qa
   - pre-release + post-release
4. Ensure DoD/playbook references canonical index:
   - `docs/evidence/artifact-index.json`
   - `docs/evidence/artifact-index.md`

## Behavior
- Non-destructive: source artifacts are never deleted.
- Artifacts are mirrored into canonical space under `docs/evidence/_normalized/...`.
- Index manifest includes source -> canonical mapping for deterministic DoD checks.
