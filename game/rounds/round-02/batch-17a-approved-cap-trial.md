# Batch 17a: approved build-speed cap treatment A

Builder: Codex defaults. Director approved: "Ok try it and test it" after treatment-A playtest trial proposal. Implement/test stats only now; competition compatibility is a required sequential companion before integration/publication. Batch 10 owns shared game/UI/network files meanwhile. Main remains unapproved.

Read AGENTS.md, studio/skills/test-first/SKILL.md, batch-16-build-proposal.md, src/config/stats.js, related stats/build-balance tests and tools/build-balance.cjs. Read call sites narrowly for audit only.

## Approved formula
Keep original build rows small -3/+4/-1, medium 0/0/0, large +3/-4/+1. Speed = clamp(body speed + all gear speed + fit boost, -10, 10) + build speed. Body and fit are inside cap; build speed is outside and added exactly once. Acceleration/recovery keep existing combined +/-10 caps and coefficients. No item/body/fit tuning, bump/draft/pace/medal changes or large-row +4/-3/-1 change. Maximum effective speed points can now be +/-13; reflect accurate exported metadata/comments where necessary without breaking non-speed cap consumers.

## May edit
- src/config/stats.js only for approved formula, accurate stat metadata/comments and pure helpers strictly necessary for it.
- Related test/*.test.js, specifically stats/build-balance and a new cap-trial regression suite; do not weaken unrelated assertions.
- tools/build-balance.cjs only to distinguish preserved legacy analytical baseline from now-active treatment A, preserving original evidence and reproduction. Do not relabel historical data as newly measured.
- game/rounds/round-02/batch-17a-evidence/, reports/batch-17a-approved-cap-trial.md, and batch-17b-compatibility-plan.md (source-inspection plan only).

## Done when
Meaningful assertions fail before implementation and pass after. Verify same-gear/body speed ordering small < medium < large over all currently valid combinations; acceleration/recovery bit-for-bit unchanged against baseline; medium unchanged; uncapped cases unchanged; correctly disclose small decreases and negative extrema. Compare actual statsOf to treatment-A analytical reference, then real ticks for representative plain/speed/responsive gear, both bodies and builds. Reproduce the previously promised male speed-kit target values (3.126/3.180/3.234 m/s), short/long distances, burst duty/average, steering/refill and post-bump behavior. Use same dt/seed methodology and isolated-case limits as study; do not claim phone/crowded balance.

Audit player/bot shared stat application and customization meter/text callers (read-only): list any UI assumptions of +/-10 needing follow-up. Provide exact minimal compatibility plan covering Classic, seeded, all race local/own/friend/top ghosts and boards, Cup/Challenge records, mixed-version online play. Preserve old saves; a global RULES_VERSION bump alone is insufficient. Plan must name files/functions/tests and assess fixed-outfit challenges. Do not edit shared UI/network/game/identity files in this batch. No dependency, database, live-write, deployment, subagent or main/lead changes.

Run focused tests during work, full suite once after final changes, build and diff check. If compatibility/UI failures are expected pending companion, report them precisely rather than weakening tests or claiming ready. Commit implementation and <=10-line report; independent review and compatibility completion required before integration. Phone trial remains outstanding until publishable candidate exists; do not ask the Director to time unavailable code.
