# Round 1, batch 2: live splits against your best

**Builder:** Codex, defaults. Why: a small, well-defined feature that reuses saved ghost data.
**Risk:** low. Second review: no

## Goal
In a race against bots, show the player how far ahead or behind their best run they are at three points on the course. It is a measurement only. The Director's rule is that the game never explains why or gives advice.

## Read first
- `game/areas/gameplay.md`
- `studio/skills/test-first/SKILL.md`
- `src/sim/replay.js`: `ghostStart`, `ghostStep`, `raceKind`, `wantsGhost`
- `src/sim/scoring.js`: `addPop`
- `test/ghost.test.js`: how tests set up a saved ghost

## Build
1. **`src/sim/splits.js`**, pure with no game state:
   - `splitPoints(goal)` returns the distances at 25%, 50% and 75% of the course.
   - `timeAtZ(pts, step, z)` returns when a saved ghost first reached distance `z`, interpolating between samples, or `null` if it never did. `pts` is the flat `[x, z, x, z, ...]` list, and `step` is seconds per sample.
   - `splitText(delta)` returns one decimal with a sign, such as `-0.4` or `+1.2`. Negative means ahead of your best. Treat a value that would round to zero as `0.0`, with no sign.
2. **`src/sim/replay.js`:** set up splits in `ghostStart`, and check them in `ghostStep`. The first time the player reaches a split point, compare `S.time` with the ghost's time and show it with `addPop`: green `#7ee081` if ahead or level, red `#ff6b6b` if behind.

## Requirements
- **Only in races against bots with a saved best:** use the existing `raceKind` and `wantsGhost` rules, so friend rooms, Cups, Practice, the Weekly Challenge and Classic get no splits. No ghost means no splits.
- **Use `S.ghostPts`:** `S.ghost` can be hidden or cleared during a run.
- **Each split shows once per run,** even if a moving walkway carries the player back and forward over the point.
- **If the ghost never reached a point,** show nothing for it.
- **Numbers only:** no advice, labels or explanations.

## May edit
- `src/sim/splits.js`, `test/splits.test.js` (new)
- `src/sim/replay.js`
- `game/rounds/round-01/reports/batch-02-live-splits.md` (your report)

## Must not change
- Scoring, the simulation or the seeded random stream. Do not call `Math.random` or the game's random generators.
- What ghosts record, how they are saved, or any storage key.
- Friend-room behaviour.

## Done when
- New tests in `test/splits.test.js` cover the pure functions, plus these through the harness: splits appear with a saved ghost, each appears once, nothing appears without a ghost, and nothing appears in a Cup or friend room.
- Each test failed on its actual check before implementation. A missing-file failure does not count.
- `npm test`, `npm run build`, `npm run test:fit` and `git diff --check` pass. Run `git diff --check` against your base commit, because a check after committing compares nothing.

## Left for a person
- Whether the number is readable and well-timed during a real race on a phone.
- Whether it distracts from the crowd ahead.

## Also report
This batch also tests the new report rule in `AGENTS.md`: keep Orca's three-sentence message, and put the full report in the file above.
