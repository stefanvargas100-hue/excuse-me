# Status

**Updated:** 2026-11-08, by Claude Opus 5.5
**Lead branch:** `stefanvargas100-hue/Update-Test`
**Live version:** see `main`; the studio setup merged there on 2026-11-08 with no game code changes

## Now
- **Round:** 1, at step 6 of the playbook.
- **In progress:** batch 3 follow-up on Codex (medal times, fit tool), and the results-screen S1 hotfix on Codex. Batches 1 and 2 are merged into the lead branch but not `main`.
- **Waiting on the Director:** nothing blocking. At the playtest: splits appear low on screen and overlap the stamina bars.

## Risks
| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| S1: results buttons unreachable at 320 x 568, probably live | High | High | Podium hidden on short screens, shipping alone | Lead |
| Alpha's 7 new stages are the largest work ahead | High | High | Director to confirm scope. Placeholder art allowed, and a reusable stage recipe first | Lead |
| Matchmaking needs 6 real players at once, so a small player base may never fill a lobby | High | High | Director to decide before planning | Director |
| Matchmaking may need a server and has cost and security decisions | High | High | Revisit `archive/INTERNET_MULTIPLAYER_PLAN.md` in a spec | Lead |
| Player-chosen names need moderation | Medium | Medium | Filter and reporting in the spec | Lead |
| Real-phone checks are still open | Medium | High | Director playtest each round | Director |

## Next action
Review the batch 3 follow-up using `studio/skills/process-review/SKILL.md`, merge it, and hide the podium on short screens (the Director's chosen fix for unreachable results buttons). Then plan Cups.

## Worth knowing
- Codex has not yet been run through this process. Confirm during the pilot that it follows `AGENTS.md`, reports back and stays in scope.
- Check what a worker loads at startup during the pilot. Global skills and tools may add context no repo layout can remove.
- The CI test workflow runs on pushes to the lead branch and on PRs. Only `main` deploys.
