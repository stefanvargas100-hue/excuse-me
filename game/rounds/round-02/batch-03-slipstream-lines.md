# Round 02, batch 03: stop bots forming slipstream lines

**Builder:** codex, defaults. Why: a small rules change plus measuring with the test harness.
**Risk:** medium: it changes how bots race and the medal times. Second review: the lead reviews the numbers.

## Goal
Bots stop lining up behind each other to slipstream, which the Director does not want as a strategy. Slipstream stays as a short boost for passing the person directly ahead. The Director approved fix B and a longer cooldown on 2026-11-09.

## Read first
- `src/sim/race.js`: the `DRAFT_*` constants near line 30, `inDraft`, and the bot's `think()` near line 335
- `src/config/medals.js` and `game/rounds/round-01/batch-03-medal-times.md`, section "Setting the times"
- `test/slipcool.test.js`

## May edit
- `src/sim/race.js`: the bot's lane choice and `DRAFT_COOL` only
- `src/config/medals.js`: the times only, and its top comment
- `test/slipcool.test.js`: only its timings, which assume a 3 second cooldown (lines 26-30)
- A new test file, `test/bot-lines.test.js`
- `game/rounds/round-02/reports/batch-03-slipstream-lines.md` (your report)

## Change
1. **Bots avoid lining up (fix B).** In `think()`, replace the tuck bonus
   `if (o.z - b.z > 0.5 && o.z - b.z < 7 && Math.abs(tx - o.x) < 0.5) c -= 0.6 * fight;`
   with a cost for sitting in someone's lane:
   `if (o.z - b.z > 0.5 && o.z - b.z < 7 && Math.abs(tx - o.x) < 0.6) c += 0.9 + 0.9 * fight;`
2. **Longer cooldown.** Set `DRAFT_COOL` to 6 seconds. It applies to players and bots alike.
3. **Do not change** `PROTO`, the other `DRAFT_*` values, or how a player earns a slipstream.

## Measure, with a throwaway script that is not committed
Use `test/harness.js`, Hard bots, Fifth Avenue (stage index 1), 8 racers, seeds 1-5. Split each race into thirds by time. In each third, record the share of 60 Hz frames where 3 or more bots stand in one line: each within 7 m behind the next and within 0.6 m sideways. Also record the median Hard bot finish time and the share of time bots spend boosted.

Report one table with these rows:
- today's rules
- B with a 3 second cooldown
- B with a 6 second cooldown, which is what ships
- B with a 9 second cooldown, for comparison only

The lead's earlier trial, with 3 seeds, found 63%, 31% and 10% for today's rules and 30%, 9% and 13% for B. If your numbers differ a lot, say so.

## Then re-measure the medal times
Use the method in batch 03, "Setting the times", with the shipped rules on all 6 stages, and update `MEDAL_TIMES`. Put old and new times side by side in the report. If any stage does not come out as Gold faster than Silver, and Silver faster than Bronze, stop and report.

## Test
`test/bot-lines.test.js`: over seeded Hard races on Fifth Avenue, the share of frames with 3 or more bots in a line in the first third stays under 40%. Write it first and watch it fail on today's rules.

## Done when
- The focused tests, then `npm test`, `npm run build` and `git diff --check <base commit> HEAD` all pass.
- The table and both sets of medal times are in the report.

## Left for a person
Whether races still feel good, and whether the new medal times are fair, on the playtest link.
