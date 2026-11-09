# Round 2 proposal

**Status:** all approved by the Director, 2026-11-09, to be built at the same time by Codex workers. Related items are grouped so fewer workers run at once.

| Idea | Batch | Builder | Risk |
|---|---|---|---|
| Cups QA trial (carried over from Round 1) | 04 | Codex | Low |
| Race time boards for each stage | 05 | Codex | Medium |
| Player-name rules and filter | 05 | Codex | Medium |
| A new host takes over when the host leaves, plus a simulated room to measure message rates | 06 | Codex, Claude second review | High |
| Side-route system, proven on Subway | 07 | Codex | High |
| First Tokyo stage: Takeshita Street | 07 | Codex | High |

Still running from before: batch 03, slipstream lines (second cycle).

**Merge order:** 03, then 05, then 06, then 07. Batches 03, 06 and 07 all touch `src/sim/race.js`, and batches 06 and 07 both raise `PROTO`; the lead resolves both at merge. Batch 04 changes no code.
**What it delays:** with 5 workers at once, merging and review become the bottleneck. Takeshita Street is built before the Director has tried Subway or the side-route system.
