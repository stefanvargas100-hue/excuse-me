# Round 1, batch 3: medal times for each stage

**Builder:** Codex, defaults. Why: well-defined, touching saved data only by reading it.
**Risk:** medium, because it reads race records. Second review: no

## Goal
Give solo players clear skill targets: Bronze, Silver and Gold race times for each stage. Medals are earned by finish time alone and pay nothing for now.

## Read first
- `game/areas/gameplay.md`
- `studio/skills/test-first/SKILL.md`
- `src/sim/race.js`: `raceBest`, `DIFFICULTIES`, `fmtTime`
- `src/ui/menus.js`: the stage card code around `raceBest(L.id)`
- `src/sim/game.js`: `showRaceEnd`, around the `setStat('sBest', ...)` line

## Build
1. **`src/config/medals.js`:** fixed `{ bronze, silver, gold }` times in seconds for each stage id, plus pure functions: `medalFor(stageId, seconds)` returning `'gold'`, `'silver'`, `'bronze'` or `null`, and `nextMedal(stageId, seconds)` returning the next target, or `null` at Gold.
2. **Stage cards:** in race format, add the medal earned from the existing race best to the line that already shows distance and best time. Do not change anything for Classic or other formats.
3. **Race results:** show the medal earned this run, and the time needed for the next medal. It states a target only, with no advice.

## Setting the times
These are starting values, and the Director tunes them after playing. Use a throwaway script with `test/harness.js`, which is not committed, to run each stage several times and record typical bot finish times:
- **Bronze:** typical Easy bot time, rounded up to a whole second.
- **Silver:** typical Medium bot time, rounded up.
- **Gold:** typical Hard bot time, rounded up.

Each stage must have Gold faster than Silver, and Silver faster than Bronze. Put the measured numbers in your report. If the measurements do not produce that order, stop and report rather than inventing times.

## Requirements
- **Derive medals from the existing race best.** Add no storage keys, so existing saves earn their medal automatically.
- **Only ordinary races against bots.** Friend rooms, Cups, Elimination, Practice, Weekly Challenge and Classic show no medals.
- **Exactly on a medal's time earns it.**
- **A medal is the same on any bot difficulty,** because it is a time on the clock.
- **Words:** use only "Gold", "Silver", "Bronze" and the time. No advice or explanations.

## May edit
- `src/config/medals.js`, `test/medals.test.js` (new)
- `src/ui/menus.js`, `src/sim/game.js`, `index.html`, `style.css`, only as needed for the display
- `game/areas/gameplay.md`, one line on where medal times live
- `game/rounds/round-01/reports/batch-03-medal-times.md` (your report)

## Must not change
- XP, rewards, unlocks, scoring, or the simulation.
- Any storage key or the way race bests are saved.
- `src/sim/splits.js` or `src/sim/replay.js`.

## Done when
- `test/medals.test.js` covers each boundary time, the order of times on every stage, `nextMedal`, and, through the harness, that medals show on an ordinary race and not in a Cup or friend room.
- Each test failed on its actual check before implementation.
- `npm test`, `npm run build`, `npm run test:fit` and `git diff --check` against your base commit pass.

## Left for a person
- Whether the targets feel fair and motivating on a real phone.
