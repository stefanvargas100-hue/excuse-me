# Brooklyn Bridge plan � working choice

Chosen provisionally after release checks; switch to Times Square if Stefan prefers. The implementation below follows the four planned batches. NYC Cup is a separate feature after this course is verified.

## Batch 1 � Course foundation
- Append id `bridge` without changing the first four stage indexes.
- 600 m race along a broad wooden promenade through two Gothic stone towers; endless modes continue scenery beyond the race course.
- Manhattan skyline, river on both sides, suspension cables, stone tower portals. Separate renderer; deterministic scenery and distance-based detail limits.
- Day, golden hour, mist variants; respect calm mode. Stage card, music, reactions, mode integration.
- Test first: level registration, stable variants, endless continuation, race finish and render determinism.

## Batch 2 � Crowd and obstacles
- Commuters, tourists taking photos, joggers; keep right. Avoid implying a current real-world cycling lane on the promenade: use pedestrian-only gameplay.
- Benches, bins, camera tripods, temporary maintenance barriers with fitted hitboxes. Clear opening stretch and a measured passable route through each obstacle row.
- Reuse existing movement/collision rules. No surprise vehicle crossing at the towers.
- Test first: all prop kinds appear, bounds fit artwork, seeded layouts repeat, neither tower approach blocks the route.

## Batch 3 � Tower moments and race choices
- Shared geometry for narrowed tower portals across renderer, player, bots and crowd; taper approaches rather than snapping runners sideways.
- Two readable route moments away from tower pinch points: direct queue versus a wider clear side route. Extend shared route definitions and version the new course from its first release.
- Test first: passable openings, no rail bypass, bot navigation on several seeds, a complete generated race, elimination/friend-room compatibility.

## Batch 4 � Review and release
- Screenshots at 320 x 568, 390 x 844 and desktop: start, cables, tower approach/interior, finish for each variant.
- Check calm mode, crowd visibility behind cables, stage-card fit with five stages (add pagination if needed rather than shrinking labels), and phone performance.
- Full tests/build; commit and review note. Physical-phone and multiplayer checks remain explicit release checks.

## Following feature � NYC Cup
Fifth Avenue ? Central Park ? Brooklyn Bridge. Plan separate per-round and total scoring, restart/quit rules, saves, outfits, weather, rewards and record/ghost versioning before implementation. Do not attach Cup scoring to ordinary stage leaderboards.


## Implementation checkpoint ? 2026-11-08
- Batch 1 built: fifth stage, 600 m race, endless continuation, wooden deck/river/skyline, two pointed stone tower portals, suspension cables, day/golden/mist looks, reactions and a map-specific set from the existing soundtrack.
- Batch 2 built: commuters, jogging pairs and photo tourists; benches, bins, camera tripods and maintenance barriers. Fitted circles leave a clear central route; furniture is excluded from both tower approaches and race-route openings.
- Batch 3 built: tapered tower passages use halfAt for player, crowd, bots and deck/railing geometry. Two route choices at 120/310 m stay clear of the towers; the course uses versioned race records from its first release. The shared route tests now include Brooklyn Bridge.
- Batch 4 built: stage-picker pagination uses the existing fitted-page helper, preserving card sizes. Previous/next and selecting Brooklyn Bridge from page two checked at 320 x 568. Desktop picker, 390 x 844 day tower approach, 320 x 568 mist portal, and golden-hour populated deck inspected. Browser frames include manually placed camera/run positions; they are not a physical-phone playtest.
- Test-first evidence: stage-registration tests failed before the map existed; furniture/portal tests failed before their implementation; route test failed before route data existed. All now pass. A full generated race reaches Manhattan.
- Compatibility regression caught during review: adding a stage reshuffled already-published daily/weekly courses. A failing test now protects the four-stage selections through 2026-11-08 / 2026-W45; the fifth stage enters those rotations at the next respective reset. Weekly Challenge's separately versioned supplied-course pool is unchanged.
- Validation: final full suite 444/444 passed; production build passed; diff whitespace check passed. Existing Central Park index checks now assert the first four indexes, while the new bridge test asserts the five-stage sequence.
- Render sample: 37 people/props, 390 x 844 viewport, 100 synchronous render calls on this desktop: median 0.8 ms, p95 4.2 ms. Concurrent tests were running; this is not an isolated device benchmark or full-frame latency measurement.
- Still manual: older-phone performance/heat, 4x CPU throttle, calm-mode motion, and real 2?8-phone races. Supabase challenge submission remains disabled pending live migration verification. NYC Cup remains design-only.
