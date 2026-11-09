# Round 01: second review of Friend Cup online

**Reviewer:** codex, defaults. Why: an independent model from the builder (Claude Opus), and Claude usage is the bottleneck.
**Do not fix anything.** Report findings only.

## What to review
Branch `stefanvargas100-hue/friend-cup-online` at `8300da7`, against the plan `game/rounds/round-01/batch-06-friend-cup-online.md`, sections "How it must work", "Must stay fair" and "Must not change". The builder's report is `game/rounds/round-01/reports/batch-06-friend-cup-online.md`.

Review only `git diff $(git merge-base HEAD origin/develop) HEAD`. Open other files only to follow a call the diff makes.

## Look for
1. Anything the plan requires that is missing or behaves differently.
2. Ways a Cup can get stuck or end wrongly: a guest or host leaving, a late or repeated message, a phone briefly offline, or a race result that never arrives.
3. Unfairness between phones: different seeds, stages, bot levels or points.
4. Changes to normal friend races, Elimination or the solo NYC Cup.
5. Tests that pass without really checking the behaviour.

Run `node --test test/friendcup-room.test.js test/lobby.test.js test/interruptions.test.js` once. Do not run the full suite.

## Report
Write `game/rounds/round-01/reports/review-friend-cup-online.md`, commit it on your own branch, and pass it with `--report-path`. List each finding as **must fix**, **should fix** or **note**, with the file, the line, and a concrete case that goes wrong. Stay under 30 lines. If nothing is wrong, say so.

Known already, do not report: `PROTO` is 4 on this branch and becomes 5 when merged, because `develop` used 4 for the Subway stage.
