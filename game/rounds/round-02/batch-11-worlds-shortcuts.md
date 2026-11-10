# Round 02 batch 11: reconcile polish, then populate shortcuts

Builder: Codex, defaults. Director authorized this sequence on 2026-11-10. Risk high: deterministic course changes; independent review required. S3 shortcut challenge/content owner: this worker; lead owns integration.

## Read first
- AGENTS.md, studio/skills/test-first/SKILL.md, game/areas/gameplay.md, game/areas/visuals.md, game/areas/online.md.
- Latest art-worlds entry in game/decisions.md; src/render/style.js and relevant rendering call order in src/render/render.js.
- game/rounds/round-02/side-routes.md for approved hard/easy route intent.
- Search src/config/side-routes.js, src/config/routes.js, src/sim/people.js generation, src/sim/crowd.js, src/sim/race.js collision and bot steering; relevant test/side-routes.test.js and test/routes.test.js.
- Read batch 09 proposal/report and diff from branch stefanvargas100-hue/visual-pass (243fd51) using git show/diff. Its base e6b7ef4 predates the authoritative art-worlds update on develop. Do not merge that whole branch.

## Sequence
1. Review all ten batch-09 items against the current worlds. Port useful fixes (especially readable labels, leaderboard fit, route signs and opaque route scenery) selectively; adapt colours/style to current worlds. Inspect before/after screenshots of every screen changed. Keep new worlds authoritative; do not restore the classic stage look. List each old item retained/adapted/superseded with a reason. Make this a separate commit before shortcut gameplay.
2. Fix the empty Subway mezzanine with route-local pedestrians and real obstacles, readable navigable gaps and safe entrance/rejoin. Check Takeshita's back alley for the same empty-route problem and improve within its easy-route intent. Match Subway ink-noir and Takeshita neon-pop. Use existing actor/prop types where suitable. Drawings and hitboxes must agree. Hard routes reward skilled traversal; easy routes must not become the dominant faster choice. Measure before/after travel times with fixed seeds and identical gear/inputs, main route versus shortcut. Preserve the approved route intents; report measurement limitations rather than inventing fairness claims.

## May edit
- src/render/side-routes.js, bridge.js, park.js, podium.js, subway.js, takeshita.js; style.css for batch-09 compatible polish only. New route drawing helper allowed.
- src/render/render.js only route drawing order/filtering, retaining world style hooks.
- src/config/side-routes.js, src/config/routes.js; new route-population data/helper allowed under src/config or src/sim.
- src/sim/people.js, src/sim/crowd.js, src/sim/race.js, src/sim/actions.js: route population, collision/interaction isolation, and bot traversal only.
- src/online/duel.js only course/protocol version compatibility, not start, lobby, Cup or host-transfer logic.
- src/config/medals.js only if measured course changes justify corresponding route-stage targets, with evidence.
- Related test files under test/, a reproducible offline route-measurement script under tools/ if necessary, and game/rounds/round-02/batch-11-evidence/ plus reports/batch-11-worlds-shortcuts.md.

## Must preserve
- New art worlds, seeded Classic/Daily/Weekly streams, saved progression, cross-floor isolation, reproducible race course content, player/bot collision parity, calm/reduced-motion behaviour.
- Version changed courses/ghost keys and multiplayer compatibility without deleting saves. Do not modify unrelated courses' records.
- Batch 10 owns host/readiness and Cup results fixes; leave its workspace and files alone. No new feature work, bot-count settings, body rebalancing, live DB, loadtest, dependency, deployment, main merge/push, or subagents.
- If another file is necessary, stop and report the exact need. Two failed attempts at one issue: stop and report per AGENTS.

## Acceptance and evidence
- Write meaningful failing tests before gameplay changes: route population exists, deterministic generation, main-floor actors cannot hit/interact with route actors and vice versa, gaps remain traversable, and player/bot route exits work. Test repeated generation and applicable race modes.
- Record baseline and changed route measurements with seed/config/command; no live services. Check course tags and old ghost compatibility.
- Capture Subway and Takeshita entrance/interior/rejoin with a crowd at 390x844 and 320x568, plus all changed menus/podium. Check route signs against live-race banners and safe areas.
- Run focused tests, then npm.cmd run test:fit, npm.cmd test once, npm.cmd run build, git diff --check. Compare tools/perf-check.mjs frame work before/after on changed route scenes and busiest stage; investigate >10% regression. Browser emulation is not phone evidence.
- Commit code and <=10-line report with detailed evidence in a separate evidence note if needed. Report through Orca worker_done with report path. Do not integrate into develop yourself.

This work delays final visual sign-off but addresses the Director's shortcut playtest failure. Later Fable review remains planned; main merge still requires approval.
