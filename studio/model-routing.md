# Model routing

The lead picks the builder for each batch and records why in the plan. The Director can override any choice.

| Work | Default | If limits are tight |
|---|---|---|
| Lead planning and final review | Claude Opus | Codex takes over using `studio/templates/handoff.md` |
| Clearly defined build batches | Codex or Claude Sonnet | Whichever has room |
| Small mechanical changes | Lower effort on the same model | Either |
| Tricky online or save-data work | Claude Opus | Wait, or Codex with extra review |
| Second review of a risky batch | The model that did not build it | Lead review only |

## Rules
- Set the model and effort in each batch plan.
- A worker never gives the final approval on its own work.
- The lead cannot reliably see remaining limits. The Director flags low limits, and the lead switches models if a worker stops because of one.

## Evidence so far
Update this table from round reports, and change the defaults when the numbers justify it.

| Round | Batch | Model | Result | Notes |
|---|---|---|---|---|
| 1 | 1, screen-fit check | Codex, defaults | In review | Stayed within its allowed files, tests failed first, and the lead reproduced its result. Its report used Orca's required three-sentence format, which conflicted with `AGENTS.md`; the rules are now fixed. Fix requests: 2 so far. |
