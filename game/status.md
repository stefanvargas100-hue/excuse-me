# Status

**Updated:** 2026-11-08, by Claude Opus 5.5
**Lead branch:** `develop`
**Live version:** `main`, with the S1 results fix shipped alone. Splits, medals and fit fixes are on the lead branch only

## Now
- **Round:** 1, at step 6 of the playbook.
- **In progress:** nothing. No workers are running. Batches 1, 2 and 3 are merged into the lead branch but not `main`.
- **Waiting on the Director:** nothing blocking. At the playtest: splits appear low on screen and overlap the stamina bars.

## Risks
| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Alpha's 7 new stages are the largest work ahead | High | High | Director to confirm scope. Placeholder art allowed, and a reusable stage recipe first | Lead |
| Matchmaking needs 6 real players at once, so a small player base may never fill a lobby | High | High | Director to decide before planning | Director |
| Matchmaking may need a server and has cost and security decisions | High | High | Revisit `archive/INTERNET_MULTIPLAYER_PLAN.md` in a spec | Lead |
| Player-chosen names need moderation | Medium | Medium | Filter and reporting in the spec | Lead |
| Real-phone checks are still open | Medium | High | Director playtest each round | Director |

## Next action
Tidy the remaining fit findings, then plan Cups with a one-page spec for the Director. Hand over to a fresh lead session when Round 1 ends.

## Worth knowing
- Codex has not yet been run through this process. Confirm during the pilot that it follows `AGENTS.md`, reports back and stays in scope.
- Check what a worker loads at startup during the pilot. Global skills and tools may add context no repo layout can remove.
- The CI test workflow runs on pushes to the lead branch and on PRs. Only `main` deploys.
