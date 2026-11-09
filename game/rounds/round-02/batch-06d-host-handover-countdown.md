# Round 02, batch 06d: host handover, countdown fix

**Builder:** the same Claude Opus worker that did 06b (`host-handover-2`), sent with `send`. Why: it built this code and has the context.
**Risk:** high. After the fix, the Codex reviewer from 06c rechecks only this change.

## Start from
Your branch `stefanvargas100-hue/host-handover-2` at `4061d45`. Read the review: commit `f53dace` on `stefanvargas100-hue/review-host-handover`, file `game/rounds/round-02/reports/review-host-handover.md` (`git show f53dace:game/rounds/round-02/reports/review-host-handover.md`).

## Must fix: phones disagree at the countdown boundary
`duel.js` around lines 301-304 decides "cancel the race" from each phone's own `S.race.countT`. Each phone's countdown ends at a slightly different moment. The reviewer showed the problem: the next host at `countT=0` keeps racing, while a guest at `countT=0.1` cancels. Both then wait, and the race is half-run. This breaks the rule that a race runs for everyone or for no one.

- Make one shared decision per start attempt. The simplest fix that meets the rule: the new host decides (from its own state) and sends the decision, naming the attempt (seed or round). Guests follow that message and never decide alone. A different design is fine if every phone always ends in the same state.
- A guest that already started racing must follow a "cancelled" decision, and a guest still counting down must follow a "carry on" decision.
- Tests, written first and seen failing: the reviewer's case both ways (host at 0 and guest at 0.1; host at 0.1 and guest at 0), plus both at 0 and both above 0. Each test ends with every phone in the same state, and the race can then be restarted or finished.

## Should fix: "race 0 of 4" after a cancel
After a cancel, `d.cup.race` is 0 while `rounds` is empty, so the screen shows race 0 of 4 and "Finished / waiting for racers" (`src/sim/game.js` around lines 391-393). Show the race that is about to be restarted.

## May edit
As in batch 06, plus `src/sim/game.js` for that results display only. Your report goes in `reports/batch-06-host-handover.md` (add a "06d" section).

## Done when
New tests failed first, then pass. Focused online tests, `npm test`, `npm run build` and `git diff --check` pass. Run the room simulation again with the host leaving in race 2. Commit, then report as before.
