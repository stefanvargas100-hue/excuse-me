# Batch 27b: reply on the pinned crowd hashes

**To:** batch 27 builder (dispatch ctx_c2c55aa0d2ff), 2026-11-14, from the lead.

**Question:** `test/security.test.js` "stages 0-8 keep their crowds and random sequences exactly" fails for stage 7 Tsukiji and stage 8 Skytree, which batch 27 changes on purpose.

**Ruling: option (a).** Keep all nine stages pinned.

- In `test/security.test.js`, change only that test: stage 7 to `debb45594185`, stage 8 to `0c801ed00909`, and the test title to say that 0-6 are from the batch-23 base and 7-8 were re-taken on batch 27.
- Stages 0-6 must still match without any edit. If one moves, stop and report.
- Do not narrow the loop to 0-6: the pins on 7 and 8 guard later batches.
- Rerun that test file, then `npm test` once, `npm run build` and `git diff --check`. Update your report (list this file under "Off plan") and finish with `worker_done`.
