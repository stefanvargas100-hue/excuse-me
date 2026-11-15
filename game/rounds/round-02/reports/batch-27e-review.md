# Batch 27e report: independent review of the stage features

```text
Outcome:     done (verdict: PASS, with four findings S1-S4, none blocking)
Branch:      stefanvargas100-hue/stage-features-review, from 8948da4; commit in the worker_done message
Changed:     tests only: test/batch27e-review.test.js (3 tests) and this report; no source changed
Checks:      checks 1-8 reproduced (see below); my 3 new tests pass and fail under the mutations listed; npm test 1059 pass / 0 fail / 2 todo; build ok; git diff --check clean
Not checked: real phones; friend rooms on two phones (host/guest compared in two headless runs only); how the features feel; pause/resume in a room
Off plan:    none
Trouble:     my first bump test for the porter put the racer where auto-run carried it away, so it never touched the porter; fixed by holding the racer's speed each tick
```

## Verdict: PASS

Nothing here needs fixing before merge. The other 8 stages are unchanged. Porters, waiters, the lift and the boards behave as the plan says, and the new Baggage slip-through is an old `queue` event, not a new feature. Four findings follow; S1 is something a person should look at on a phone, S2 is a judgement on the medal targets, and S3 and S4 are gaps in the builder's tests that my new tests close.

## Findings

**S1. Crowd people walk through porters' carts. `src/sim/people.js:366` (placement), `src/sim/crowd.js:99` (avoidance).** Other people steer round a porter as a 0.25 m point at its body (`q.prop ? q.rad : 0.25`), not round its 1.6 m cart, and people do not collide with each other. Across 20 bot races of 4 on Tsukiji (seeds 1-20), 85 of 147 porters had someone walk through them while on screen: 250 different people (124 oncoming, 77 going the same way, 44 walking shoppers, 5 shoppers stopped at a stall). Another 25 of 5,666 people were created already touching a porter (the generator reaches the porter's place later, and `spawnUnit` never looks for a porter). Porters also walk through shoppers stopped at a stall (5 on screen in these races). It changes no result: the racer is blocked by both and the open side is at least 1.9 m wide. It will look wrong on a phone: figures passing through a hand cart. Not fixed, as the plan forbids widening the change.

**S2. Medal targets are not clearly wrong, but the Tsukiji gold target is now tight and the evidence is thin. `src/config/medals.js:11,16`.** See check 7. "Noise, leave them" is sound for every cell except two that look real (Tsukiji Easy slower, Baggage Hard faster), and neither makes a target clearly wrong. The 3% rule in the plan was applied as "more than 3% the same way in both measurements"; that is a reasonable reading, but it is a change from the plan's wording and the lead should know.

**S3. A lift passenger bumped mid-deck was not tested; one wrong edit would have passed the whole suite. `test/batch27-features.test.js:102-130`, `src/sim/race.js:279`.** The builder's lift walk test has no racer on the deck. If `shove()` skipped only porters (`!p.porter`), all 14 builder tests still passed; only my new test failed. Closed by `test/batch27e-review.test.js`.

**S4. The with-and-without test for the boards compares only final positions. `test/batch27-features.test.js:182-190`.** It fails if the board code moves anyone or draws a random number (I tried both), but a board edit that changed the score, energy, bump count, pick-ups, banner or standings would pass. Closed by the third test in `test/batch27e-review.test.js`, which compares those numbers every second, and fails on a board edit that adds 1 to the score. Small related note: a shout at a porter or lift passenger gives a "step aside" reaction and sets `aside`, but they stay locked and do not move (`src/sim/actions.js:38`). Bots then stop shouting at them for 1.3 s (`src/sim/race.js:441`). Harmless; the plan calls the porter a slow obstacle, but a player who shouts at one gets a polite reply and no gap. The 4-person shout limit also counts them.

## Checks

