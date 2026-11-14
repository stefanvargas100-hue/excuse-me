# Round 02, batch 24d: re-review of room bots

**Reviewer:** Claude Sonnet 5.5, high. Why: independent of the Opus builder, under the Director's Claude-only rule.
**Risk:** high. You review. Do not rebuild.

## Scope
Branch `stefanvargas100-hue/room-bots` at 65742e3, which is your base. Read these:
- the plan `game/rounds/round-02/batch-24-room-bots.md`;
- the first review `game/rounds/round-02/reports/batch-24b-review.md` (HOLD);
- the fix brief `game/rounds/round-02/batch-24c-fixes.md`, including the lead reply at the end;
- the reports `reports/batch-24-room-bots.md` and `reports/batch-24c-fixes.md`.

## Check
1. Each 24b finding is closed:
   - **S2:** `test/room-bots-review.test.js` passes and was not edited since a0893e6 (`git diff a0893e6 -- test/room-bots-review.test.js` is empty).
   - **S3 lobby:** Start is fully visible at 390x844 in the plain host lobby. Check `capture.json`. Only the Race/Elimination host lobby changed; the Cup and guest lobbies did not.
   - **S3 equivalence:** the fixture was really recorded on `develop` before the batch. Rerun the builder's recording script on `develop` 656ec3b in a temporary worktree and confirm it matches the committed fixture. Confirm the test compares order and payloads, not just message types.
2. The 24c diff (`git diff 0d78a68..65742e3 -- src style.css index.html`) stays within the brief and changes nothing for Cup hosts or 0-bot rooms.
3. Repeat the 24b protocol checks briefly on the final code:
   - a guest refuses bad `field` messages and undeclared bots;
   - bots and players share lineup and elimination rules.

## May edit
Tests only, plus your report `game/rounds/round-02/reports/batch-24d-rereview.md`. No source changes. Remove any temporary worktree you create.

## Done when
- The report gives PASS or HOLD, with findings S1-S4 (file, line).
- `npm test` and `git diff --check` pass, or failing tests demonstrate a reported defect.
