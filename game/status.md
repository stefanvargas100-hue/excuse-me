# Status

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
  - 06b `host-handover-2` (**Claude Opus, high**, the Director chose it): finishing the stopped Codex draft from `host-handover` `b5e751a`. Plan `batch-06b`. Needs a Codex second review before merging. It is the only Claude worker; start no other.
  - 07 `side-routes` (Codex): Subway routes done in `1cf85eb` (partial). It stopped on a build error that looks local; real cause found by the lead: `src/render/side-routes.js` saved in the Windows code page. Follow-up `batch-07c` sent: merge develop (new `test/utf8.test.js`), re-save as UTF-8, then Subway medals and Takeshita Street.
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
