# Batch 11c review fixes

Base: f1eb59e on stefanvargas100-hue/worlds-shortcuts. Read the external batch-11c brief and independent review from stefanvargas100-hue/shortcuts-review; no review branch or develop merge performed.

## Instruction strip contrast
The backed route strips now render in an isolated screen-space marker pass at the very end of render(), after the world's finish, weather, tints and banner. Text remains purple ink (#3a2a4d) on opaque cream (#fff4ec). Neon-pop world recipes, glow, actors and scenery are unchanged. Entrance, interior and rejoin text/visibility conditions and y=82 are preserved; banner timing and placement are unchanged.

Fresh after-{320,390}-6-{entry,interior,rejoin}.png files were opened and inspected individually at native pixel sizes. Each includes crowd, RUSH HOUR banner and HUD; route strip y=67..97 stays below pause and above banner y=162..198. Both 320x568 and 390x844 are browser emulation with default safe-area insets, not real-phone or hardware-notch evidence. The faint pre-fix strip is in ../batch-11-evidence/after-320-6-entry.png and after-390-6-interior.png. Reproduce new captures with node game/rounds/round-02/batch-11c-evidence/capture.mjs after; Supabase requests are aborted and route generation uses seed batch11c:screens.

## Cross-floor Cup pressure
cupPressure now accepts only humans on the bot's floor and records the pressure's floor and source (null for local human, peer ID for remote). It clears active pressure if the bot or source has changed floor or the source no longer exists. The corresponding pressure lane cost checks the same provenance immediately, because think() runs before cupPressure and would otherwise charge stale pressure for one think cycle. No other Cup, host transfer, start, scoring, course or protocol code changed.

Test-first: test/cup-pressure.test.js evaluates the actual private cupPressure and think functions with minimal simulation state, without adding production test exports. The initial valid red run had 10 assertion failures and 5 same-floor positive controls passing (red.txt). Four negative cases cover local/remote humans in both floor directions; six cases cover active pressure when bot, human or both change floor, including stale lane cost before refresh. The fixed run passes all 15 tests (green.txt). These are focused unit tests; the additional existing headless friend-Cup tests exercise room flow and host transfer, not physical phones or real networking.

Related command: node --test test/side-routes.test.js test/cup-pressure.test.js test/friendcup-room.test.js: 78 pass, zero fail. npm.cmd run test:fit: 70 checks, zero problems. A transient punctuation replacement caused a parser error during preparation; the renderer was restored from HEAD and only the marker-pass edits reapplied, with successful fresh captures and checks afterward.

## Scope and remaining work
Only src/render/side-routes.js, src/render/render.js marker ordering, src/sim/race.js cupPressure/pressure lane cost, focused tests and this evidence/report were changed. No constants, populations, course speeds, protocol, host transfer or unrelated Cup/start logic changed. Both S3 findings are addressed for independent re-review. Overall batch 11 remains partial: loaded competent-human balance, actual phones and integration approval remain unresolved; no new balance acceptance is claimed.

## Final checks
After all final production edits: npm.cmd test passed 730 tests, zero failures; npm.cmd run build passed. Focused/related tests passed 78, fit passed 70 checks with zero problems. Final git diff --check passed. Loaded route balance remains unresolved and was not retested or tuned in 11c.
