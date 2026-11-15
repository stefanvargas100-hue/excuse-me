# Round 02, batch 27f: the crowd steers round porters' carts

**To:** the batch 27 builder, on `stefanvargas100-hue/stage-features`. 2026-11-15, from the lead.
**Why now:** the independent review (27e) passed, with one visible flaw. Director decision 2026-11-15: fix it before the playtest push. Record identities stay as they are.

## First
Merge `stefanvargas100-hue/stage-features-review` (f07db0b) into your branch. It adds `test/batch27e-review.test.js` and the review report `reports/batch-27e-review.md`. Read that report's finding S1 only.

## The flaw (S3)
Other people walk through porters' carts: in 20 four-bot Tsukiji races, 85 of 147 porters had someone pass through them on screen. Three causes, from the review:
1. Avoidance treats a porter as a 0.25 m point at its body (`src/sim/crowd.js:99`, `q.prop ? q.rad : 0.25`), not as the body plus the 1.6 m cart.
2. `spawnUnit` can create a person already touching a porter, because the porter stands far ahead of the chunk that made it (25 of 5,666 people).
3. Porters walk through shoppers stopped at a stall in their lane.

## Build
- People steer round a porter's whole footprint, and nobody is created on top of one. Choose how to deal with stopped shoppers in a porter's lane, and say how.
- Test first: a test that fails today because people overlap a porter's circles.
- Commit a small measuring script in `batch-27-evidence/` that counts, per porter on screen (within 62 m ahead of the camera), anyone overlapping its circles, for seeds 1-20. Target: none. Give before and after.

## Must hold
- Porters keep their place (chunk start plus run clock), their straight line and exactly 1.0 m/s. The reviewer's and your own porter tests stay true unedited.
- Nothing new looks at where a racer is. A host and a guest still see the same thing.
- Only Tsukiji changes. The other 11 stages give exactly the same people: the fixture test passes, and in `test/security.test.js` only the stage 7 hash may be re-taken.
- The open side of the alley stays at least 1.9 m wide beside a porter once people have stepped round it. Measure it and report the smallest gap.
- Bots: Tsukiji seeds 1-20, every bot finishes, none stuck, slip-throughs no more than the 1 there is now.
- Medals: Tsukiji only, by the same rule as 27c (change a medal only if both measures move the same way by more than 3%).
- `PROTO` stays 15: nothing since 14 has been published.

## May edit
`src/sim/crowd.js` (avoidance of porters only), `src/sim/people.js`, `src/config/medals.js` (Tsukiji, by the rule), `test/tsukiji.test.js`, `test/batch27-features.test.js`, new tests, `test/security.test.js` (stage 7 hash), `batch-27-evidence/`, and your report. Anything else: stop and ask.

## Done when
`npm test` once, `npm run build` and `git diff --check` pass; the report's 10-line block is current; `worker_done` sent. Stop after 2 failed attempts and report the count that remains and why.
