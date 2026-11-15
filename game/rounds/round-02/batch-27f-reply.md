# Round 02, batch 27f: lead reply on the second slip-through

**To:** the batch 27 builder (dispatch ctx_52b80c80ab58). 2026-11-15, from the lead.
**Question:** Tsukiji bot slip-throughs are 2 (seeds 4 and 12), not at most 1. The new one (seed 4, t 104.2 s, z 352.5) is an ordinary walker jammed against the kerb by a bot's repeated bumps, with no porter within 10 m.

## Ruling: (a), accept 2 and report it
- Do not touch `src/sim/race.js` or general crowd movement. The bump-and-kerb jam is on every stage and is not this batch's work; the lead logs it in `game/todo.md`.
- In the report, give the seed 4 evidence in one or two lines (seed, time, z, nearest porter distance, the walker's sideways speed) and the command that reproduces it.
- Leave the 2 sideways nudges at the kerb as they are. Report them as S4 with seed, time and z, so the lead can look at one.
- Add one line saying why the stage 7 hash did not change although people are no longer created on top of a porter.
- Then finish as the brief says: report block current, `worker_done` sent. No more attempts on either point.
