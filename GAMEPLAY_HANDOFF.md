# Excuse Me gameplay expansion - model handoff

Copy the prompt below into the next model's session. It describes the inspected workspace on 2026-11-07; the recipient must recheck it because other work may continue.

---

You are continuing the Excuse Me gameplay expansion in the existing Gameplay worktree. Read the repository and its plan before editing. Resume unfinished work; do not rebuild completed batches.

## Objective and scope

Execute `GAMEPLAY_BATCH_PLAN.md` in its documented batch order. The user selected all six mechanics: clean-race rewards, bots using Excuse me, a practice course, stage-specific route choices, elimination races and a weekly fixed-outfit challenge race.

Start by finishing B3 (practice). B0-B2 already have implementation commits and recorded validation. After B3 is validated, continue the remaining planned batches in order, keeping each independently reviewable and updating the checkpoint notes. Follow any narrower scope the user supplies with this handoff.

This handoff does not authorize publication. Keep work on Gameplay. Do not merge/push to main, publish, change live database schemas or modify account/service settings without authorization for that release or external change. Ordinary local implementation, test runs and reversible local fixes do not need repeated confirmations.

## Workspace and inspected state

- Repository/worktree: `C:\Users\stefa\orca\workspaces\Excuse-Me\Gameplay`.
- Shell: PowerShell on Windows. Use `npm.cmd`, not `npm`, because the PowerShell npm shim is blocked by execution policy.
- Branch: `stefanvargas100-hue/Gameplay`.
- Inspected HEAD: `2361239` - Bots use Excuse me with the player's rules (B2).
- Preceding commits: `223a12c` (B1 clean racing), `a39b5b9` (B0 run options).
- Local main and locally recorded origin/main: `75f3cd4`. No fetch was performed for this handoff, so this is not a claim about the current remote.
- `75f3cd4` was previously published with 324 tests passing: shared room pause, glass-separated collisions, x16 combos, concrete customization stats, multiplayer reconnect/DNF recovery and the scenery work.
- Initial inspection showed only `?? test/practice.test.js`. During handoff preparation, B3 implementation changes appeared in index.html, src/main.js, sim/actions.js, sim/game.js, sim/race.js, sim/racecoach.js, sim/scoring.js, ui/menus.js, ui/screens.js and style.css, plus untracked src/sim/practice.js and test/practice.test.js. These are existing work from another session, not changes made by this handoff.
- The workspace was changing during inspection. Confirm the other writer has stopped or transferred ownership before editing the same files. Recheck status/diffs; this snapshot can become stale immediately.
- The batch plan and its NEXT_STEPS.md pointer are already saved and committed. Do not recreate the original plan.
- B0-B2 are local commits; the plan says they are not published. Do not report them as live features.

Orca restarted. Previous background commands, servers, pending prompts and agents cannot be assumed alive. No pending user question was identified. Check what exists before restarting anything. This is a handoff prompt, not a request to launch more agents.

## Read first

1. Applicable AGENTS.md instructions and available skills, especially test-first and orca-cli.
2. `GAMEPLAY_BATCH_PLAN.md` in full, including Review adjustments and the B0-B2 checkpoint entries at the bottom. Those entries supersede its stale introductory sentence saying no batches have been implemented.
3. `DECISIONS.md` and the recent commits.
4. `test/practice.test.js` in full. It and the in-progress practice implementation must be preserved.
5. `src/sim/runopts.js`, game.js, actions.js, race.js, scoring.js, racecoach.js, state.js; `src/ui/menus.js`, screens.js; `test/harness.js`.
6. For later multiplayer work, the interruption tests and `MULTIPLAYER_INTERRUPTION_REPORT.md`. Treat earlier verification reports as historical evidence tied to their listed commits.

ROADMAP.md and most of NEXT_STEPS.md are historical. Do not use their old unchecked items as evidence that an already-built feature is absent.

## What already exists

### B0: run boundaries

`S.run = { category, rules, seed, outfit, policy }` is built by `src/sim/runopts.js`.

