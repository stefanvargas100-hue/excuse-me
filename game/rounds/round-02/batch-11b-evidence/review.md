# Independent review of batch 11

Reviewed 2797a9c and a7840d2 against 80a3426 on f1eb59e; production left unchanged. Current art worlds retained. The two documented spill/banner exceptions match the diff.

## Inspection findings
- S3, visuals owner: Takeshita's backed instruction strip is faint at actual 320x568 and 390x844 sizes. Reproduce with the committed after-320-6-entry.png and after-390-6-interior.png. Text can be deciphered on close inspection, so this is weak contrast rather than completely unreadable or obscured text. Request a marker pass after world finish, or preserve marker contrast through finish; do not replace the neon world. Subway signs, race banner, pause and HUD are separated. Both complete sheets and the two individual neon images were opened; these are existing browser captures, not a fresh browser or phone check.
- S3, online/gameplay owner: src/sim/race.js cupPressure ignores route IDs. A friend-Cup human/remote on the other floor, within 0.3..4 forward metres behind a bot and 0.6 lateral metres, sets that bot's pressT/pressX; think then charges lane cost. Reproduce with player route main, bot mezzanine at x=0,z=150 and player x=0,z=148 in a friend Cup. Ordinary inDraft and collision/shout paths do check sameRoute. This is an existing route isolation gap, not introduced by the reviewed diff. Add same-floor positive and cross-floor negative Cup pressure tests in a follow-up production batch.
- No S1/S2 implementation regression found by source inspection. Route props use the existing BARRIER circles and barrier drawing. Route walkers reflect at aprons, and rear pruning is shared with normal crowd. Generation is incremental, independent of active floor, so route props remain present during ordinary traversal. Large station gaps are intentional; a 35m lookahead can contain zero actors.
- Main chunk generation runs before route-local mk calls, whose dedicated random generator is restored in finally even without S.seed. Classic does not use raceBuild. Changed local actors no longer consume the unseeded main stream. Seeded checksums now include local actors, which is appropriate for sr2. Record courseTag changes only the two route stages; existing sr1 saves remain stored. PROTO 8 and the mismatch test reject older layouts.
- Player/bot cruise/stairs use the same routeSpeed; bots call updateRoute and sameRoute in avoidance, collisions and drafting. Their steering/ability policy remains a bot policy, not literally identical player behaviour. Pickups are main-only for collection, attraction and drawing. Spill interaction and drawing now isolate floors.

## Measurement method
Reproduce with `node tools/route-review.cjs > game/rounds/round-02/batch-11b-evidence/raw.json`. Seeds 4,8,42, small and large builds, identical default gear, both routes, loaded and obstacle-free controls: 48 runs. Controller uses held left/right keys, game tick at 60Hz and local collision-circle lane scoring within 16m. Entrance movement is physical; traversal never writes x,z,speed,route or clears actors. Both routes use the same ability policy (no deliberate abilities); passive pickups, combos and draft remain normal simulation. No bots. Initial clean controls alone remove initial crowd and suppress future spawning with distant chunk/timer values; loaded trials never do so. Complete run and entrance-plane-to-exit-plane segment times, collisions, absolute lateral distance, route entry and completion are retained. Segment times exclude approach; full times include it.

Limitations: discrete reactive lanes, approximate pedestrian prediction and player radius, no global planning, ignores spill hazard geometry; forced entrance waypoint can collide. Different paths influence dynamic random-event consumption. Multiple seeds do not prove human skill or isolate every source of variance. No balance constants changed. Fixture test steers around a retained central barrier with zero collisions and real movement. Lane decision assertion failed with the empty implementation, then passed; initial fixture setup incorrectly supplied an incomplete lesson object, corrected to spawn suppression before passing. Focused review checks: 28/28 side-route/hitbox tests plus 2/2 controller tests; build passed. Existing 715-test suite and fit are builder-reported, not repeated per brief. Frame evidence is one desktop four-racer scene at a time, unthrottled, with simulation running but fixed interior player; actor omission is diagnostic only. Repeats and low precision cannot establish phone performance.

The disabled-controller mutation was subsequently run against both fixture assertions: both fail, including the physical fixture's zero-collision assertion. Restoring the controller gives 2/2 passes (controller-mutation.txt and controller-green.txt). This confirms the fixture detects absent avoidance rather than merely successful forward motion.


## Timing results

Seconds; positive gain means side faster.

