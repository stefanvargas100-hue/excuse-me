# Round 02, batch 12: consistent movement and Classic pickups

**Builder:** Codex, default model/effort. Defined gameplay changes requested by Director.
**Risk:** medium; lead review required, independent review if shared online rules change.

## Authorized compatibility extension - 2026-11-10
- Lead authorizes src/online/online.js solely for versioned Classic submit/fetch/display board identity; src/sim/ghostshare.js solely for versioned Classic friend ghost storage; src/online/duel.js solely for versioning or rejecting legacy Classic ghost exchange, plus relevant tests. Independent review is now required before integration.
- Use one consistent Classic rules identity across local records, online boards and ghosts. Preserve legacy saved data without copying it into new competitive keys. Do not disable these features as the default solution.
- Test new-version round trips, rejection/isolation of legacy and mismatched ghosts, submit/fetch key agreement, preservation of old saves, and unchanged non-Classic behavior. Keep live/playtest separation intact.
- No database/schema changes, migration, network protocol redesign or unrelated room/readiness edits. If existing server validation cannot accept the new identity without such changes, stop and report the exact constraint. No live writes for verification.

## Goal
Director approved: remove combo slow-motion visuals, keep the view constant, and give Classic the existing speed increases, build attributes and power-ups. Movement rules should agree across modes; retain their objectives and scoring. This batch delays remaining lobby/spectating/custom-Cup work; batch 10 WIP stays separate.

## Read first
- AGENTS.md, studio/skills/test-first/SKILL.md, game/areas/gameplay.md.
- src/main.js frame; src/sim/game.js movePlayer/tick/start; src/sim/scoring.js onPass; src/sim/state.js reset; src/sim/race.js stats/pace/pickups; src/sim/powerups.js.
- src/config/stats.js, src/sim/runopts.js, src/render/render.js combo camera/tint and pickup rendering; follow relevant imports narrowly.

## May edit
- src/main.js (frame timing and necessary test hooks only).
- src/sim/game.js, state.js, scoring.js, powerups.js, race.js, actions.js, crowd.js, people.js, runopts.js, replay.js: only movement parity, pickup lifecycle and compatibility needed here.
- src/input/input.js; src/render/render.js, camera.js, hud.js and existing pickup renderer; src/ui/menus.js: only affected movement feedback, pickup display or stat copy.
- src/config/stats.js (reuse/export stats, no balance retuning), routes.js (compatibility tags only).
- New focused helper modules under src/sim; relevant test/*.test.js and test/harness.js; batch-12-evidence/ and reports/batch-12-classic-movement.md in this round.

## Must not change
- No large-body balance retuning, new pickup types, new art style, lobby/Cup selection/results changes, deployment, dependencies, database, main or lead branch edits, subagents.
- Keep race movement constants, crowd seeded streams, saves/unlocks and once-only rewards intact. Do not fabricate S.race for Classic to bypass guards.
- Preserve mode-specific failure/finish/scoring rules and tutorial/practice scripted objectives. Daily/Weekly deterministic rules must stay reproducible; report any parity exceptions explicitly.

## Done when
- Risky passes/combos never slow simulation, freeze frames, zoom camera or tint the whole view. Remove their slow audio cue too. Keep readable combo numbers/popups and ordinary collision feedback. Actual speed boosts still have their existing feedback, respecting calm settings.
- Classic uses selected build speed/acceleration/steering/stamina stats and the same applicable combo, near-pass and boost multipliers as races. Reuse shared rules rather than divergent copies; test all three builds and mode parity at equivalent state.
- Classic spawns/collects/renders existing boost/refill/clear pickups throughout an endless run (not just to LV.goal), with bounded cleanup, swept collection, effect expiry and clean restart. Separate deterministic pickup RNG must not perturb the crowd. Clear path must actually protect from Classic collisions. Preserve floor isolation.
- Race/Cup/elimination/online behavior has no incidental regression. Draft requires a valid racer target; do not invent drafting from ordinary pedestrians. Audit stage movement guards and document anything not shared; ask if widening into new Classic route content is necessary.
- Check score/ghost compatibility: preserve old saved data but do not silently compare newly advantaged Classic runs with incompatible ghosts/boards. If this needs files outside scope, report exact minimal extension before changing them.
- Tests fail on behavior assertions before fixes, then pass. Run focused checks during work, npm.cmd test once at end, npm.cmd run build and git diff --check. Browser evidence at 320 and 390 wide: Classic pickup/effect, all builds, constant camera through combo; distinguish browser from phones.
- Commit implementation and <=10-line report on own branch; report unresolved findings honestly. No integration authorization.

## Left for a person
- Real-phone movement feel, pickup readability and loaded shortcut balance. New world art remains authoritative; later Fable visual review still queued.
