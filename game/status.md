# Status

## Recovery checkpoint ? 2026-11-09, Codex
- Workspace authority: develop at c33c8cd, clean before this documentation update, eight commits ahead of origin/develop. Local main is 72f05e3; deployment not verified.
- Previous lead merged 05 (253bd46) and 07 (c33c8cd). Its saved transcript records 663/663 tests, build, diff check and UTF-8 check passing after 07; not rerun during recovery.
- 06d stopped at Claude usage limit, with three uncommitted files in host-handover-2. Preserved as batch-06e-inherited.patch. Codex recovery brief: batch-06e-countdown-recovery.md; independent review required before merge. Original checkout and provider session preserved.
- Director moved 09 visual pass until AFTER the combined feature playtest. Do not start it beforehand.
- 03 is failed/exited in Orca, not running; its report still needs inspection. 04 QA remains partial. Migration 0003 remains unapplied pending approval.
- 06e recovery reported complete at f7f7999: 679/679 tests, build and room simulations reported passing. Independent review brief 06f prepared; not yet merged.
- Older checkpoint below is historical and superseded where noted.


**Updated:** 2026-11-09, by Claude Opus 5.5, at a lead handover (context past 100K)
**Lead branch:** `develop` at `4b7d08b`, pushed, so the playtest link updates
**Live version:** `main` at `30d0cd4`

## Now
- **Round:** 2, at step 7 of the playbook (reviewing results). Plan: `game/rounds/round-02/proposal.md`. Merge order: 03, 08 (done), 05, 06, 07.
- **Merged:** batch 08, Subway in the Cups (NYC Cup is 4 races, `CUP_RULES` 3; Friend Cups allow stage 5). 632 tests and the build pass. Branch and workspace deleted.
- **Done, waiting for lead review:**
  - 05 `time-boards` (`6c43f74`): Race tab and name rules. Name cap is 24 for all names; there is no name form. Migration `0003` is written but **not applied**: it needs Director approval. Review it and the playtest separation.
  - 04 `cups-qa` (`193d974`): partial, no confirmed bugs. Forced finishes, not full player-driven Cups. Judge whether a QA worker earned its cost.
- **Running:**
  - 03 `slipstream-lines` (Codex): second cycle under a brief from an earlier lead that is lost. "Within 10 points of the floor" means an upper bound.
  - 06b `host-handover-2` (Claude Opus): **done**, `2b11a96`, report `4061d45`. 642/642 tests, and the simulated Cup completes with the message table. Codex second review `review-host-handover` running (plan `batch-06c`). The builder flagged a small race-1 countdown display glitch whose fix is in `game.js`. Merge after the review.
  - 07 `side-routes` (Codex): Subway routes done in `1cf85eb` (partial). It stopped on a build error that looks local; real cause found by the lead: `src/render/side-routes.js` saved in the Windows code page. Follow-up `batch-07c` sent: merge develop (new `test/utf8.test.js`), re-save as UTF-8, then Subway medals and Takeshita Street. Part 1 now builds; Subway measured in `9020d04`. Ruling sent: it may also tag the race ghost key in `duel.js` `shareGhosts` with `courseTag` (that line only), which touches the same file as 06b.
- **Queued:** 09 visual pass (`batch-09-visual-pass.md`), Claude Fable 5.1, approved by the Director. Start it once 06b has reported **and** 07 has merged. Part 1 proposes, then part 2 builds the worker's own top 10 with no approval stop. It is exempt from the 2-failure stop rule (Director).
- **Waiting on the Director:** playtest Subway in the Cups and the checks in `game/todo.md`; approval to apply migration 0003 once reviewed.

## Risks
| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Alpha's 7 new stages plus side routes are the largest work ahead | High | High | Reusable side-route system proven on the subway stage first. Placeholder art allowed | Lead |
| Host-run bots may hit Realtime message limits | Medium | High | One combined message, measured with 7 bots in the Friend Cup online batch | Lead |
| Matchmaking may need a server and has cost and security decisions | High | High | Revisit `archive/INTERNET_MULTIPLAYER_PLAN.md` in a spec | Lead |
| Player-chosen names need moderation | Medium | Medium | Filter and reporting in the spec | Lead |
| Real-phone checks are still open | Medium | High | Director playtest each round, using the playtest link | Director |

## Next action
Review batch 05 with `studio/skills/process-review/SKILL.md`, then merge it. Then handle the other workers as they report.

## Worth knowing
- Playtest link: `https://stefanvargas100-hue.github.io/excuse-me/playtest/`. It keeps its own save, seeded once from the live save, with all gear, titles and pictures open. It stays off the live boards, separate from live rooms and outside the offline cache. A refresh can take up to 10 minutes to show a new build; the red tag shows the build's commit.
- A push to `develop` also redeploys the live site from unchanged `main`. A failed playtest build cannot stop a live deploy.
- Only `main` may deploy to GitHub Pages, so `develop` deploys through `workflow_run`, which runs from `main`.
- `cancel-in-progress: false` in `deploy.yml` is on `develop` and reaches `main` with the next approved merge. Until then, a `develop` deploy can still cancel a running `main` deploy; the replacement still publishes `main`, but skips `npm test`.
- Passing the host role is planned after the Cups QA trial and before public matchmaking.