|Stage|Control|Seed|Build|Main / side full|Main / side segment|Full gain %|Main / side bumps|
|---|---|---|---|---|---|---|---|
|Subway|loaded|4|small|144.15 / 150.43|69.88 / 64.68|-4.36|13 / 12|
|Subway|clean|4|small|149.05 / 141.95|71.70 / 64.40|4.76|0 / 0|
|Subway|loaded|4|large|160.65 / 149.72|84.78 / 62.23|6.81|20 / 17|
|Subway|clean|4|large|143.97 / 137.15|69.18 / 62.17|4.73|0 / 0|
|Subway|loaded|8|small|159.93 / 141.12|81.13 / 64.13|11.77|17 / 9|
|Subway|clean|8|small|149.05 / 141.95|71.70 / 64.40|4.76|0 / 0|
|Subway|loaded|8|large|154.55 / 152.78|72.50 / 61.68|1.14|18 / 17|
|Subway|clean|8|large|143.97 / 137.15|69.18 / 62.17|4.73|0 / 0|
|Subway|loaded|42|small|156.25 / 150.60|75.53 / 64.25|3.62|17 / 12|
|Subway|clean|42|small|149.05 / 141.95|71.70 / 64.40|4.76|0 / 0|
|Subway|loaded|42|large|159.28 / 147.42|77.83 / 61.80|7.45|21 / 13|
|Subway|clean|42|large|143.97 / 137.15|69.18 / 62.17|4.73|0 / 0|
|Takeshita|loaded|4|small|147.07 / 134.23|74.65 / 64.50|8.73|29 / 15|
|Takeshita|clean|4|small|120.95 / 121.75|63.72 / 64.35|-0.66|0 / 0|
|Takeshita|loaded|4|large|132.88 / 131.63|70.20 / 62.28|0.94|26 / 16|
|Takeshita|clean|4|large|116.85 / 117.65|61.48 / 62.10|-0.68|0 / 0|
|Takeshita|loaded|8|small|133.35 / 139.58|63.80 / 64.47|-4.67|17 / 21|
|Takeshita|clean|8|small|120.95 / 121.75|63.72 / 64.35|-0.66|0 / 0|
|Takeshita|loaded|8|large|125.53 / 134.95|62.15 / 62.27|-7.50|12 / 18|
|Takeshita|clean|8|large|116.85 / 117.65|61.48 / 62.10|-0.68|0 / 0|
|Takeshita|loaded|42|small|144.25 / 129.37|69.55 / 64.57|10.32|30 / 11|
|Takeshita|clean|42|small|120.95 / 121.75|63.72 / 64.35|-0.66|0 / 0|
|Takeshita|loaded|42|large|130.68 / 126.97|65.22 / 62.75|2.84|20 / 10|
|Takeshita|clean|42|large|116.85 / 117.65|61.48 / 62.10|-0.68|0 / 0|

## Verdict and decisions
All 48 complete; no entry or completion failure. Loaded Subway full-run gain ranges -4.36%..11.77%, segment gain about 7.4%..26.6%. Loaded alley full-run gain -7.50%..10.32%; four of six matched samples favour the easy route, including two >8%. This is a concrete sensitivity issue with the approved easy non-dominance rule (S2 balance evidence, gameplay/Director owner), but controller collision counts remain high (9..30 per loaded run), so it does not establish skilled-human dominance. Clean controls give Subway ~4.74..4.76% full-run reward and alley ~0.66..0.68% full-run cost. The segment-only geometry denominator differs from the complete-course target and is shown separately, not substituted for acceptance. Nominal geometry supports the intended direction; loaded skilled acceptance remains unproved.

Recommend hold integration for a targeted human timing session: same two builds, matched seeds 4/8/42, main/side physical steering, entry/rejoin and finish splits plus collision counts. This is the smallest next check of whether avoidance skill removes the easy advantage. Option two: improve this controller's prediction/abilities and require low-collision main traversals before retesting; more engineering, still no human proof. Option three: request explicit Director design tradeoff on alley crowd parity/length, then tune and repeat nominal and loaded checks; do not blindly add 10% alley penalty from these noisy runs. No acceptance thresholds or production tuning changed here.

First clean-control attempt allowed scripted event spawns; initial-controls-contaminated.json preserves those invalid control samples. Suppressing eventT and rushT as well as chunk/fast/rival timers at initial setup yields maxActors=0 and bumps=0 in all 24 clean samples. A complete-course regression now checks that. Loaded rows were not rerun because that correction changes only initial clean setup; new maxActors field is present only on repeated clean rows. Exact Windows reproduction with UTF-8 redirection: `cmd /c "node tools/route-review.cjs > game/rounds/round-02/batch-11b-evidence/raw.json"`. Raw lateral costs are in JSON. Initial-generation/ordinary-pruning inspection supports route population, but ahead-only popMin=0 does not prove the whole route empty: no claim of continuously visible crowd is made. Real phone performance, touch steering, hardware safe areas, multiplayer devices and human balance remain unchecked.

Additional ordinary-traversal harness check physically steers through each entrance and beyond 230m, observes upcoming route-local props with no actor clearing or route-state assignment, and passes for both stages (seed 42). This checks genuine generation during movement rather than forced screenshots. Final controller harness total: 4/4, including the clean control and ordinary-traversal checks.
