# Batch 12b: independent Classic movement review

Reviewer: Codex defaults, separate worker from builder. Risk: high for records/ghost compatibility. Review only; no integration or publication authority.

Read AGENTS.md, batch-12-classic-movement.md (including lead compatibility extensions), reports/batch-12-classic-movement.md and batch-12-evidence/audit.md. Review implementation 5c91068/report d7913b1 on stefanvargas100-hue/classic-movement against its base 2d712c0. The lead brief is available via git show develop:game/rounds/round-02/batch-12-classic-movement.md; do not merge develop documentation.

Audit changed production/test files narrowly. Verify cm2 identity consistently covers local bests, own/friend/top ghosts, submission and both board displays, rejecting mismatches without erasing legacy data. Check actual existing schema constraints read-only; no live writes or database changes. Check non-Classic and playtest/live isolation.

Check endless pickup generation/cleanup/expiry/swept collection/clear protection, build parity and removal of combo camera/time effects. Inspect screenshots individually at native size and verify browser claims. Explicitly disposition retained Daily/Weekly/scripted and stage movement exceptions against the Director's all-mode intent; report gaps rather than claiming complete parity.

Lead concern: race.js now disallows drafting off pedestrians in ordinary races. Determine whether this is an unnecessary race regression from an overbroad interpretation of the brief (which intended no invented Classic pedestrian drafting), and whether reverting this race-only change is preferable to changing race identities. If retained, assess all affected race record/ghost/course tags. Do not change production or tune balance in review.

May edit only new focused review regression tests, batch-12b-evidence/ and reports/batch-12b-review.md in this round. Reproduce findings with meaningful assertions. Run focused checks and build/diff; full suite only if the report leaves a coverage gap (builder says 748 full before final safety fixes, 62 focused afterwards: assess final changed files). Do not run live load tests or add dependencies. Classify findings S1-S4 and identify exact files/lines plus smallest recommended fix. Report pass/hold and remaining human checks in <=10 lines; commit on own branch and return report path. No main/lead edits, deployment or subagents.
