---
name: process-review
description: Use when reviewing a worker's report, when something in the process surprises you, or before changing how workers operate. Question the evidence, trace causes back to our own instructions, and decide whether to fix or ask the Director.
---

# Process review

Review how the work was done as well as what was built. This method comes from the Director's own questions during Round 1, which keep finding problems that passing checks missed.

## Questions to ask
| The Director asked | Ask yourself | What it found |
|---|---|---|
| "Why did the report format not get followed?" | **What did the worker actually receive?** Check every instruction source, including ones the tools add, before blaming the worker. | Orca requires three sentences, and `AGENTS.md` asked for a labelled report. Our rules conflicted. |
| "Can you dig deeper to figure out why?" (about tests that failed first) | **What does this evidence really prove?** Read the actual failure, not the summary. | All 4 tests stopped on a missing file, so that failure proved less than it seemed to. |
| "Did you pull from the skills we already had?" | **Did I do what I said?** Check it against the files. | Only one skill was reused, and others I had recommended were not in the process. |
| "Am I missing anything?" | **What is the real goal, and what costs the most?** | The aim became fewest tokens per finished batch, not least context per agent. |
| "Is this the best way to accomplish this?" | **Is there a cheaper fix that works?** | Most failures need a test or a guide line, not a new skill. |
| "Does this change anything?" | **Which earlier decisions does this new fact affect?** | Wanting Codex and copyable studios changed the layout. |

## Steps
1. **Separate claims from evidence.** List what the report claims. Reproduce what matters, and label the rest "reported, not checked".
2. **Find the cause.** Look at the session log and the actual instructions when you can. Check our own instructions first, because the worker usually did what it was told.
3. **Test the checks themselves.** Break the code on purpose or inject a problem, and see whether the check notices. A pass only means no rule was triggered.
4. **Look at the real thing.** For anything visual, open the screenshots even when the tools pass.
5. **Say plainly what was wrong,** including your own mistakes and earlier statements that turned out incorrect.
6. **Decide who fixes it,** using the next section.
7. **Make the lesson last.** Choose the cheapest permanent fix from the list in `studio/lead-playbook.md`, and log it in `game/failures.md`.

## Fix it or ask the Director
**Fix it yourself and report it** when the solution is clear, within agreed scope, easy to reverse, and leaves the game's design and the studio's way of working as they are.

**Ask the Director** when any of these is true:
- You do not have a clear solution, or you are choosing between real trade-offs.
- It changes how workers operate, or what the player experiences.
- It touches something outside this repo, such as installed skills or accounts.

When you ask, give what you found, the evidence, 2-3 options with their costs, and your recommendation. Then review it together and let the Director choose. Do not make the change first and explain later.

## When a worker's problem traces back to the lead
The Director's standing instruction: keep learning from your mistakes. If a worker struggled because of your plan, rule or target:
1. **Say so plainly,** and do not blame the worker.
2. **Ask why it got past you.** Name the check that would have caught it, not just the mistake.
3. **Log it** in the "Lead mistakes" table in `game/failures.md`.
4. **Build it in.** Update an existing skill, template or rule first. Create a new skill only if the lesson is a multi-step process nothing else covers. Prove the change on the next worker.
5. **Ask the Director for direction** if you cannot tell why it happened or what the fix should be.

## Before relying on a process change
- Check it against the instructions the tools add. Read them with `orca orchestration dispatch-show --task <id> --preamble`.
- Say whether it has been tested. A rule is untested until a worker has followed it.
- Check the next worker's report to confirm it worked.
