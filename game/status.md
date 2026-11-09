# Status

**Updated:** 2026-11-08, by Claude Opus 5.5
**Lead branch:** `develop`
**Live version:** `main` at `546dcb3`, with splits, medals and screen fixes

## Now
- **Round:** 1. Ideas 1-3 are live. Cups are specified but not started.
- **In progress:** nothing. No workers are running.
- **Waiting on the Director:** approve `game/rounds/round-01/cups-spec.md` and its 2 decisions; approve shipping the playtest pipeline to `main`; choose how locked corridors open.
- **At the playtest:** splits may sit low and overlap the stamina bars; medal fairness; results without the podium.

## Risks
| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Alpha's 7 new stages plus side routes are the largest work ahead | High | High | Reusable side-route system proven on the subway stage first. Placeholder art allowed | Lead |
| Host-run bots may hit Realtime message limits | Medium | High | One combined message, measured with 7 bots in Cups batch 3 | Lead |
| Matchmaking may need a server and has cost and security decisions | High | High | Revisit `archive/INTERNET_MULTIPLAYER_PLAN.md` in a spec | Lead |
| Player-chosen names need moderation | Medium | Medium | Filter and reporting in the spec | Lead |
| Real-phone checks are still open | Medium | High | Director playtest each round, using the playtest link | Director |

## Next action
Once approved: ship the playtest pipeline, then send Cups batch 1. Hand over to a fresh lead session when Round 1 ends.

## Worth knowing
- The playtest copy lives at `/playtest/`. It keeps its own save, seeded once from the live save, and stays off the live boards, separate from live rooms and outside the offline cache. It needs `deploy.yml` on `main` before it works. Refreshing can take up to 10 minutes to show a new build, because of GitHub's page caching; the red tag shows the build's commit.
- A push to `develop` also redeploys the live site from unchanged `main`. A failed playtest build cannot stop a live deploy.
- Only `main` may deploy to GitHub Pages, so `develop` deploys through `workflow_run`, which runs from `main`.
