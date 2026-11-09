# Status

**Updated:** 2026-11-09, by Claude Opus 5.5, at a lead handover
**Lead branch:** `develop`
**Live version:** `main` at `30d0cd4`, with splits, medals, screen fixes and the playtest pipeline

## Now
- **Round:** 1. Ideas 1-3 are live. On `develop`, not yet `main`: NYC Cup at 8 racers, Friend Cup rules, Subway Platform (not yet in NYC Cup), clothing fixes, the matchmaking spec and the performance tool.
- **Friend Cup online is built:** the Claude Opus worker resumed after the usage reset and finished on `stefanvargas100-hue/friend-cup-online` at `8300da7`. It reports 611/611 tests, the build and fit check passing, and 10.2 messages a second from the host with 7 bots. The "Resuming" section of its plan is obsolete.
- **Workers running, both Codex:**
  - `review-friend-cup`: second review of Friend Cup online, findings only (plan: `round-01/review-friend-cup-online.md`). After it, merge with `PROTO` set to 5 and update the tests that hard-code it.
  - `slipstream-lines`: applies fix B, sets `DRAFT_COOL` to 6 and re-measures medal times (plan: `round-02/batch-03`). Both it and Friend Cup online touch `race.js`, so expect a merge conflict.
- **Next:** the two worker reports, then the QA worker trial.
- **Waiting on the Director:** phone test, and the 5 decisions in `game/rounds/round-02/matchmaking-spec.md`.
- **At the playtest:** splits may sit low and overlap the stamina bars; medal fairness; results without the podium.

## Risks
| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Alpha's 7 new stages plus side routes are the largest work ahead | High | High | Reusable side-route system proven on the subway stage first. Placeholder art allowed | Lead |
| Host-run bots may hit Realtime message limits | Medium | High | One combined message, measured with 7 bots in the Friend Cup online batch | Lead |
| Matchmaking may need a server and has cost and security decisions | High | High | Revisit `archive/INTERNET_MULTIPLAYER_PLAN.md` in a spec | Lead |
| Player-chosen names need moderation | Medium | Medium | Filter and reporting in the spec | Lead |
| Real-phone checks are still open | Medium | High | Director playtest each round, using the playtest link | Director |

## Next action
Review the two workers' reports as they arrive; see `game/todo.md`. Codex builds by default; at most one Claude worker at a time.

## Worth knowing
- Playtest link: `https://stefanvargas100-hue.github.io/excuse-me/playtest/`. It keeps its own save, seeded once from the live save, with all gear, titles and pictures open. It stays off the live boards, separate from live rooms and outside the offline cache. A refresh can take up to 10 minutes to show a new build; the red tag shows the build's commit.
- A push to `develop` also redeploys the live site from unchanged `main`. A failed playtest build cannot stop a live deploy.
- Only `main` may deploy to GitHub Pages, so `develop` deploys through `workflow_run`, which runs from `main`.
- `cancel-in-progress: false` in `deploy.yml` is on `develop` and reaches `main` with the next approved merge. Until then, a `develop` deploy can still cancel a running `main` deploy; the replacement still publishes `main`, but skips `npm test`.
- Passing the host role is planned after the Cups QA trial and before public matchmaking.
