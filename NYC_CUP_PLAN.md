# NYC Cup plan

Local single-player only. Three bot races in a fixed order: Fifth Avenue (index 1) -> Central Park (3) -> Brooklyn Bridge (4). No online/friend-room cup; the room protocol is not touched.

## Decisions
- **Entry**: Race vs bots > format chip "NYC Cup" > one card starts the cup.
- **Format**: each round is an ordinary bot race (3 bots, the player's chosen bot difficulty, fixed for the whole cup when it starts).
- **Round points**: 1st 10, 2nd 7, 3rd 5, 4th 3. Cup total = sum of the three rounds.
- **Placement / ties**: total points, then round wins, then the better finish in the final round. The player always finishes a round (the race ends when they cross the line), so no DNF case exists locally.
- **Bots**: the same three named bots race all three rounds (names drawn once at cup start). Their gear is re-rolled per round, as in any race.
- **Outfit**: the saved look is snapshotted into the run at cup start (`run.outfit`), so the whole cup uses one outfit and nothing is written back to the save.
- **Weather / variant**: each round uses the stage's own look, seeded from the cup seed + round index, so a cup is repeatable per seed and does not consume the ordinary seeded stream.
- **Run category**: `cup`, policy `xp:false progress:false records:false scores:false ghosts:false`. A round therefore pays nothing, files no race record, no ghost, no board entry, no unlock tallies.
- **Rewards**: only a *completed* cup pays, once: a fixed XP award by cup place (60/40/25/15), no unlock tallies. Paid inside the once-per-round `scored` guard, so a re-rendered results screen cannot pay twice.
- **Records**: personal best cup = most points, then lower total time. Own key `excuseme_cup_nyc:r1` (rules version in the key). Never mixed with the single-stage race records.
- **Restart / quit**: no per-round restart. Pause shows "Abandon cup" instead of Restart/Main menu. Abandoning, quitting to menu, or closing mid-cup records and pays nothing. "Race again" on the final screen starts a fresh cup.
- **Between rounds**: round results screen with the round's standings and a cup table; the `Next level` button becomes `Next round: <stage>`. Final screen: cup table, place, best, XP.

## Batches (each test-first)
1. **Cup model** `src/sim/cup.js` (pure): stage order, points table, `addRound`, `cupStandings` with tie-breaks, `cupRecord` compare. Tests: points, tie-breaks, order, record comparison.
2. **Game flow** in `src/sim/game.js`: `startCup`, round end hands the result to the cup, `nextCupRound`, `abandonCup`, completion pays once. Tests: full three-round cup through the harness; abandoned cup leaves storage untouched; XP paid once; outfit/save unchanged; record only improves.
3. **UI**: menu entry, round/final results, pause adjustments, 320 x 568 fit.
4. **Review/release**: full suite, build, screenshots (desktop, 390 x 844, 320 x 568), `git diff --check`, checkpoint notes.

## Out of scope
Online/friend-room cups, cup leaderboards, Supabase changes, physical-device playtest.
