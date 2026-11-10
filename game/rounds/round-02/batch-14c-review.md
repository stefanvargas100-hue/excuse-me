# Batch 14c: independent seeded movement review

Reviewer: new Codex worker, default model/effort. High compatibility risk, review only. Review implementation 55ca35b and report/evidence a6e2f6e on seeded-movement against base dd3fddb. Do not integrate or publish.

Read AGENTS.md; original and recovery briefs via git show develop:game/rounds/round-02/batch-14-seeded-movement.md and batch-14b-recovery.md; builder reports and batch-14b-evidence/notes.md in your branch. Read changed source/tests narrowly, following imports only as needed. Batch 13's server-ledger recommendation was explicitly superseded: no requirement to invent cross-version/account-wide enforcement or change clocks/database.

Verify:
- Daily/Weekly use frozen selected Classic stats, shared pace, modifiers and endless pickups without changing race/Classic/scripted behavior. Fatal contact, clear protection, lifetime/reset, no seeded ghosts and once-only rewards remain correct.
- Captured mp2 identity stays consistent from start through actual midnight/Monday, results, local records, submission and menus. Same-device used markers survive updates/reload/quit. Legacy saves and queued board IDs remain untouched. Check current keys, idempotence, no wrong suffixing and unaffected Weekly Challenge/race/Classic keys. Checked-in schema inspection only; no live writes or claims about deployed schema.
- Crowd tests prove pickup RNG isolation with controlled matching state, full generated-object comparison AND surrounding RNG sentinels; examine demonstrated mutation failure. Distinguish pickup isolation from preserving pre-batch crowd/rotation/modifier fixtures. Check harness changes for test contamination or clocks that fail to exercise real period behavior. Identify missing meaningful coverage without mirroring implementation.
- Actual /playtest/ evidence uses blocked external network and correct channel. Inspect each affected screen type at both 320/390 (pickup, boost, results, boards); verify readable Updated movement labels. Builder documents inherited leaderboard heading clipping at 320: compare baseline and assign severity/ownership, not silently excuse a new regression.

May edit only review-only regression tests under test/, batch-14c-evidence/ and reports/batch-14c-review.md in this round. No production edits, dependencies, subagents, database changes, deployment or lead/main edits. Run focused checks and build/diff; accept builder's final 814/814 unless there is a specific gap requiring full suite. Reproduce any finding with exact inputs and assertions, classify S1-S4, recommend smallest fix. Inspect actual screenshots, label emulation versus phones.

Commit evidence and <=10-line report on your own branch with PASS/HOLD and explicit findings dispositions. Phone feel, installed live worker behavior, deployed schema and tutorial/stage parity remain outside clearance. No integration authority.
