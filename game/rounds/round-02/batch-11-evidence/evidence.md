# Batch 11 evidence

## Batch 09 reconciliation (e6b7ef4..243fd51 reviewed, no branch merge)
1. Retained intrinsic-width leaderboard tabs: Challenge fits at 320 px (before/polish captures).
2. Adapted berry ink only for leaderboard secondary labels. Other menu colours left authoritative; no broad classic palette restoration.
3. Adapted route wayfinding: backed sign at y=82, outside pause and live banner; correct alley/stairs difficulty. Marker colours pause the world recipe.
4. Adapted opaque separate floor environment. Existing style hooks recolour Subway ink-noir and Takeshita neon-pop; no classic stage restoration.
5. Superseded tile detail: ink-noir world already supplies high-contrast wall treatment; more joints add noise.
6. Superseded pastel shop panels: neon-pop's existing luminous facades define this world.
7. Superseded plank/rail detail: pulp world's established graphic treatment retained.
8. Superseded extra canopy greens: Sunday funnies recipe already layers its canopy palette.
9. Superseded rosette: existing podium identity retained; unrelated decorative change unnecessary.
10. Superseded card gradients/inset shading: existing paper UI retained; avoids changing every menu without a functional gain.

Screenshots are forced browser states, not real-phone play. `node game/rounds/round-02/batch-11-evidence/capture.mjs before|polish|after` captures both phone viewports and offline render-only timing (200 warm frames). Supabase requests blocked. Route coach shown deliberately to inspect wayfinding overlap. Only leaderboard menu and route scenery changed in polish. Before/polish screenshots inspected at 320 and 390; no podium change. Historical before/polish images were captured on 80a3426 / 2797a9c respectively; the capture script was later refined for clear final interiors and live banners, so phase names alone do not restore historical code.
## Gameplay and compatibility
Route-local data uses existing barrier drawing and the exact BARRIER collision circles; alternating stations leave a narrow centre lane on Subway and wide gaps in the alley. Pedestrians reflect inside clear 20 m aprons. A dedicated PRNG preserves main-floor streams even in unseeded offline races; baseline/changed main-path measurements now match exactly for every seed. Bot cruise/stair speed now matches the player and bot steering ignores other floors. Main-floor pickups are neither visible nor collected upstairs/in the alley. Only Subway/Takeshita course keys move sr1 -> sr2, old saves remain stored; multiplayer PROTO 7 -> 8 rejects mixed courses. Medals unchanged: no defensible new medal targets from this controller.

Meaningful failing tests: missing real actors/props on both routes, missing course tags, absent bot speed benefit, both cross-floor spill directions. Positive same-floor spill controls pass. A later regression caught unseeded route identities changing across repeated generation; it failed before the dedicated stream fix, then passed. Final focused suite: 25 pass. Related routes/rotation/styles/powerups: 32 pass. Final full suite after all production edits, including dedicated-stream isolation and banner placement: 715 pass, zero fail (final-full-suite.txt). Earlier 714-pass run is historical, not final-tree evidence. Final focused suite: 25 pass. Fit: 70 checks, zero problems with the final CSS. Final build and diff check passed. Real phones, human route timing, and independent review remain unchecked.

## Fixed-controller travel measurements
Commands: `node tools/route-measurement.cjs`, outputs baseline-measurements.json and changed-measurements.json. Seeds 4, 8, 42; same default male medium gear; 60 Hz; no dash/burst/shout; no bots; live crowd. The controller prescribes centre x each frame except right-side entrance positioning, so it ignores lateral travel cost and deliberately crashes into main-floor people. These are reproducible sensitivity measurements, not skilled-traversal fairness proof.

| Stage / seed | Before main / side (s) | After main / side (s) |
|---|---|---|
| Subway 4 | 124.20 / 98.05 | 124.20 / 105.20 |
| Subway 8 | 124.88 / 94.32 | 124.88 / 97.55 |
| Subway 42 | 111.02 / 92.57 | 111.02 / 96.35 |
| Takeshita 4 | 108.47 / 102.30 | 108.47 / 102.30 |
| Takeshita 8 | 110.37 / 98.25 | 110.37 / 98.25 |
| Takeshita 42 | 99.20 / 91.42 | 99.20 / 91.42 |

