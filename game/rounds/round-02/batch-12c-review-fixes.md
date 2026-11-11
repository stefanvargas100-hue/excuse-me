# Batch 12c: restore race drafting and close review gaps

Builder: existing Codex batch-12 worker, default model/effort. Risk: medium; independent re-review required. Continue on classic-movement; do not merge develop or review branches.

Read AGENTS.md, original batch-12 brief plus authorized extensions via git show develop:game/rounds/round-02/batch-12-classic-movement.md, and review audit via git show stefanvargas100-hue/classic-review:game/rounds/round-02/batch-12b-evidence/audit.md. Review a6e23fa is authoritative for findings.

Lead correction: the original brief's drafting restriction was overbroad. Classic must not gain invented pedestrian drafting, but existing ordinary-race pedestrian drafting must remain exactly as before this batch. No race identity migration is needed if original behavior is restored.

May edit only src/sim/race.js inDraft pedestrian condition; test/race.test.js, test/slipcool.test.js to restore original walker fixtures; test/classic-movement.test.js for isolated pickup lifecycle; test/ghostroom.test.js and test/classic-compat.test.js for version mismatch coverage; batch-12-evidence/browser.mjs for correct channel checks; new batch-12c-evidence/ and reports/batch-12c-review-fixes.md. If another file is necessary, report exact extension.

1. S2: restore the pre-batch race drafting condition and original walker tests, using reviewer race-regression.cjs/control as reproduction guidance. Add/retain a meaningful regression that fails on current HEAD and passes after restoration for existing player/bot drafting. Keep Classic without a racer field or draft boost.
2. S3: isolate the endless pickup lifecycle test from incidental crowd generation/collisions (nextChunk and people setup); assert play state and test expiry through real tick. Reproduce or explain the instability honestly, then repeat the focused test enough to establish deterministic setup, not rerun the whole suite repeatedly.
3. S3: ?playtest=1 does not select playtest. Run actual /playtest/ path evidence with external requests blocked; assert playtest channel/storage prefix and offline-cache behavior, keeping it distinct from real phones and live server acceptance. Preserve meaningful six build/viewport cases; no live writes. Add current classic:cm2 wire kind with wrong rules coverage, not just legacy-kind rejection.

Tests first, focused checks while working; full suite once after final changes, build and diff check. Commit implementation plus <=10-line report and evidence on own branch. Report exact final tested commit and any browser limits. No further gameplay widening, balance tuning, server/schema edits, deploy, dependencies or subagents. Daily/Weekly and stage-feature parity remain outstanding; do not claim all-mode parity complete. Return report for independent re-review; no integration authority.
