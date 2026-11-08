# Brooklyn Bridge plan — working choice

Chosen provisionally after release checks; switch to Times Square if Stefan prefers. No map implementation is included in this planning batch. NYC Cup is a separate feature after this course is verified.

## Batch 1 — Course foundation
- Append id `bridge` without changing the first four stage indexes.
- 600 m race along a broad wooden promenade through two Gothic stone towers; endless modes continue scenery beyond the race course.
- Manhattan skyline, river on both sides, suspension cables, stone tower portals. Separate renderer; deterministic scenery and distance-based detail limits.
- Day, golden hour, mist variants; respect calm mode. Stage card, music, reactions, mode integration.
- Test first: level registration, stable variants, endless continuation, race finish and render determinism.

## Batch 2 — Crowd and obstacles
- Commuters, tourists taking photos, joggers; keep right. Avoid implying a current real-world cycling lane on the promenade: use pedestrian-only gameplay.
- Benches, bins, camera tripods, temporary maintenance barriers with fitted hitboxes. Clear opening stretch and a measured passable route through each obstacle row.
- Reuse existing movement/collision rules. No surprise vehicle crossing at the towers.
- Test first: all prop kinds appear, bounds fit artwork, seeded layouts repeat, neither tower approach blocks the route.

## Batch 3 — Tower moments and race choices
- Shared geometry for narrowed tower portals across renderer, player, bots and crowd; taper approaches rather than snapping runners sideways.
- Two readable route moments away from tower pinch points: direct queue versus a wider clear side route. Extend shared route definitions and version the new course from its first release.
- Test first: passable openings, no rail bypass, bot navigation on several seeds, a complete generated race, elimination/friend-room compatibility.

## Batch 4 — Review and release
- Screenshots at 320 x 568, 390 x 844 and desktop: start, cables, tower approach/interior, finish for each variant.
- Check calm mode, crowd visibility behind cables, stage-card fit with five stages (add pagination if needed rather than shrinking labels), and phone performance.
- Full tests/build; commit and review note. Physical-phone and multiplayer checks remain explicit release checks.

## Following feature — NYC Cup
Fifth Avenue ? Central Park ? Brooklyn Bridge. Plan separate per-round and total scoring, restart/quit rules, saves, outfits, weather, rewards and record/ghost versioning before implementation. Do not attach Cup scoring to ordinary stage leaderboards.
