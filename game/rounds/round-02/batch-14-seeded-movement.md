# Batch 14: Daily and Weekly movement parity

Builder: Codex defaults. Risk: high for competition identities; independent review required. Director has requested consistent movement across modes. This is the next scoped implementation, not new stage content.

## Lead disposition of batch 13 plan
The source audit is useful; its server ledger, scheduled activation, UTC transition and strict cross-version enforcement are NOT requirements of this batch. Do not expand the existing first-accepted-score/device-marker model into an account-wide attempt system. New movement scores must have separate versioned boards; old clients remain on legacy boards. Preserve the existing period clock and unversioned played markers so upgrading on the same device does not grant another attempt. Clearly disclose this existing enforcement limit in the report. No database migration or release date decision is needed for isolated new rules on playtest; if checked-in schema prevents the proposed namespace, stop with the exact constraint.

## Read
AGENTS.md, studio/skills/test-first/SKILL.md, game/areas/gameplay.md; batch-13-implementation-plan.md source findings and seeded movement acceptance criteria (this brief overrides its rollout design). Read narrowly in the files below.

## May edit
- src/sim/game.js: Daily/Weekly start, movement initialization, captured competition identity, score/results/attempt paths only; preserve Classic/races/tutorial behavior.
- src/sim/state.js: new identity/movement reset fields only; src/sim/powerups.js: generalize Classic helper naming if needed without changing its recipe.
- New small src/sim/seeded-rules.js helper for explicit mode/rules identity and enabled movement policy.
- src/online/online.js, boards.js: Daily/Weekly versioned submission/fetch/menu/results identity only. src/online/board.js only if necessary to preserve queued full board identity, never rewrite old queue entries.
- src/ui/menus.js: seeded local score reads/clear new-rules label only, no unrelated layout work.
- Related test/*.test.js and test/harness.js; batch-14-evidence/ and reports/batch-14-seeded-movement.md in this round.

## Behavior and compatibility
- Daily and Weekly endless runs use the selected build/body/gear frozen at start, same speed/acceleration/lateral/stamina and combo/near/perfect/streak/power multipliers as Classic. Reuse existing stats/functions without retuning; preserve Daily modifiers and Weekly's lack of automatic modifier.
- Use existing boost/refill/clear pickups throughout endless runs, with bounded storage, expiry, swept collection and clear protection. Preserve Classic pickup recipe and stage/index deterministic layout; no draws from crowd RNG. Do not claim date-specific pickup patterns.
- Introduce a short explicit seeded rules suffix (mp2) for new Daily/Weekly scores and board identities only. Capture period/rules at start and use them through death/quit/results/submission even across midnight/Monday. All menu/results/submission/fetch paths must agree; no double suffixing. Legacy scores/queues remain untouched and never move into new rankings. Distinguish new-rules boards in visible headings where needed.
- Keep unversioned played markers, one attempt per current period on the device, quit consumption and once-only rewards. Do not reset attempts on update; no cross-version/global enforcement claim. No seeded ghosts; no Weekly Challenge/race/Classic identity changes or global RULES_VERSION bump.
- Preserve reset-clock semantics, stage rotation, seeded crowd contents and modifiers. Race drafting, bump behavior and constants stay unchanged. No fake S.race/raceBuild for endless modes. Tutorial/scripted learning and strips/belts/side routes remain separate follow-ups.
- Keep live/playtest storage, queues and boards isolated. No live writes, schema changes, deployments, dependencies or subagents. Do not merge/push lead/main. If a necessary file is outside scope, ask for the minimal extension.

## Evidence
Test first: meaningful failures for movement across three builds and representative body/gear, tired regen, near/combo bonuses and pickups. Compare Classic with Daily/Weekly at equivalent state. Check seeded crowd PRNG stability, long-run pickup cleanup, restart reset, fatal collisions except clear protection, no seeded ghosts, period boundary capture, played-marker retention, queue identity preservation, matching board keys, legacy data preservation and unaffected modes. Inspect checked-in schema read-only.

Focused tests during work; full suite once after final changes, npm.cmd run build and git diff --check. Browser at actual /playtest/ path at 320/390: Daily/Weekly boost/pickup HUD and new-rules board label, external network blocked. Report phone/deployed-schema limits honestly. Commit implementation and <=10-line report on own branch. No integration until independent review.
