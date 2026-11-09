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
- **Limits:** Codex session logs under `~/.codex/sessions` record `rate_limits` with used percentages for the 5-hour and weekly windows, so the lead can check Codex. Claude's limits are not visible to the lead, so the Director flags those.

## Startup load
A Codex worker loaded about 21K tokens before any work. Two settings reduce it:
- **`.codex/config.toml` (repo):** turns off plugins and apps for this project. It only applies in folders Codex trusts, and Orca trusts each worker's folder.
- **`skills.config` (`~/.codex/config.toml`):** hides individual skills. Codex ignores this in a project file, so it affects all Codex work on the machine. Each new machine needs it set.

Claude workers have not been measured yet.

## Evidence so far
Update this table from round reports, and change the defaults when the numbers justify it.

| Round | Batch | Model | Result | Notes |
|---|---|---|---|---|
| 1 | 1, screen-fit check | Codex, defaults | In review | Stayed within its allowed files, tests failed first, and the lead reproduced its result. Its report used Orca's required three-sentence format, which conflicted with `AGENTS.md`; the rules are now fixed. Fix requests: 2. Merged as `945b2cf`. Tokens across all 3 passes: 4.62M total, of which 4.52M were cached input; 16K output; 65 tool calls. Startup context was 22K, growing to 96K. Lead caught a visual regression the tool missed. |
| 1 | 2, live splits | Codex, defaults | Merged | One pass, fresh worker. 1.24M total, of which 1.20M cached; 4.9K output; 26 tool calls. Context 23K to 52K. Tests failed on assertions, and the report rule worked. Lead fixed one small colour bug. |
| 1 | 3, medal times | Codex, defaults, reduced startup | In review | First pass: 2.20M total, of which 2.15M cached; 9.3K output; 47 tool calls. Context 17K to 58K. Startup settings applied (17.3K versus 22.6K). A slow measurement restart added calls. Fix requests: 1 so far. |