- Categories: standard, practice, challenge. Nonstandard and unknown categories default to no XP/progress/records/scores/ghosts.
- Supply options via `start(mode, undefined, { run: {...} })`.
- Daily, Weekly and friend races force standard policy.
- Challenge tally writes are gated at their source with setCounting; new rewards must respect the run policy too.
- A supplied outfit is for that run and must not overwrite the saved LOOK.
- recordKey separates nonstandard categories/rules from ordinary bests and ghosts. Before B4, inspect its legacy-key logic carefully: do not assume increasing RULES_VERSION alone will preserve old/new record separation.

### B1: clean racing

- Every 100 metres walked without a fresh NPC/obstacle bump earns a segment.
- Count speed * dt while the race clock runs, excluding countdown, pause and belt carry.
- Rewards: +2/+4/+6/+8/+10 XP per segment, capped at +50 per finished bot race. Reset distance/tier on a bump; keep earned segments. Pay once on finishing.
- Friend races show segments/medal without XP. No speed bonus or finish-time deduction.
- Configuration: `src/config/clean.js`; tests: `test/clean.test.js`.

### B2: bot crowd management

- Bots use the shared player eligibility/timing/response implementation in actions.js: wellTimed, shoutTargets, shoutReact.
- Existing actual player rules include 4 targets normally / 6 when well timed, 5.5 s normal / 3.5 s well-timed cooldown. Reuse these; do not implement a conflicting interpretation from older prose.
- Bot decisions use S.race.rng. Difficulty values are in race.js. Do not add unseeded randomness to the new AI.
- Bots skip people already stepping aside; pushing is fixed rather than additive.
- Calls cannot reach through Airport glass. This now applies to the player too.
- Scope is bot races; friend racers are human-driven.
- Tests: `test/botexcuse.test.js`.

Recorded validation: B1 full suite 341/341; B2 full suite 349/349. These are prior recorded results, not a fresh full-suite pass including the untracked practice tests.

Outstanding B1/B2 evidence: physical-phone feel has not been checked; Easy/Hard reward totals and bot call frequency need playtesting; B1's in-play CLEAN popup was not visually inspected; B2's captured bubble was a manually rendered frame at desktop size, not verified live phone-size motion. Do not inflate those claims. Address relevant gaps during later validation without rebuilding the features.

## Resume B3 here

`test/practice.test.js` expects these APIs, which now appear in the uncommitted B3 implementation:

- `startPractice(id)`
- `lessonRetry()`
- `lessonNext()`
- `S.lesson` with id, status, attempt, msg and lesson-specific data

At the initial inspection the APIs were absent. A later inspection found startPractice, lessonRetry and lessonNext exported from main.js and implemented in game.js, plus a new sim/practice.js and UI/mechanic hooks. B3 is therefore partially implemented, not a fresh start. It has no inspected commit or validation checkpoint yet. Tests were not rerun for this handoff: establish which currently pass/fail, inspect the whole diff and finish the existing implementation. Do not recreate these APIs or claim historical failure evidence that you have not observed.

The test file covers:
- Immediate practice start, no bots/countdown, only scripted lesson people, no procedural spawns.
- Close pass success and distance feedback for a wide pass.
- Reset on a bump, with fresh people and no leftover boosts.
- Retry when the scripted opportunities are exhausted.
- Perfect dash timing with early-attempt feedback.
- Thread the Needle through a staggered pair.
- Slipstream followed by overtaking, and feedback when overtaking without drafting.
- Retry/next transitions, repeatable layouts, unchanged XP/tallies/records and saved outfit.

The existing tests are useful but still draft work: review whether each setup matches the real mechanics, and strengthen missing acceptance coverage. Do not weaken assertions merely to make implementation pass. Report any test-setup correction with its reason.

Build a complete Practice flow: entry from Play, lesson picker, one clear instruction at a time, real-mechanic success detection, actionable failure feedback, retry/next/exit and a supplied fixed outfit. Start with the four planned lessons. Keep progress, ordinary records, online submissions, ghosts and one-try attempts untouched. Preserve keyboard/touch controls and accessibility settings.

Use the actual dash/pass/slipstream detection. Do not make a parallel lenient implementation solely for practice. The recent race-HUD fix supports a race with no opponents; keep that working. Ensure practice never reaches ordinary race rewards or writes a result by accident.

