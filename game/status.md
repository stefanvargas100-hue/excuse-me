# Status

**Updated:** 2026-11-09, by Claude Opus 5.5, at a lead handover
**Lead branch:** `develop`
**Live version:** `main` at `30d0cd4`, with splits, medals, screen fixes and the playtest pipeline

## Now
- **Round 2 approved** (2026-11-09) and building on Codex: `game/rounds/round-02/proposal.md`. Merge order 03, 05, 06, 07. Batches 03, 06 and 07 all touch `race.js`; 06 and 07 both raise `PROTO` to 6, so reconcile at merge.
- **Workers running, all Codex:**
  - `slipstream-lines` (batch 03, second cycle): it was given a "slipstream lines" brief that is not in the repo. Its floor run shows bots line up 67% of the first third even with slipstream off. The lead told it "within 10 points of the floor" is an upper bound.
  - `cups-qa` (04), `time-boards` (05, boards and name rules), `host-handover` (06, plus the simulated room; needs a Claude second review), `side-routes` (07, Subway routes then Takeshita Street).
- **On `develop`, not yet `main`:** everything from Round 1, plus Friend Cup online (`PROTO` 5). 631 tests pass.
- **Matchmaking decisions:** recorded at the end of `matchmaking-spec.md`. No public test yet; legal advice on hold.
- **Waiting on the Director:** the phone tests in `game/todo.md`, a try of Subway, and who sent the slipstream second brief.

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
