# Round 02, batch 20: Tutorial movement parity

**Builder:** Claude Sonnet 5.5, medium. Why: clearly defined offline batch; Codex weekly limit is low and runs batch 19.
**Risk:** medium (first-run experience). Second review: no; lead review.

## Goal
The first-run tutorial teaches the same movement the player gets in Classic: build stats, speed multipliers and recovery are active during the scripted steps instead of being switched off and turned on at handover. The player should not feel the controls change when the tutorial ends.

## Read first
- `game/areas/gameplay.md`
- `game/rounds/round-02/batch-13-implementation-plan.md`: section "Tutorial and practice" (line 34 onward) and "14C" (line 64 onward). This is the agreed design; follow it.
- `src/sim/tutorial.js`: whole file (`TUT`, `beginTut`, `tutTick`, `endTut`).
- `src/sim/game.js`: `movePlayer` stat selection (about lines 57-71), `tick` lines 117-125, `start` lines 515 and 537 only.
- `src/sim/practice.js`: `beginLesson`, `clearBoosts`, `restartLesson` (read only unless the rule below needs it).
- `studio/skills/test-first/SKILL.md`.

## Rules
- During the tutorial, `S.moveStats` holds the player's frozen build effects (same as Classic start at line 515), so build stats and pace multipliers apply. Customising the look later must not change a running attempt.
- Random crowd chunks and pickups stay suppressed until handover (`endTut`), as now. Handover restores pickups with no restart.
- Keep the step order, step text and every completion predicate (steer, dash, burst, shout, perfect dash, perfect shout). Keep the safe replacement of practice targets. Move target placement or timing only if a slow or fast build cannot reach an objective, and never change skill thresholds.
- Practice lessons already use race movement with a fixed medium outfit: keep them as they are. Touch `practice.js` only if a test shows a retry leaks boosts or input.
- Classic scoring after handover is unchanged, so no competition identity bump. If you find Classic scoring physics would change, stop and report.

## May edit
- `src/sim/tutorial.js`
- `src/sim/game.js`: the tutorial setup and handover in `start` (line 537) and `tick` (lines 117-125) only. Batch 19 edits game.js lines 417 and 506 at the same time; do not touch them.
- `src/sim/practice.js`: only as allowed above
- `test/tutorial.test.js`, `test/practice.test.js`, `test/classic-movement.test.js`, `test/runopts.test.js`; new test files
- `game/rounds/round-02/reports/batch-20-tutorial-movement.md`

## Must not change
- Races, Daily, Weekly, Challenge, Friend modes and their identities. Pickup rules, stats tables, constants, steering thresholds.
- Tutorial screen layout and wording. Art worlds. Live database, dependencies.

## Done when
- New tests failed first and now pass: build effects active during every tutorial step; each step completes with small and large builds and with low stamina; handover keeps moveStats, restores pickups and needs no restart; a practice retry clears boosts and input; no coins, records, ghosts or Daily/Weekly attempt are written by the tutorial.
- `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
- First-run tutorial on a phone with a small and a large build: does movement feel the same before and after handover, and are the hints still true?