Nominal geometry-only tests still enforce hard 3-8% gain and easy 0-1% cost. Loaded runs show 13-22% Subway gain and 6-11% alley gain for this collision-heavy controller; easy-route non-dominance is NOT established by these measurements. Increasing alley length to offset poor main-path steering would contradict the nominal target, so no arbitrary speed penalty was introduced. The lead/Director needs collision-aware playtest timing before visual/gameplay sign-off.

## Frame work
`frame-check.mjs` adapts tools/perf-check.mjs: same 20-second real-rAF work/interval instrumentation and summary; one unthrottled four-racer sample per stage instead of the stock full matrix. It holds the player at the interior/busiest scene while real simulation runs. `--baseline` uses Vite's load hook to read 80a3426 sources without checkout; PROTO assertions verify baseline 7/current 8. Supabase blocked. Run for --level=0, --level=5, --level=6 with and without --baseline. Median work ms: Terminal B 13.0 -> 12.6; Subway 1.0 -> 1.3; Takeshita 3.5 -> 4.1. The first route increases exceeded 10% and were investigated with uncontended repeats plus actor omission (below); initial render-only timings were contaminated by concurrent simulation measurement and are not the authoritative frame result. This is desktop browser evidence, not phone performance.

## Screens and approved scope exceptions
Before/polish/after sheets were inspected for both 320x568 and 390x844, including all changed menus and route entrance/interior/rejoin. Final clear interiors move the camera nearer the first station and hide the coach; earlier before/polish shots retain it to inspect overlap. No podium was changed. New floor drawings run after styleGround, preserving style hooks while hiding base-floor neon signage/grid and ink scenery. World colour recipes, figures and finishes remain authoritative.

Review found the injected RUSH HOUR banner off-screen: game.js sets radarTop from the bottom race HUD, then render.js used radarTop+112. The coordinator explicitly approved changing only live-race banner y placement; it now uses y=180, preserving text, fade timing and behaviour. Final after-320-sheet.png and after-390-sheet.png were inspected with the live banner, route entrance/interior/rejoin signs and crowd together. The route strip is y=67..97, race banner y=162..198, and pause control remains above both; bottom HUD stays clear. These are browser emulation viewports with default safe-area insets, not hardware notch/phone evidence. The earlier game.js spill-guard exception was also explicitly approved; no Cup/results/start logic changed.

## Remaining acceptance
Outcome is partial: art-world-compatible polish and route populations are implemented, but competent loaded traversal must establish easy-route non-dominance and hard-route reward before integration approval. Existing fixed-controller measurements are retained as negative/limited evidence rather than a balance acceptance claim. Independent review remains required by the batch brief.

## Final frame-cost investigation
After final production edits and the full suite finished, reran each route for 20 seconds with all actors, then with route-local actors removed by the harness before each game callback (--omit-route-actors). No production source was changed for omission.

| Scene | Baseline work median / p95 ms | First changed median / p95 | Final repeat median / p95 | Omit route actors median / p95 |
|---|---|---|---|---|
| Subway interior | 1.0 / 1.4 | 1.3 / 1.8 | 1.1 / 1.7 | 1.1 / 1.5 |
| Takeshita interior | 3.5 / 4.3 | 4.1 / 5.9 | 3.8 / 4.7 | 3.8 / 4.5 |

Final repeat median changes are about 10% / 8.6%, with 0.1 ms reporting precision; route-actor omission did not shift the median at that precision, but lowered p95 by 0.2 ms in both scenes. The opaque route draws more wall/trim primitives than the old transparent floor, and the unchanged world style hooks still run. The initial higher deltas were not stable in the repeats. These single-sample runs establish desktop work cost only, not a statistical phone-performance claim. All four final repeat/omission samples had 16.7 ms median rAF and zero intervals over 33 ms. Original higher samples are retained alongside the repeats. No further performance tuning justified by this evidence.

Final checks: 715/715 full tests, 25/25 focused route tests, 32/32 related routes/rotation/styles/powerups tests; fit 70 checks / 0 problems; final build passes; git diff --check passes. No live service, dependency, load test, deployment, merge or push. Two approved scope exceptions only: spill sameRoute guard in game.js; race banner y coordinate in render.js. Ready for independent review, not balance sign-off.
