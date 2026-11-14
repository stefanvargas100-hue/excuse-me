# Round 02, batch 24b: independent review of room bots

**Reviewer:** Codex, defaults. Why: online batch, built by Claude, so it needs a review by the other model.
**Risk:** high. You review. Do not rebuild.

## Scope
Branch `stefanvargas100-hue/room-bots`, which is your base. Review its diff against `develop` (`git diff develop...HEAD`). The plan is `game/rounds/round-02/batch-24-room-bots.md`, and the builder's report is `game/rounds/round-02/reports/batch-24-room-bots.md`. Read both first.

## Check
1. **Protocol safety:**
   - The new `field` message and the bot `bots` rows must be validated on guests. Bad field messages must be refused: ids colliding with players, too many bots, bad difficulty or names, a field that disagrees with the start seed, and a field arriving after the start.
   - A guest never runs or draws an undeclared bot.
   - Write at least one adversarial test the builder did not write.
2. **0-bot equivalence:** a room with no bots sends the same messages and gets the same places, Elimination order and ghosts as `develop`. Check that the builder's equivalence test really compares against the old behaviour.
3. **Cup unchanged:** Friend Cup traffic, bots and host handover behave as on `develop`. Existing Cup tests must pass unedited apart from `PROTO`.
4. **Fairness:**
   - Bots and players share the start-lineup rules.
   - Elimination knocks out a bot exactly as it would a player.
   - When the host leaves mid-race, bots end unfinished and players race on.
5. **Off-plan `game.js` changes** (`hostField`, `runsBots`, the after-finish and eliminated-host stepping):
   - Confirm a plain host with no bots and every guest step exactly as before.
   - Confirm a host with bots stops stepping once every bot's finish is sent.
6. **Lobby fit:** the builder reports that Start needs a short scroll at 390x844 in the plain host lobby. Confirm it from the batch-24 evidence. Rate it S1-S4. Do not fix it.

## May edit
Tests only (new `test/room-bots-review.test.js`) and your report. No source changes. Report each defect with a severity, file and line.

## Done when
- Report `game/rounds/round-02/reports/batch-24b-review.md` gives a verdict, PASS or HOLD, with findings S1-S4.
- `npm test` passes with your added tests, or the failing tests demonstrate the defect you report.
- `git diff --check` passes.
