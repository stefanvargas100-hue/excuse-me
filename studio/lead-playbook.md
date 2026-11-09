# Lead playbook

The Director owns the vision, approves ideas, playtests and approves merges to `main`. The lead turns that into reviewed work. Workers build one batch each.

## Each round
1. **Start fresh.** Open a new lead session and read `game/status.md`. Do not carry one long session across rounds.
2. **Review what changed** since the last round, not the whole game. Fix small bugs on the lead branch.
3. **Propose 5 ideas** in `game/rounds/round-NN/proposal.md`, each judged against `game/vision.md`.
4. **Get Director approval.** Nothing is built before this.
5. **Write batch plans** from `studio/templates/batch-plan.md`, one file per batch.
6. **Start workers.** See "Starting a worker".
7. **Review each result:** read the diff, confirm it stayed within the plan, and rerun checks only where the report leaves a gap. Send fixes back to the same worker.
8. **Merge into the lead branch** one batch at a time, running the tests after each.
9. **Director playtests** and approves the merge to `main`.
10. **Close the round:** write `round-report.md`, update `game/status.md`, handle `game/failures.md`.

## Sizing batches
- Group related small changes into one batch. Every worker starts cold, so five tiny workers cost more than one.
- Run 2-3 workers at a time, in separate parts of the code. Files such as `src/main.js`, `index.html`, `style.css`, `src/sim/game.js` and `src/online/duel.js` are shared: batches touching them run one after another.
- Name the function or section in the plan where possible. A precise plan is the cheapest way to save worker tokens.
- Do not add a lead layer inside each area. Reconsider only if one area regularly needs 3 or more workers at once.

## Starting a worker
Choose the model using `studio/model-routing.md`. Each batch gets a temporary branch from the lead branch:

```text
orca orchestration worker-start --spec "Read AGENTS.md, then do game/rounds/round-NN/batch-NN.md." \
  --worktree new-top-level --repo name:<repo> --name <short-name> --base-branch <lead-branch> \
  --agent <claude|codex> --model <id> --effort <level>
```

End your turn after starting workers: Orca wakes you when they report. Do not poll. Delete the branch and workspace once a batch is merged.

## Controlling tokens
- Worker reports stay at 10 lines. Details belong in the commit or the round folder.
- Use the strongest model only where the risk justifies it.
- A second review is only for risky batches, such as online, save data or anything live.
- Record token use (where the tool shows it), files opened, retries and fix requests in the round report. Use those numbers to tighten or restore context.

## When something fails
A worker stops after 2 failed attempts and reports. Log it in `game/failures.md`, then solve it. Bring in the Director only for a creative call or when you are stuck.

A problem seen twice across batches gets a permanent fix. An expensive or dangerous one, such as lost save data, gets one the first time. Write it while the solution is fresh, using the cheapest option that works:

1. **Fix the code** when the code itself is the trap.
2. **Add a test or script** when a machine can catch it.
3. **Add a line to an area guide** for a fact about this game.
4. **Add or update a skill** for a multi-step process useful across tasks.
5. **Add a line to `AGENTS.md`** only if every worker on every task needs it.

## Skills
- Update an existing skill before creating a new one.
- Also create one when the same instructions appear in three batch plans, even if nothing failed.
- Store skills in `studio/skills/<name>/SKILL.md`, outside the folders tools scan automatically. Batch plans name the ones they need.
- Test a new skill: give a fresh worker a similar problem with only the skill and no hints. If it still fails, the skill is not ready.
- Every few rounds, merge overlapping skills and remove unused ones.

## Handing over the lead
If limits run low, write `game/status.md` from `studio/templates/handoff.md`, commit it and tell the Director. Either model can continue from the repo.

## Always ask the Director first
Merging to `main`, changing the live database, spending money, deleting branches, and any creative decision that changes the vision.
