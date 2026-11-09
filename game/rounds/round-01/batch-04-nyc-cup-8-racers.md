# Round 01, batch 04: NYC Cup at 8 racers

**Builder:** codex, defaults. Why: clearly defined, and well covered by existing tests.
**Risk:** low. Second review: no

## Goal
The solo NYC Cup races 8 racers instead of 4, with points and XP for all 8 places. It stays at 3 races.

## Read first
- `game/areas/gameplay.md`
- `src/sim/cup.js`
- `src/sim/race.js`: `BOTS`, `makeBot`, `initRace`
- `src/sim/game.js`: the `initRace` call near line 451, `startCup`, `showCupEnd`
- `src/ui/menus.js`: the NYC Cup card near line 112
- `tools/fit-check.mjs`: the `end` route near line 134
- `test/cup-flow.test.js`, `test/cup-model.test.js`

## May edit
- `src/sim/cup.js`, `src/sim/race.js`, `src/sim/game.js`, `src/ui/menus.js`
- `style.css`, only if the results list needs it to fit
- `tools/fit-check.mjs`, only to add the route below
- `test/cup-flow.test.js`, `test/cup-model.test.js`
- `game/rounds/round-01/reports/batch-04-nyc-cup-8-racers.md`

## Rules
| Item | Value |
|---|---|
| Bots in a Cup | 7, plus the player |
| `POINTS`, 1st to 8th | 10, 8, 6, 5, 4, 3, 2, 1 |
| `XP`, 1st to 8th | 60, 45, 35, 25, 20, 15, 10, 5 |
| `CUP_RULES` | 2 |
| NYC Cup card text | Says 8 racers and the new points, in one short sentence that fits the card |

Add two looks to `BOTS` so all 7 bots look different, and raise the limit in `initRace` as needed.

## Must not change
- **Race vs bots stays 4 racers, and its bots and random sequence stay the same.** Friend rooms, Elimination and lessons also keep their current bot counts.
- `CUP_STAGES`, and stage indexes.
- Old saved NYC Cup bests stay in storage under their old key.
- Cup XP is still paid once per Cup.

## Done when
- A new test failed first and now passes for each of: 7 bots in every Cup round, the same 7 bots across rounds, the points table, the XP table, 8 rows in the Cup table, and all 8 racers starting inside `halfAt(z) - 0.5` with no two overlapping on all 3 Cup stages.
- A test confirms Race vs bots still starts with 3 bots.
- `tools/fit-check.mjs` has a new route for the final Cup results, after the last round. Both this route and the `end` route show 8 rows, and all buttons are reachable at all 3 sizes. Run `npm run test:fit` and report its summary line.
- Open the 320x568 screenshots of both routes and confirm the list and buttons are readable.
- `npm test`, `npm run build` and `git diff --check <base commit> HEAD` pass.

## Left for a person
Whether 8 racers stay smooth on a real phone, and whether the start looks right.
