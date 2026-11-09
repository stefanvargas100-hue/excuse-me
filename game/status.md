# Status

**Updated:** 2026-11-08, by Claude Opus 5.5
**Lead branch:** `stefanvargas100-hue/Update-Test`
**Live version:** see `main`; the studio setup merged there on 2026-11-08 with no game code changes

## Now
- **Round:** 1, at step 6 of the playbook.
- **In progress:** batch 2, live splits, on Codex. Batch 1 is merged into the lead branch but not `main`.
- **Waiting on the Director:** nothing.

## Next action
Review batch 2 using `studio/skills/process-review/SKILL.md`, including whether the new report rule worked. Then write the medal times batch, and compare its token use with live splits and the pilot. It is the first worker with the reduced startup settings, so confirm they applied.

## Worth knowing
- Codex has not yet been run through this process. Confirm during the pilot that it follows `AGENTS.md`, reports back and stays in scope.
- Check what a worker loads at startup during the pilot. Global skills and tools may add context no repo layout can remove.
- The CI test workflow runs on pushes to the lead branch and on PRs. Only `main` deploys.
