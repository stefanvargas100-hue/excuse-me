# Round 02, batch 19b: Cup preset fixes (same worker, same branch)

The lead reviewed 4cb9410. The preset logic, validation, PROTO 11 and the `FRIEND_CUP_RULES` identity are accepted. Three things block integration.

## 1. Move the bot-finish check to a deterministic harness
The check at `test/friendcup-room.test.js` lines 806-808 and 810-812 runs bots inside the room fixture with `await settle()` between ticks, so timing varies from run to run. Also, a bot that does not finish does not block a Friend Cup: it gets a distance place (comment at line 806). So the room test does not need every bot to cross the line.
- In the room test, remove the requirement that all bots finish (line 808) and let the race end as other Cup tests do. Keep the checks that the right number of rounds is recorded, standings agree between host and guest, and the Cup ends after `stages.length` races.
- Add a deterministic check in the style of `test/race.test.js` line 37 (`race(...)`, fixed `DT`, no room, no `await` in the loop): Race vs bots on Shibuya (2) and Takeshita (6) with 7 bots at Medium, fixed seeds, 3 seeds each. All bots must finish within 600 simulated seconds (the existing `bot-lines` limit). Put the per-seed bot finish times in the report.
- If bots still fail to finish Takeshita in that harness, stop and report the seed and times. Do not tune bot AI.

## 2. Make the full suite pass
- Update the stale `PROTO` and airport expectations in `test/cap-wire-compatibility.test.js`.
- You may edit `tools/room-sim.mjs` to use a preset (New York `[1,3,4,5]`) instead of custom stages. Change nothing else in that file.

## 3. Small cleanup
`src/sim/friendcup.js` now imports `cupPresets` from `src/ui/friend-groups.js`; sim code should not depend on UI code. Move `cupPresets` (and `stageGroups` if it needs it) into `src/sim/friendcup.js` or a new `src/sim/cup-presets.js`, and have `friend-groups.js` import from there.

## Evidence
`batch-19-evidence/bot-check.txt` and `full-suite.txt` are committed empty (1 byte). Fill them with the real summary lines, or delete them.

## May edit
Everything batch 19 allowed, plus `test/cap-wire-compatibility.test.js`, `tools/room-sim.mjs` (stages only) and `src/sim/cup-presets.js` (new).

## Done when
Focused tests pass, `npm test` passes in full, `npm run build` and `git diff --check` pass. Update `reports/batch-19-cup-presets.md` (10 lines) and report with worker_done.
