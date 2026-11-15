# Round 02, batch 27c: make Tsukiji's wet patches appear in real runs

**To:** the batch 27 builder (dispatch ctx_c2c55aa0d2ff), on `stefanvargas100-hue/stage-features`. 2026-11-14, from the lead.
**Why now:** Director decision 2026-11-14: fix it inside batch 27, so Tsukiji's layout, records and the room version change once.

## The bug (you found it)
`src/sim/people.js` places a wet patch when `z0 % 32 === 16`, but real runs start chunks at 14 m and step by 4, so the test is never true. Tests pass because they generate chunks from 0.

## Build
1. Place wet patches by chunk number, the way `tsukijiPorter` does, one per 32 m as designed. Keep the patch itself (side, size, position in the chunk) as it is.
2. Porters must still never be on a wet patch, and a patch must not land where a porter starts. Keep the existing porter tests true against the patches real runs now get.
3. Tests first: a test that builds the course the way a real race does (chunks from 14 m) and fails today because no patch appears. Change the Tsukiji tests that only pass from chunk 0 so they would have caught this.
4. `test/security.test.js`: re-take the stage 7 hash only. Stages 0-6 and 8 must match unedited.

## Check and report
- 4-bot Tsukiji races, seeds 1 to 20: every bot finishes, none stuck, slip-throughs no worse than before. Bots have never met a wet patch in a real run, so look at this properly.
- Medians for Tsukiji both ways (the stage test's log and your 20-seed sweep), against develop. Change Tsukiji's `MEDAL_TIMES` only for a medal where both measures move the same way by more than 3%; give the numbers either way. Leave the other three stages' targets alone.
- One screenshot of a wet patch in a real run in the emulated 390x844 phone. The lantern-market world was drawn without ever showing one: if it is hard to see or looks wrong, say so. Do not repaint it and do not touch the style files.
- `npm test` once, `npm run build`, `git diff --check`. Update `reports/batch-27-stage-features.md` (keep the 10-line block current) and send `worker_done`.

## May edit
`src/sim/people.js` (wet-patch placement, and porter placement only if item 2 needs it), `src/config/medals.js` (Tsukiji, by the rule above), `test/tsukiji.test.js`, `test/batch27-features.test.js`, `test/security.test.js` (stage 7 hash), `batch-27-evidence/`, the report. Anything else: stop and ask.

## Also decided, no work for you
The Director accepts that the lift and the gate-change boards do not appear in friend rooms for now.
