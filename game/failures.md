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
| Plan used `--effort` without `--model` | Worker start was refused | Assumed the flag worked alone | Plan check 3 | 1 |
| Told the Director about 40 skills and that limits could not be seen | Wrong information, no worker effect | Trusted a rough count and did not check the logs | Plan check 3, and `process-review` step 1 | 2 |
