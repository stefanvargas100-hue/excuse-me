# Failure log

One entry per problem. Add to its count when it happens again. The choice of permanent fix is explained in `studio/lead-playbook.md`.

| Problem | Cause | Seen | Batches | Permanent fix |
|---|---|---|---|---|
| Browser screenshots came out tiled at 320 x 568, so the layout could not be judged from them | Not investigated. The agent measured the layout instead | 1 | NYC Cup, before the studio | None needed so far: Playwright screenshots at 320 x 568 came out fine in the Round 1 pilot, so this may only affect Orca's browser. Reopen if it recurs |
| The fit tool reported zero problems while a screenshot showed mid-word breaks and a box past the card edge | The tool only checked for overflow and side edges, and the fix's `overflow-wrap:anywhere` hid the overflow | 1 | Round 1 batch 1 | New rules in the tool. Until proven, the lead keeps checking screenshots of changed screens |
| The fit tool passed while ordinary race results had unreachable buttons at 320 x 568 | The tool only used a fresh save and a Cup end screen, so it never saw a real results screen | 1 | Round 1 batch 3, older bug | New routes and rules in the tool. Fixed and shipped alone: podium hidden on short screens |
| Worker tried `python`, which does not run here | Windows Store alias (also noted in an old handoff) | 2 | Visuals, Round 1 batch 3 | Line added to `AGENTS.md` |

## Lead mistakes
Problems the lead caused, why they got through, and what now prevents them. Update the count if one recurs.

| Mistake | Effect on the worker | Why it got past the lead | What prevents it now | Seen |
|---|---|---|---|---|
| Report format in `AGENTS.md` conflicted with Orca's | Report missed the format, and the lead wrongly implied the worker slipped | Never read Orca's worker instructions | Plan check 1, and `process-review` | 1 |
| `AGENTS.md` pointed every worker at the vision file | Workers read a file their batch did not need | Wrote the rule for leads and workers without separating them | Rule removed, and plan check 4 | 1 |
| Hotfix target measured against the screen, not the card | Worker met a limit that was still wrong, then stopped to ask | Used the first limit I thought of | Plan check 2 | 1 |
| Plan said both "one commit" and "a second commit" | Worker had to stop and ask | Did not reread the plan as a whole | Plan check 1 | 1 |
| Plan asked for 8 non-overlapping starters but never said the start must stay fair | Worker moved all bots 2-8 m behind the player, and its tests passed | Listed the mechanical limits and not what the rule is for | Plan check 5, and a test that racers start level | 1 |
| Plan raised `PROTO` but listed only stage-list tests as editable | Worker correctly went off plan, and the online plan repeated the gap until corrected | Did not search tests for the value being changed | Plan check 4, extended to values that tests hard-code | 2 |
| Ran 3 Claude workers at once, 2 on Opus, while the lead's own context averaged 220K | Friend Cup online stopped at the Claude 5-hour limit; its work was saved as a WIP commit | Tracked Codex limits but not Claude's, and treated the lead's own long context as free | Check Claude usage from the session logs before starting Claude workers; hand over to a fresh lead before context grows past about 100K | 1 |
| Started a Codex worker to redo a batch the paused Claude worker then finished | Duplicate worker stopped within minutes with no unique work; a few Codex tokens lost | Assumed a worker stopped at the usage limit stays stopped. It resumes by itself after the reset | Before replacing a paused worker, stop it with `orca orchestration worker-stop` first | 1 |
| Plan used `--effort` without `--model` | Worker start was refused | Assumed the flag worked alone | Plan check 3 | 1 |
| Told the Director about 40 skills and that limits could not be seen | Wrong information, no worker effect | Trusted a rough count and did not check the logs | Plan check 3, and `process-review` step 1 | 2 |
| Set the slipstream target (first third under 40%) from my own 3-seed trial without recording its method or script | Worker could not reproduce my baseline (70% against my 63%); the approved fix reached 60%, not the 30% I predicted, and the batch came back partial | Treated a rough trial as a spec number and did not say where the player stood or how thirds were cut | Plan check 2: commit the trial script or write its method out, and have the worker reproduce the baseline first | 1 |
| A lead sent the slipstream worker a second brief through Orca without saving it in the repo | After the handover, the next lead could not see the worker's rules and had to rule on a question about a brief it had never read | Treated an Orca message as the record | Playbook: every brief or follow-up sent to a worker is first saved as a file in the round folder | 1 |
| Batch 05 plan referred to "the name-setting screen", which does not exist (names are generated) | Worker stopped to ask, then hit the generated names breaking the 16-character cap | Did not check how names are set before writing the rule | Plan check 3 (claims), now seen twice | 1 |
