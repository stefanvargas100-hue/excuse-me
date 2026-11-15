# Batch 27d: reply on the porter notch

**To:** the batch 27 builder (dispatch ctx_32a82d84ebd1), 2026-11-15, from the lead.

**Question:** with the stuck rule counted correctly, Tsukiji seeds 1-20 give 0 slip-throughs on develop and 4 on the branch, all from bots wedged in the notch between a porter's body circle and its cart circle. A trial circle `{ox 0, oz 0.4, r 0.32}` cut it to 1.

**Ruling: option (a).** The notch is a flaw in the porter's shape and would catch a person too, so close it.

- Add the circle in `porterCircles` (`src/sim/people.js`). Footprint stays at most 0.9 m wide. Adjust `drawCart` in `src/render/figures.js` only if the drawing no longer fills the hitbox.
- Add a test first that fails on the notch (a racer steered into the gap between body and cart is turned aside, not held).
- Re-run the Tsukiji sweep with the corrected count. Look at the last slip once: fix it if the cause is the porter shape and the fix is as small as this one. Otherwise stop and report its seed, time and cause. Do not tune bots or anything else for it.
- Re-count the other three stages with the corrected rule, before and after, and put the numbers in the report: the batch 27 figures used the wrong count.
- `test/security.test.js`: re-take the stage 7 hash again only if it moves. Stages 0-6 and 8 must match unedited.
- Medals: agreed, no Tsukiji change on those numbers. Re-check after this fix by the same rule.
- Then `npm test` once, build, `git diff --check`, update the report and send `worker_done`.
