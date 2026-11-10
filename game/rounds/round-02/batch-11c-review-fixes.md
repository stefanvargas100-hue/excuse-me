# Batch 11c: fix independent review findings

Assigned to original batch 11 Codex builder on its existing worlds-shortcuts branch. Read AGENTS.md, studio/skills/test-first/SKILL.md and independent review via `git show stefanvargas100-hue/shortcuts-review:game/rounds/round-02/batch-11b-evidence/review.md`. No integration or balance tuning authorized.

Two S3 findings, builder owner:
1. Takeshita route instruction strips have weak contrast at actual phone sizes because world finishing affects them. Preserve neon world and make route text/backing legible after world effects. May edit src/render/side-routes.js and src/render/render.js only route marker rendering/ordering; preserve race banner timing and all gameplay. Inspect fresh actual-size 320x568 and 390x844 entry/interior/rejoin screenshots with banner/HUD. Prefer an isolated marker pass, not global palette changes.
2. src/sim/race.js cupPressure allows humans on another floor to influence bot pressT/pressX. May edit only cupPressure and corresponding route-filtered pressure lane cost if needed; tests in test/side-routes.test.js or a focused Cup pressure test. Test first: same-floor positive and both cross-floor negative cases with local/remote human entries. Verify any active pressure cannot continue influencing a bot after a route change. Preserve legitimate same-floor Cup pressure and host-transfer behaviour. Do not change other Cup/start logic.

May also write game/rounds/round-02/batch-11c-evidence/ and reports/batch-11c-review-fixes.md. No other production files, new dependencies, services, loadtest, deployments or subagents. Stop/report after two failed attempts as usual.

Run relevant tests, fit check after render changes, full suite once after final edits, build and diff check. Commit code, screenshots and <=10-line report. Return through worker_done with report path. Treat overall batch 11 as still partial: loaded human balance remains unresolved; do not alter course speed/crowds to satisfy the noisy controller. Independent reviewer will check these fixes before integration.
