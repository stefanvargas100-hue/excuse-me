# Central Park implementation plan

Build in batches, each with tests written before new behaviour, screenshots, build verification, and a review note.

Scope: fourth stage, id `park`, appended to preserve existing stage indexes. The Mall / Literary Walk leads to Bethesda Terrace in races. Classic/daily/weekly remain endless. Existing three stages keep their rules. This map deliberately adds simulation content; the render-only rule for earlier visuals batches does not apply to park generation or collisions. NYC Cup is out of scope.

## 7A � Playable stage and landscape
- Append a 540 m park stage, 6 m half-width, keep right, its own music, labels and level card.
- Add a separate park renderer: paved promenade, lawns, arching elm canopy, distant skyline, Bethesda Terrace race finish.
- Add day, autumn, golden-hour variants with stable seed selection and reduced-motion support.
- Check: selectable fourth stage, both gameplay modes render, weather variants render without mutating simulation, old stage indexes stable.

## 7B � Park traffic and furniture
- Dedicated crowd mix with dog walkers and jogging pairs; keep existing movement rules.
- Benches, lamps, bins, pretzel cart, bike rack, artist easel. Reuse existing fitted shapes where appropriate; add artwork for the park-specific kinds.
- Keep opening 24 m clear of furniture and leave at least 1.5 m usable clearance on each obstacle row.
- Check: every kind appears, hitboxes fit artwork, seeded layouts repeat, classic runs continue beyond 540 m.

## 7C � Lake bridge and carriage
- Stone bridge over water at 240�276 m; railings narrow the usable route consistently for player, bots and crowd.
- Horse carriage crossing uses the existing crossing-vehicle lifecycle, with its own artwork and fitted footprint.
- Check: no rail bypass, no trap at entrances/exits, carriage clears route and leaves the simulation, race remains finishable.

## 7D � Integration and review
- Review event positions, reaction text, music, daily/weekly selection, bots, finish screen, and any three-stage assumptions.
- Screenshot start, bridge, terrace in every variant at desktop and 390 x 844; test calm mode.
- Measure frame time with 4x CPU throttle if the browser supports it; report limitations honestly.
- Run full suite and production build, then commit with remaining manual review clearly recorded.

## Prerequisite � finish Batch 6 review
- Replace Shibuya GO text with a drawn walking figure.
- Recheck landmarks in race mode: endless modes intentionally have no finish statue.
- Dismiss tutorial before screenshots; measure render timing without advancing simulation.

## Progress
- Plan written before implementation; built in the 7A → 7B → 7C → 7D order above.
- 7A built: fourth stage, landscape renderer, terrace finish, music, variants. Initial stage tests failed before implementation and passed afterward.
- 7B built: fitted park furniture, pretzel cart, artist easel, jogging pairs and dog walkers. Missing-furniture test failed before implementation and now passes.
- 7C built: lake bridge with tapered approaches and shared movement boundaries, carriage event/artwork/exit lifecycle. Bridge and missing-carriage tests failed before implementation and now pass. Race fixtures were corrected to wait for the countdown and use the actual `finished` property.
- 7D checked: original stage indexes retained; menus and friend-stage selection derive from LEVELS; reactions added; daily/weekly selection includes park; classic remains endless. A full 540 m race through generated crowds completed in the automated test.
- Verification: full suite 343/343 passed before the last two added park checks; final park suite 9/9 passed, final scenery/landmark/park checks 24/24 passed before the last full-race check; production build and diff whitespace check passed.
- Visual review: desktop promenade, 390 x 844 autumn bridge, golden-hour populated promenade, day terrace, and all four race-stage cards inspected. Shibuya finish statue and Fifth Avenue cathedral rechecked in race mode without tutorial obstruction. Shibuya now has a polygon walking signal rather than GO text.
- Render measurement: 66 people/props, phone viewport, 100 render calls: median 1.2 ms, p95 1.8 ms on this desktop. This measures synchronous rendering only, not full-frame latency or real-phone performance. 4x CPU throttling is unavailable through the current Orca browser interface and remains a manual check.
- Remaining manual checks: older Android performance, calm mode in motion, and the airport jet's framing during an ordinary run. No deployment or NYC Cup work performed.
