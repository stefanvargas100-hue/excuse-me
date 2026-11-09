# Area guide: gameplay

Rules, modes, scoring, progress and saves.

## Where things live
- `src/sim/game.js`: run flow and results screens. Shared by many batches, so change it carefully.
- `src/sim/race.js`: bots, standings, finish and race bests. `crowd.js`, `people.js`, `traffic.js`: the crowd.
- `src/sim/runopts.js`: run categories, and what each may pay or record.
- `src/sim/`: `cup.js`, `elim.js`, `practice.js`, `tutorial.js`, `powerups.js`, `modifiers.js`, `replay.js` (ghosts), `scoring.js`, `clean.js`.
- `src/config/`: tuning, stages (`levels.js`), routes, stats, challenges. `src/save/`: progress and storage. `src/input/`: touch controls.
- `test/harness.js` runs the game without a browser.

## Rules that must hold
- **Stage indexes never change:** airport 0, nyc 1, shibuya 2, park 3, bridge 4.
- **Every run has a category.** New modes set their own policy in `runopts.js`, and unknown categories get the strictest one. Practice, Challenge and Cup must not leak into ordinary records.
- **Compare fair times only.** Bump the rules version or course tag when a change makes old times or ghosts unfair (`recordKey`, `courseTag`, `src/config/routes.js`).
- **Never break existing saves.** Outfits, unlocks, records and storage keys must survive any change.
- **Keep the seeded random stream stable.** Classic, Daily and Weekly must not change because of unrelated features. `test/rotation-stage.test.js` protects stage rotation, so do not remove its compatibility guard casually.
- **Pay once.** Rewards go inside the once-per-run `scored` guard, so a redrawn results screen cannot pay twice.
- **Shared boundaries:** `halfAt` in `src/config/levels.js` is used by both movement and scenery. The player, bots and crowd must agree on it.

## Useful tests
`sim`, `race`, `modes`, `rewards`, `runopts`, `cup-flow`, `cup-model`, `elim`, `practice`, `routes`, `rotation-stage`. Run one with `node --test test/<name>.test.js`.