**1. The other 8 stages are untouched: reproduced.** I made a temporary worktree on 8420ed9 and ran `crowd-fixture.js` there. Its output equals the committed `unchanged-crowd.json` byte for byte (JSON compared as text). The fixture does notice a bot race change as well as a solo one: with `1.6` in `shove` changed to `1.7`, all 8 stages differ in the bot race and none in the Daily run. The Daily runs set `ghostT` so the walker never collides; only the bot-race half sees `shove`. `steady` exists only on porters and lift passengers (`people.js` sets it in two places; `race.js:279` reads it).

**2. Porters: reproduced.** 20 bot races of 4 (seeds 1-20, 147 porters), checked every tick.
- *Later people land on top of it, or it is culled or undrawn:* People can land on it (S1). It is never culled early: a porter goes only when everyone is 16 m past it. It is not undrawn: `drawPerson` skips only below 0.6 m and above 62 m from the camera, which is behind the racer. Porters born beyond the goal (up to z 475, goal 420) simply walk on.
- *36 m and wet patches:* The smallest gap between two porters at any tick was 35.99999999995 m. Every porter stood at `base + run clock` to within 0.05 m, so the spacing cannot drift with pace. Margin to a wet patch with the real footprint: 0.04 m at the right and left lanes (body and cart reach x = 3.04, patch edge 3.00), 0.10 m at the middle lane (reaches 0.5, patch edge 0.6). No porter ever touched a patch.
- *Friend rooms:* I ran the same room seed headless at 4.0 m/s, 2.0 m/s and a 1.2 then 0.4 m/s pace. Where two runs both held a porter at the same second, x and z were identical every time (0 of 124 shared porter-seconds differed); the same six porter starting points appeared in all three. Which porters exist at a given second differs with pace (generation range and culling), as with all other crowd. Not checked: two real phones, a start offset between phones, and pause in a room.

**3. Baggage waiters: reproduced.** I replaced the builder's 420 spills with 6,240: spills every 3.7 m of the course, in Classic and race, with chunks built first and spill first, seeds 1-12. The smallest gap between any bag or trolley and any waiter was 1.07 m (the test needs 0.5). 48 of the runs had a group near the goal (the groups stop at goal - 24, so the last group never stands where spills are cut off). Mutation: if `waiterClear` looks only at its own slot (`[k0]`), the builder's test fails.

**4. Skytree lift: reproduced, with a new test.** Passengers are at least 4.6 m apart (`zz += rnd(4.6, 6.2)`), step out on a timer, cross at 1.25 m/s and stop at the glass at x = 7.65 when the wall clamp zeroes `vx` (`crowd.js:142`). Nothing else changes `vx` of a locked person (`scoring.js:85` checks `locked`; `aside` is read only in the unlocked branch). The new test bumps the first passenger mid-deck from behind, the side and the front, for 3 seeds: pace stays 1.25, the line stays, and it stops at the glass. With `!p.steady` removed or narrowed to porters, that test fails. The event places the line from `S.pz` at event time, as `bagspill` does, which the plan allows.

**5. Gate Change boards: reproduced, gap closed.** The with-and-without test does compare the run (positions of the player, bots and all people at 40 s, render every 20 ticks). The flip branch does draw there: adding `S.pz += 0.001` or `Math.random()` to it makes the test fail. It does not compare numbers other than positions (S4); my third test does, and sees a score edit. The timer is read only in `render/gatechange.js:57` and set only in `people.js:454`.

**6. Bots: reproduced.** Rerun of `bot-sweep.js`, seeds 1-20, develop (8420ed9) -> branch: Tsukiji 0 -> 1 (seed 12, bot 1), Baggage 1 -> 2 (develop seed 18 bot 2; branch seed 6 bots 0 and 3). All bots finished on every race; none stuck. Same as the builder's counts.
- *New Baggage slip-through (seed 6, Easy bots 0 at 79.2 s and 3 at 82.0 s, both at x -6.5, z 234.0):* both stand against the left wall just behind a row of 5 standing people at z 234.5 (x -6.65 to -3.25). That is the old `queue` event ("QUEUE ACROSS THE WALKWAY"), not a waiter, a spill or a porter. Its row starts at the wall, so a bot that takes the wall side is pinned for 1.8 s. Develop's seed 18 slip-through is the same shape (a `queue` row at z 141.4). The new run met it only because the changed crowd shifted when the bots reached the event. A human who walks into that pocket would be held the same way: the stuck rule is shared (`race.js:337` and `:497`) and the queue is solid for everyone.
- *Tsukiji (seed 12, Easy bot 1, 122.1 s, z 373):* on a wet patch beside the delivery truck of the `turret` event, as the builder wrote. A human would be held the same way; the patch appears in real runs only since 27c.

