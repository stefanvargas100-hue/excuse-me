# Round 02, batch 18e: re-review of the two S2 validation fixes

Same reviewer, same branch (`stefanvargas100-hue/lobby-review`). Builder fixed your two S2 findings in a053399 (report 6ee302b) on `stefanvargas100-hue/lobby-groups` and reports your test file passing unchanged, 879 full-suite tests, build and diff check passing. Merge that branch into yours, then decide PASS or HOLD. Review only the fix: `git diff 89a841f..HEAD -- src test`. Do not fix production code.

## Check
1. Both of your regressions pass and `test/batch18-review-input.test.js` is byte-identical to 89a841f.
2. No received `cupCfg` value can throw or be used in text or arithmetic: objects, arrays, floats, 8, -1, numeric strings, null. An invalid config shows as the host still choosing and cannot start.
3. The new `cupCfg.agreed` gate in `cupFromMessage` (lead's questions from reading the diff; answer each with a test or the exact line):
   - Mid-Cup updates after the first race still pass the gate on every guest, including after a player leaves and a bot takes over, and after host handover to a guest. `agreed` is only set on the host inside `sendRoster` and on guests on roster receive while `!raced`.
   - A guest that reconnects mid-Cup, and a rematch or a second Cup in the same room, still receive and accept Cup state as they did on develop.
   - A join or leave between the last config and the setup: an honest start either succeeds or is cancelled cleanly for everyone. It must never half-run or leave different racer lists.
4. 8-racer `fill` Cups behave as on develop. PROTO 10, `START_PROTOCOL` unchanged, no UI or style change in the fix.

## May edit
- New tests in `test/batch18-review-*.test.js`
- `game/rounds/round-02/reports/batch-18e-rereview.md`, `game/rounds/round-02/batch-18e-evidence/`

## Done when
- Each finding has a severity, a reproducing test or steps, and file and line.
- `npm test` once, `npm run build`, `git diff --check`.
- Report of at most 10 lines starting with PASS or HOLD, committed.
