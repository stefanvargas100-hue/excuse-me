# Round 02, batch 19c: Independent review of Cup presets

**Reviewer:** Claude Sonnet 5.5, high. Why: online protocol change built by Codex; the second review uses the other model.
**Risk:** high. You review and test; you do not fix production code.

## What to review
Branch `stefanvargas100-hue/cup-presets` (head c2f0613; implementation 4cb9410, fixes c4bd12a), against its base on `develop`. Plans: `game/rounds/round-02/batch-19-cup-presets.md` and `batch-19b-fixes.md`. Builder report: `game/rounds/round-02/reports/batch-19-cup-presets.md`. Rules for online work: `game/areas/online.md`.

Start a new branch from the cup-presets head; your worktree is already on it.

## Check
1. **Validation:** a received Cup setup or roster `cupCfg` with stages that are not exactly one preset (reordered, repeated, extra, too short, Airport alone, non-integers, huge arrays, getters/prototype tricks) is rejected on guests, and cannot crash or stall the room. `m.rounds.length` is bounded by the validated preset. Look especially at `cupFromMessage`, the roster receive path (`stages.slice()` no longer caps length) and `setRoomCup`.
2. **Cup length:** everything that assumed 4 races now follows `stages.length`: end of Cup, eyebrow text, standings, award animation, rematch, host handover mid-Cup, reconnect state for a 2-race Cup. Search for remaining uses of `CUP_RACES` and literal 4s in Friend Cup code.
3. **Identity:** `FRIEND_CUP_RULES` 3 plus the stage list in the run category does not alter Classic, Daily, Weekly, Challenge, solo NYC Cup or plain friend race identities, and nothing from older saves is rewritten.
4. **Lobby:** preset change clears guest Ready; bot count from batch 18 still clamps on join/leave; race and Elimination formats keep the expandable groups. Look at the 320 and 390 screenshots in `batch-19-evidence/` and say whether anything is clipped or unreadable.
5. **Tests are real:** the new tests would fail if presets were not enforced (try one quick mutation, then revert it).
6. Stay within the plan: list any file changed outside the "May edit" lists.

## May edit
New test files, `game/rounds/round-02/reports/batch-19c-review.md`, `game/rounds/round-02/batch-19c-evidence/`. No production code.

## Report
Verdict PASS or HOLD. Each finding gets a severity (S1-S4), file and line, and a failing test or exact reproduction where possible. Run focused tests, then `npm test` once, `npm run build` and `git diff --check`. Keep the report to 10 lines plus a findings list.