**7. Medal times: reproduced from the numbers in `batch-27-evidence/`; no new sweeps beyond rerunning the 20-seed one.** Per cell, a 20-seed sweep has 6 or 7 races of 4 bots, so one standard error of the paired change is 1 to 4 s (about 1 to 3.5%).

| Cell | develop -> branch (sweep median) | Change | Stage test (seeds 1-2) | Same sign? | Target | Branch median vs target |
|---|---|---|---|---|---|---|
| Tsukiji Easy | 141.4 -> 149.8 | +5.9% (paired +7.1 +/- 3.1 s) | 144.1 -> 138.8, -3.6% | no | bronze 151 | -0.8% |
| Tsukiji Medium | 116.7 -> 117.5 | +0.7% | 120.6 -> 117.9, -2.2% | no | silver 113 | +4.0% |
| Tsukiji Hard | 93.5 -> 95.9 | +2.6% | 87.0 -> 94.2, +8.3% | yes | gold 92 | +4.2% |
| Baggage Easy | 142.5 -> 133.4 | -6.4% | 133.7 -> 133.4, -0.2% | yes, small | bronze 142 | -6.1% |
| Baggage Medium | 119.3 -> 113.8 | -4.6% | 111.8 -> 119.1, +6.5% | no | silver 112 | +1.6% |
| Baggage Hard | 97.3 -> 95.1 | -2.3% (paired -3.6 +/- 1.3 s) | 97.3 -> 93.0, -4.4% | yes | gold 99 | -3.9% |

"Noise, leave them" is sound: in 4 of 6 cells the two measures disagree on direction, and the targets were already 0 to 6.5% off the bots' medians on develop (they come from an older three-race calibration). Two cells look real in both measures: Tsukiji Hard slower (wet patches and porters now exist in real runs) and Baggage Hard faster, but both are under 5% against their target. Nothing is clearly wrong. If a target is ever moved, Tsukiji gold (92 against a Hard median of 94-96) is the first to look at, after a bigger sweep. Not run: any new large sweep.

**8. Tests prove what they say: reproduced (mutate, fail, restore).** Edits were undone with `git checkout` after each run; `git status` shows only my new test file.
- *Gate Change boards test* (`batch27-features.test.js`): `S.pz += 0.001` in the flip branch -> fails. `Math.random()` in it -> fails. `S.score += 1` in it -> **passes** (S4); my test fails on it.
- *Baggage spill test:* `waiterClear` looking only at `[k0]` -> fails.
- *Porter "knocked off line" test:* `shove` always pushing -> fails. `shove` skipping only lift passengers -> fails. `shove` skipping only porters -> the builder's suite passes (S3).
Two tests I trust less than the rest: the boards test (S4) and the lift tests (S3).

## Suite
`npm test`: 1061 tests, 1059 pass, 0 fail, 2 todo (the two S4 todos of batch 19c, unchanged); the builder had 1056 pass, plus my 3. `npm run build`: ok. `git diff --check`: clean, run on the staged commit.

## New tests (`test/batch27e-review.test.js`)
1. A racer bumps a lift passenger mid-deck from behind, the side and the front (3 seeds): pace, line and stop at the glass unchanged.
2. A racer bumps a porter from behind, the side and the front (2 seeds): no sideways push, same x, same 1.0 m/s.
3. The gate-change boards leave score, clock, energy, bumps, standings, bot positions, pick-ups, banner and people count unchanged, second by second, and the timer was live for more than 60 ticks.

## Left for a person
Real phones; friend rooms on two phones, including a pause and a late joiner; whether figures walking through carts (S1) looks wrong on a phone; whether the Tsukiji alley is too crowded with shoppers, porters and wet patches together.