## Remaining batch queue

- B3: finish the practice course and its tests/UI checks.
- B4a: Airport route-choice pilot, then B4b NYC and B4c Tokyo. Share geometry between drawing, collision, spawns and bot planning. Keep choices readable at high speed and version affected records/ghosts.
- B5a: local elimination, then B5b private-room elimination. Specify protocol changes first; test ordered checkpoint decisions, ties, pause, DNF, host loss and convergent results.
- B6: weekly solo challenge with fixed outfit/layout, separate versioned best-time board and retry rules. Existing one-try Weekly score mode remains unchanged. Audit server support; prepare and validate any migration before an authorized live application.
- B7: combined balance, compatibility, saves, performance and release verification.

Read the plan for full acceptance criteria and initial tuning. Keep one batch active; split large batches into the documented slices. Continue within the implementation scope the user has authorized, and report a concrete blocker if a genuinely required product decision or external operation cannot be resolved locally.

## Established product rules to preserve

- Multiplier increases one level per three passes, caps at x16 (45 passes), and gives +4% race pace per level, +60% at x16. Harder moves award points and separate rewards, not faster multiplier growth.
- Airport glass blocks collisions across the outer railings; open ends and the divider between belts remain open.
- Anyone can pause a friend room. Every pauser must become ready or leave before it resumes; another racer can choose Keep paused for me.
- Preserve the integrated reconnect, stale-packet, DNF, results, rematch and new-room recovery logic.
- Friend races retain their progress exclusions and have no shared power-ups until an explicitly scoped batch implements synchronization.
- Preserve existing saves and cosmetic choices. Do not mix incompatible ghosts, layouts, rules versions or leaderboard categories.

## Working and validation rules

- Inspect status/diffs before editing; preserve the untracked practice tests and any other new work. Do not reset, clean, delete or overwrite other worktrees.
- If main advanced, integrate overlapping changes carefully and test the combined result. Do not force-push.
- Read and use the test-first skill: write/reproduce meaningful failures, implement, run focused tests, then full tests/build. Pure wording/layout does not need implementation-mirroring tests.
- Commands: `node --test test/practice.test.js`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run dev -- --host 127.0.0.1`, `git diff --check`.
- On this machine, esbuild tests have required sandbox escalation because the sandbox denied reads of parent directories. Retry the actual failed command with the proper escalation request; do not mistake that failure for a gameplay regression.
- Use Orca's embedded browser via the orca-cli skill. Resolve ORCA_CLI_COMMAND and load the version-matched guide and browser reference. The previously working executable was `C:\Users\stefa\AppData\Local\Programs\orca\resources\bin\orca.exe`, invoked with PowerShell's call operator (&). An earlier sandbox error misleadingly said that executable was not recognized; escalation of the same executable worked.
- After the restart, discover current tabs/ports instead of reusing old page IDs or assuming the previous dev server is alive. Follow the browser guide's page affinity/ref rules.
- For practice, verify the picker, actual lesson feedback, retry/next/exit and phone layouts including a short viewport. Check current screenshots and console output. State clearly when a frame is manually rendered or input is simulated.
- Background browser tabs may throttle animation or pause the game. Account for that when testing; do not present a frozen frame as live timing validation or a simulated viewport as a physical-phone playtest.
- Keep a batch-sized commit/review boundary. Update the queue and checkpoint evidence in GAMEPLAY_BATCH_PLAN.md and product decisions in DECISIONS.md.
- Report what changed, meaningful tests and visual checks, exact remaining gaps, the next batch and publication status. Do not claim a batch shipped merely because it is committed locally.

## First actions

1. Recheck Git status, branch, recent commits and the current plan; preserve all work already completed.
2. Inspect the draft practice tests and the real mechanic/run-policy hooks.
3. Once ownership is clear, run the B3 tests to establish the current pass/fail baseline. Inspect and preserve the existing practice.js, hooks and UI before adding anything.
4. Implement and validate B3, then record its checkpoint and move to the next authorized batch.

---

This handoff was prepared by inspection only. It did not implement B3, launch another model, restart a server, rerun the test suite, or publish changes.
