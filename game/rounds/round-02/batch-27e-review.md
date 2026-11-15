# Round 02, batch 27e: independent review of the stage features

**Reviewer:** Claude Sonnet 5.5, high. Why: independent of the Opus builder; the batch changes crowds that seeded runs, bots, friend rooms and records depend on.
**Risk:** high. You review. Do not rebuild.

## Scope
Branch `stefanvargas100-hue/stage-features` at 8948da4, which is your base. `develop` before the batch is 8420ed9. Read these, and only what they lead you to:
- the plan `game/rounds/round-02/batch-27-stage-features.md`;
- the report `game/rounds/round-02/reports/batch-27-stage-features.md`;
- the source diff: `git diff 8420ed9..HEAD -- src` (about 150 lines);
- `test/batch27-features.test.js` and `test/batch27-unchanged.test.js`.

The lead's follow-up rulings are summarised here, so you need not read them: the crowd hashes for stages 7 and 8 in `test/security.test.js` were re-taken on purpose; Tsukiji wet patches are now placed by chunk number so they appear in real runs; a push-bar circle closes a notch in the porter's shape. The Director accepts that events (the lift, the gate-change boards) do not run in friend rooms.

## Check
1. **The other 8 stages are untouched.** Rerun `batch-27-evidence/crowd-fixture.js` on 8420ed9 in a temporary worktree and confirm it matches the committed `unchanged-crowd.json`. Say whether the fixture would notice a change in a bot race as well as a solo run (`shove` in `src/sim/race.js` changed; `steady` should exist only on porters and lift passengers).
2. **Porters.** A porter is placed at its chunk start plus the run clock, so it can appear tens of metres beyond the chunk being generated.
   - Can people generated later land on top of it, or can it be culled or left undrawn there?
   - Does it stay 36 m from the next porter and off every wet patch for a whole race? Wet patches are 2.4 m wide at x = +/-1.8; the porter lanes clear them by 0.04 to 0.1 m, so check the margins with the real footprint.
   - In a friend room, do the host and a guest who run at different paces see each porter at the same place at the same time?
3. **Baggage.** A bag spill never crosses a waiting group, whichever is generated first, including when a group lies near the goal or the spill starts beside a group.
4. **Skytree lift.** Passengers stay 4.6 m apart, cross on a timer, and stop at the glass. Nothing about them depends on a racer's position. They stop because locked people keep their speed until the wall clamp zeroes it: confirm that holds if a racer or bot bumps one mid-deck.
5. **Gate Change boards** change no run: the builder's with-and-without test really compares the whole run.
6. **Bots.** The builder counts safety slip-throughs for 4-bot races, seeds 1-20, develop -> branch: Tsukiji 0 -> 1, Skytree 0 -> 0, Baggage 1 -> 2, Gate Change 0 -> 0, all bots finishing. Rerun `batch-27-evidence/bot-sweep.js` for Tsukiji and Baggage, confirm the counts, and say what causes the new Baggage one. Judge whether a human would be held in the same spots.
7. **Medal times.** The builder left `MEDAL_TIMES` unchanged. The plan said to change a stage whose medians moved more than 3%; the stage tests show 4-7% moves on Tsukiji and Baggage while the 20-seed sweep moves the other way. Using the numbers already in `batch-27-evidence/` (do not run large new sweeps), say whether "noise, leave them" is sound, and whether any target is now clearly wrong.
8. **Tests prove what they say.** Pick the two feature tests you trust least, break the code they guard, and confirm they fail. Restore the code.

## May edit
Tests only, plus your report `game/rounds/round-02/reports/batch-27e-review.md`. No source changes. Remove any temporary worktree you create.

## Done when
- The report gives PASS or HOLD, with findings S1-S4 (file, line), and marks each check above as reproduced, reported-not-checked, or failed.
- `npm test` and `git diff --check` pass, or failing tests demonstrate a reported defect.

## Left for a person
Real phones, friend rooms on two phones, and how the features feel.
