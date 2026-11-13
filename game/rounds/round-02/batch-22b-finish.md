# Round 02, batch 22b: Finish spectating validation (same worker, same branch)

The lead read the partial report for ab523cf. The implementation approach and the `stepRemotes` sampleOnly ruling stand. Finish the missing checks; do not widen the code change.

1. **Friend Cup:** confirm, with the plan's test, that a Cup's next race starts while a guest is still spectating, and that Cup points and the award animation are unchanged after stop watching. Add the test if it is not in `test/spectate.test.js`.
2. **Browser evidence:** rerun your corrected two-page capture once. Required: 320x568 and 390x844 of a host and a real joined guest spectating a bot and a human, and after stop watching. If the fixture still fails twice, stop and report the exact failing step; do not keep retrying.
3. **Fit:** name the one extra fit problem (71 checks, 37 vs 36) and say whether spectating causes it. The spectate bar is not covered by the checker, so check it in your screenshots instead: reachable, nothing clipped at 320 wide.
4. **Full suite once** with no other suite running on the machine. The Skytree calibration test is slow when the machine is busy (the lead's develop run passed it); if it times out again, rerun only that file and report both results.

Then update `reports/batch-22-spectating.md` (10 lines) and report with worker_done. The independent review follows after the lead's check.
