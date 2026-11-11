# Batch 16: build balance evidence and tuning proposal

Builder: Codex default model/effort. Study only; no gameplay tuning. Director reports large feels too weak and wants builds reworked. Produce a measured proposal, preserving the current game's shared movement rules. This work can run alongside batch 10 because it edits no production files.

Read AGENTS.md, game/areas/gameplay.md and playtest-followup.md package 5. Search narrowly in src/config/stats.js, tuning.js, src/sim/game.js movePlayer, race.js pace/bump/draft, actions.js and input/input.js for burst/dash costs and shared stat use. Read existing test/stats.test.js and tools/route-review.cjs as needed; the latter's collision-heavy controller is not skilled-human evidence.

May edit only tools/build-balance.cjs (or mjs), focused tests for the measurement helper, game/rounds/round-02/batch-16-evidence/, batch-16-build-proposal.md and reports/batch-16-build-balance-study.md. No production edits, new dependencies, deploy, database, subagents or lead/main changes.

Measure small/medium/large with identical gear/body/seed and initial energy, controlling stats that are not being compared. Quantify target/actual sustained speed, acceleration from rest and after representative bumps, time/distance to recover, stamina/burst duty cycle, steering response, and short versus long unobstructed runs. Include both bodies and a small representative gear set. Reuse real movement ticks; any isolated synthetic state must be described. Avoid infinite idle/simulation work; use bounded deterministic cases. Show repeatability and validate the measurement tool against known constants before trusting results.

For crowded/shortcut courses, only use physically applied steering inputs if measuring complete races. Do not teleport per frame or claim a bot/controller proves skilled-human balance. If competent traversal cannot be established within two attempts, report that limit and use isolated mechanics plus a targeted human timing protocol. Distinguish actual evidence from inferred tuning effects.

Deliver one concise proposal with current values, observed strengths/weaknesses and one recommended minimal stat adjustment plus a conservative alternative. Prefer a useful sustained-speed role for large, responsive small and viable medium, avoiding a universal winner. Do not silently change body/gear tuning, race pace, medals or compatibility IDs. State which records/ghosts/board versions a future tuning change would affect across modes, and what it delays. Director must approve proposed values before implementation.

Tests only for meaningful measurement correctness; no full gameplay suite needed for a source-inspection/measurement-only change unless the tool affects existing code (it should not). Run your focused checks and git diff --check, record exact commands/seeds/data. Commit study and <=10-line report; return path. Real-phone feel and competitive balance remain human checks.
