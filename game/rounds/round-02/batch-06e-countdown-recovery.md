# Batch 06e: finish the interrupted countdown fix

Builder: Codex, default model and effort, per studio/model-routing.md limits fallback. Risk: high; independent lead/reviewer verification required before merge. S1 countdown split/softlock; owner: this worker. This continues approved 06d, not a new feature.

Read AGENTS.md. Start from develop in your own checkout, then merge stefanvargas100-hue/host-handover-2 (4061d45). Read batch-06d-host-handover-countdown.md if present; otherwise locate the batch-06d file in this round. Its rules, allowed files and done-when apply along with batch-06-host-handover.md. Read the reviewer report with git show f53dace:game/rounds/round-02/reports/review-host-handover.md.

The previous worker stopped at Claude's usage limit. Its uncommitted diff is preserved in batch-06e-inherited.patch. Do not modify or resume that worker or its checkout. Treat the patch as unverified work: inspect it, add its tests first and demonstrate meaningful failure before porting implementation. Complete 06d, including all four boundary combinations and restart/finish convergence, countdown display, focused tests, one full suite, build, diff check and simulated room with host leaving in race 2. Preserve develop's courseTag ghost key and newer PROTO requirements when integrating. Do not reset or overwrite unrelated changes.

May edit only the files allowed by 06d and report game/rounds/round-02/reports/batch-06e-countdown-recovery.md. Commit to your own branch. Report exact evidence and limitations, and stop after two failed fix attempts. No database, deployment, dependencies or subagents.
