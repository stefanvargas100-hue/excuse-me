# Round 02, batch 24c: review fixes for room bots

**Builder:** the original batch 24 worker (Claude Opus, high).
**Risk:** high. A fresh Claude Sonnet worker re-reviews this before merge.

The independent review (`stefanvargas100-hue/room-bots-review`, a0893e6, report `game/rounds/round-02/reports/batch-24b-review.md`) gave HOLD. First merge that branch into yours, so you have its tests: `git merge stefanvargas100-hue/room-bots-review`.

## Fix
1. **S2, host freezes unfinished humans.** `src/sim/game.js:213` skips `stepRemotes` whenever `runsBots`. Once the host and every bot have finished, `hostField` stops, so human racers who are still running stand still on the host's screen.
   - The host must keep sampling human remotes after bot simulation stops.
   - Cup hosts and 0-bot rooms must keep their current behaviour.
   - Done when `test/room-bots-review.test.js` passes unedited.
2. **S3, Start off-screen at 390x844.** In the plain host lobby, Start sits at y=861 on a 390x844 screen.
   - Make the Race and Elimination host lobby fit so Start is fully visible without scrolling at 390x844, for example by putting Bots and difficulty on one compact row.
   - At 320x568 it may scroll as before.
   - You may edit `style.css` (rules for these lobby controls only), `index.html` (those controls only) and `src/ui/friend.js`.
   - Recapture the host lobby screenshots with your `capture.mjs` and report the Start button's y and height from `capture.json` at both sizes.
3. **S3, 0-bot equivalence is not proven.** Your test compares unique message types against a hard-coded baseline.
   - Write a script that runs the same 0-bot plain and Elimination scenarios and records every message in order, with payloads, plus ghosts and places. Volatile fields such as timestamps and session ids may be normalised; name them.
   - Run it on `develop` (commit 656ec3b or later, before your batch), commit its output as a fixture in `batch-24-evidence/`, and make the test compare your branch against that fixture.
   - The only allowed difference is `PROTO` 13 vs 14. Name any other difference and justify it in the report.

## May edit
The files above, `src/sim/game.js` (the after-finish stepping only), `test/room-bots.test.js`, and the batch-24 evidence folder.

## Done when
- Both review tests pass unedited.
- The fixture-based 0-bot test passes.
- Start is visible at 390x844, with numbers from `capture.json`.
- `npm test`, `npm run build` and `git diff --check` pass.
- Update `reports/batch-24-room-bots.md`, or add `reports/batch-24c-fixes.md`, at most 10 lines.
