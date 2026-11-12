# Round 02, batch 18c: independent review of lobby groups and Cup bot count

**Reviewer:** Codex, defaults, a fresh worker that did not build it. Why: online protocol change, so a second review is required before integration.
**Risk:** high. This review is the second review.

## Goal
Decide PASS or HOLD for integrating `stefanvargas100-hue/lobby-groups` (implementation c913da2 and 961bd91, report e906892) into develop. Your workspace starts from that branch. Find problems; do not fix production code.

## Read first
- `game/areas/online.md`
- The plan and fix brief: `git show develop:game/rounds/round-02/batch-18-lobby-groups-bots.md` and `git show develop:game/rounds/round-02/batch-18b-fixes.md`
- `game/rounds/round-02/reports/batch-18-lobby-groups-bots.md`
- The source diff only: `git diff develop...HEAD -- src index.html style.css test`

## Check
1. **Untrusted input.** A guest receives `cupCfg.bots` in the roster message and a Cup setup with 2 to 8 racers. Try to break it with tests: non-integers, negatives, strings other than `fill`, counts above the free seats, objects, a setup whose bot count disagrees with its racers, bots before players, a host changing the count after guests are Ready, a count sent by a non-host. Nothing may throw, start a race, or leave host and guest with different racer lists.
2. **Clamping and Ready.** Players joining and leaving with an explicit count and with `fill`; a join that fills the room; a count change clears guest Ready and blocks Start until they ready again.
3. **A whole Cup at other sizes.** Simulated four-race Friend Cups with 2, 3, 5 and 8 racers: placing, points, cumulative totals, award shown once, a player leaving mid-Cup (the existing bot takeover) and host handover. Compare 8-racer results with develop: they must be unchanged.
4. **Version.** `PROTO` is 10; a PROTO 9 phone gets the existing update message in both directions. `START_PROTOCOL` unchanged.
5. **Fairness.** Confirm the report's claim that no Friend Cup size saves a record or ghost, and that no other mode's identity, record or ghost changed.
6. **Lobby UI.** Groups from `city`; selection visible when collapsed; Cup pick order across groups; a group with no Cup-eligible track hidden in Cup format; the bot picker not rebuilt on an unchanged roster refresh. Open the screenshots in `game/rounds/round-02/batch-18-evidence/` that matter (host Cup open at 320, both `18b-real-guest-ready` captures) and say what you see. Take your own captures only where the evidence leaves a gap, using the batch-10c multi-page method.
7. **Stayed in plan.** Files changed match the allowed lists; nothing outside the Friend lobby was restyled.

## May edit
- New test files under `test/` named `batch18-review-*.test.js` (keep the ones worth keeping)
- `game/rounds/round-02/reports/batch-18c-review.md`, `game/rounds/round-02/batch-18c-evidence/`

## Must not change
- Production code, existing tests, dependencies, the live database, `tools/loadtest.mjs`. No deploys, no subagents.

## Done when
- Each finding has a severity (S1 to S4), a reproducing test or exact steps, and the file and line.
- Focused tests while working; `npm test` once at the end with your added tests, `npm run build`, `git diff --check`.
- Report of at most 10 lines starting with PASS or HOLD, committed on your branch.

## Left for a person
- Real phones, real network joins and leaves, reconnect and host transfer with a custom bot count.
