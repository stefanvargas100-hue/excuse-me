# Batch 12d: focused independent re-review

Reviewer: original Codex review worker, default model/effort. Review fixes only; no integration authority.

Read AGENTS.md, batch-12c brief via git show develop:game/rounds/round-02/batch-12c-review-fixes.md, and builder report/evidence on classic-movement at 9ca46c5. Exact tested implementation is 0cbb2d7883c3847cadd56b380f15dabc55319361. Your previous review a6e23fa remains the baseline findings record.

Authorized: merge stefanvargas100-hue/classic-movement into your own classic-review branch solely for re-review, preserving your evidence. Do not merge into develop/main or merge lead documentation. May edit only batch-12d-evidence/ and reports/batch-12d-rereview.md in this round, plus focused review-only tests if needed. No production edits, dependencies, deployment, live writes, database changes or subagents.

Verify S2 ordinary race drafting restoration for player and bots, original walker fixtures, and Classic remaining free of invented drafting. Confirm no race identity migration is necessary after restoration. Verify S3 pickup lifecycle isolation and actual /playtest/ channel/storage/offline evidence; distinguish fresh-profile service-worker checks from installed live workers. Inspect fresh relevant screenshots at native size. Verify current classic:cm2 kind plus absent/wrong rules rejects and matching rules accepts.

Run focused regressions, build and diff checks. Builder reports final full 751/751 after all production/test edits and 20/20 pickup repeats; do not repeat full suite without a specific gap. Reproduce any remaining finding precisely and classify S1-S4. Clear or retain each prior finding explicitly. Preserve Daily/Weekly and stage-feature parity as outstanding scope, plus phone and deployed-server limits. Report readiness for integration of the scoped Classic batch without claiming complete all-mode parity. Commit <=10-line report and evidence on your branch and return report path.
