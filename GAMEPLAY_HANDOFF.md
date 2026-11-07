# Handoff: Gameplay expansion (Excuse Me)

Paste this to another model working on the same task. Written 2026-11-07.

## Task

Implement the six agreed gameplay mechanics for the Excuse Me game, one small batch at a time. The authoritative plan is `GAMEPLAY_BATCH_PLAN.md` in the repo root. Read it fully first; this file is only a summary and a starting point.

The six mechanics are clean-race rewards, bots using Excuse me, a practice course, stage route choices, elimination races and a weekly supplied-outfit challenge.

## Where things stand

- Repo: `C:\Users\stefa\orca\workspaces\Excuse-Me\Gameplay` (git worktree). Branch: `stefanvargas100-hue/Gameplay`. Main branch: `main`.
- Baseline commit: `75f3cd4` (324 passing tests, shared room pause, glass-separated collisions, x16 combos).
- **No batch has been started.** All batches B0-B7 are "Planned". No gameplay code has been changed.
- Uncommitted: `GAMEPLAY_BATCH_PLAN.md` (new, untracked), a 2-line pointer to it added in `NEXT_STEPS.md`, and this file.
- Nothing has been published. Do not push or deploy unless Stefan authorizes it.
- Implementation has not been authorized yet. Starting B0 requires an instruction to implement.

## Order of work

B0 mode boundaries and reproducible setup -> B1 clean-race rewards -> B2 bots use Excuse me -> B3 practice course -> B4 route choices (4a Airport, 4b NYC, 4c Tokyo) -> B5 elimination races (5a bots, 5b private rooms) -> B6 weekly challenge -> B7 combined balance and release check.

Only one batch is Active at a time. Each batch goes Planned -> Active -> Implemented -> Validated -> Ready for review -> Shipped.

## Rules to follow

- Use the `test-first` skill for simulation, scoring, persistence and network changes. Reproduce the missing behaviour first, and never weaken assertions to get a pass.
- Run focused tests, the full suite and the production build for each batch.
- Check the change in a running game through Orca's browser, including a phone-sized layout. Multiplayer batches need two clients. Say plainly what was simulated and what was not tested on a physical phone.
- After each batch, update `GAMEPLAY_BATCH_PLAN.md` and `DECISIONS.md` with the checkpoint template from the plan.
- Keep the work on the Gameplay branch. A batch is Shipped only after its commit is on remote main, CI and Pages succeed, and the deployed build is checked. Roll back with a revert, never a destructive reset.
- Treat `ROADMAP.md` and the older parts of `NEXT_STEPS.md` as historical, not as the current feature list.

## Rules that must not change (unless Stefan says so)

- Combo growth stays at one level per three passes, capped at x16.
- Glass separates collision interactions. Open belt ends and the divider between belts stay open.
- Any racer can pause a room, and every pauser must become ready or leave before it resumes.
- Private-race XP and unlock exclusions stay, and shared power-ups stay disabled.
- Practice and supplied-outfit runs never change the saved outfit, XP, unlocks, ordinary bests or leaderboards.
- Classic, Daily and Weekly score modes, saves and existing records keep working. New rules get their own record or category keys.

## Suggested first step (B0)

1. Run `git status`, `git log -5` and the test suite to confirm the 324-test baseline.
2. Inventory the existing mode, seed, ghost and leaderboard paths. The likely files are `sim/game.js`, `sim/state.js`, `sim/replay.js`, `config/stats.js`, `save/level.js` and `online/boards.js`, all under `src`.
3. Define run options for rules version, layout seed, supplied outfit, progress eligibility and record category. Existing modes keep their defaults.
4. Write failing tests for the B0 acceptance checks:
   - A practice-configured run can't submit scores or farm progress.
   - A supplied outfit doesn't replace the saved one.
   - The same configuration gives the same layout.
5. Implement the minimum to pass them, then follow the checkpoint steps.

## Open points for Stefan

- The numbers in the plan are starting values to tune by playtesting. This applies to the B1 XP schedule (+2, +4, +6, +8, then +10 per further segment, capped at +50 per race).
- The plan says B6 may need a server schema or RPC change. It needs a separately tested, versioned migration before submission is enabled.
