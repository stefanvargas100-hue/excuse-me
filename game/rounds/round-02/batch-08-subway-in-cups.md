# Round 02, batch 08: Subway Platform joins the Cups

**Builder:** codex, defaults. Why: a small, exact change with test updates.
**Risk:** low. Second review: no.

## Goal
The Director approved Subway Platform for Cups on 2026-11-09, to be playtested afterwards. The NYC Cup becomes 4 races: Fifth Avenue, Subway Platform, Central Park, Brooklyn Bridge. Friend Cup hosts may also pick Subway.

## Read first
- `src/sim/cup.js`, all of it (46 lines)
- `src/sim/friendcup.js`: `stagesOK` (line 8)
- `src/ui/friend.js`: `CUP_STAGE_MAX` (line 11) and the comment on line 9
- `test/cup-model.test.js`, `test/cup-flow.test.js`, `test/friendcup.test.js` line 56

## Change
1. `src/sim/cup.js`: `CUP_STAGES = [1, 5, 3, 4]`; `CUP_RULES = 3`, so records are filed under the new key and the old best stays under its old key. Update the top comment ("Three bot races").
2. `src/sim/friendcup.js`: `stagesOK` accepts stages 0-5. Stage 6 or higher stays refused: a later stage is added after the Director tries it.
3. `src/ui/friend.js`: `CUP_STAGE_MAX = 5`, and update the comment.
4. Keep the points and XP tables as they are. A full Cup is now worth up to 40 points.

## Tests first
Update these to the new format and watch them fail before changing the code:
- `cup-model`: `CUP_STAGES`, and complete after four rounds.
- `cup-flow`: the stage order (`nyc`, `subway`, `park`, `bridge`), loops of 3 rounds become 4, the `r2` keys become `r3`, the maximum points become 40, the "old key is kept" test uses `r2`, and every Cup stage including Subway fits 8 starters level with the player.
- `friendcup`: stage 5 becomes valid, so change the `[0,1,2,5]` example to `[0,1,2,6]`, and add a valid Cup that uses stage 5.

## May edit
The 3 source files and 3 test files above, plus `game/rounds/round-02/reports/batch-08-subway-in-cups.md`. `PROTO` stays 5: `develop` already ships a new version to `main`.

## Must not change
Points, XP, other stage lists, `PROTO`, and any other file. If anything else needs a change, stop and report.

## Done when
Focused tests, then `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
Whether a 4-race NYC Cup with Subway feels right, on the playtest link.
