# Round 02, batch 22c: Independent review of finish spectating

**Reviewer:** Claude Sonnet 5.5, high. Why: online race flow built by Codex; the second review uses the other model.
**Risk:** high. You review and test; you do not fix production code.

## What to review
Branch `stefanvargas100-hue/spectating` (implementation ab523cf, validation 4e18968) against its base on `develop` (64d4705). Plans: `game/rounds/round-02/batch-22-spectating.md` (including the lead ruling at the end) and `batch-22b-finish.md`. Builder report: `reports/batch-22-spectating.md`. Online rules: `game/areas/online.md`.

## Check
1. **No influence:** a spectator cannot change any racer, its own time, place, Cup points, XP or rewards. Finished phones send exactly the same messages as before the batch (the `stepRemotes` sampleOnly path). Host-run bots give identical results with the host watching or not.
2. **Flow:** auto-spectate only when someone is still running; target cycling skips finished and departed racers; auto-switch on finish and disconnect; stop watching is one-way and shows the same results; the last finisher goes straight to results. Elimination knock-outs, Friend Cup next race, pause, host handover, reconnect, rematch and award animation still work. Solo modes unchanged.
3. **Lead observations from `batch-22-evidence/320-guest-human.png`:** a "NEAR-MISS STREAK" banner shows while spectating (whose is it? a spectator's own banners or another racer's events must not mislead); the spectate panel covers about a third of the screen and uses unstyled buttons. Say whether either is a defect (with severity) or acceptable placeholder.
4. **Tests are real:** one quick mutation (for example, let spectator input reach a racer) makes a test fail; revert it.
5. Scope: list any file changed outside the plan's "May edit" list plus the approved `stepRemotes` edit.

## May edit
New test files, `game/rounds/round-02/reports/batch-22c-review.md`, `game/rounds/round-02/batch-22c-evidence/`. No production code.

## Report
Verdict PASS or HOLD. Each finding: severity (S1-S4), file and line, failing test or exact reproduction. Run focused tests, then `npm test` once, `npm run build` and `git diff --check`. 10 lines plus a findings list.
