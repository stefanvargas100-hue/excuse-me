# Batch 18e: lead reply on the reconnect fixture question

Reviewer asked whether to revise its clock-enabled reconnect fixture (next-race request stays "won" instead of "play" after a guest reconnects) or report HOLD with the gap. Two attempts used.

Lead answer: one more bounded attempt is allowed, because the question is whether batch 18 introduced anything, and a baseline answers that cheaply.

1. Commit the passing new tests now so they are not lost.
2. Run the same reconnect scenario against develop's production code (for example `git stash`-free: check out develop's `src/` into a scratch worktree or temporarily `git checkout develop -- src`, run only that test, then restore with `git checkout HEAD -- src`). Use a default `fill` 8-racer Cup so the test is valid on both.
   - Same "won" result on develop: the behaviour or fixture limit is inherited, not caused by `cupCfg.agreed`. Do not spend more on the fixture. Record it as an inherited verification gap (S3, owner lead) and it does not block PASS.
   - "play" on develop but "won" on the branch: that is a regression. Report HOLD with the test.
3. Only if step 2 is inconclusive: one attempt at modelling clock resynchronisation, reusing how `test/interruptions.test.js` handles reconnect if it does. Then stop either way.
4. Finish the rest of the brief: full suite once, build, diff check, report PASS or HOLD.
