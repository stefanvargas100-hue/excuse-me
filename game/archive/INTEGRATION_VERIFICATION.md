# Combined release candidate verification — 2026-11-07

Candidate branch: `stefanvargas100-hue/multiplayer-integration-check`.
Base: current fetched `origin/main`, `e5588e2ef022606899ae043d524e7cd13aced5f7`.

The Online-Play checkout was behind main's five scenery/offline-update commits. This separate checkout starts from current main and applies only the multiplayer interruption fixes, UI recovery fix, regression tests and reports. The application patch applied cleanly; no scenery files, leaderboard/ghost clients, Supabase SQL, package dependencies, or hosting workflow were replaced. No other active feature branch has commits ahead of main (apart from an historical backup branch).

## Results

- Full combined automated suite: **305 passed, 0 failed** (`npm.cmd test`). This includes scenery, offline cache, controls, solo modes, power-ups, leaderboard/ghost behavior, eight-player lobbies, interruptions, rematches, and actual-handler room-creation recovery in the simulated DOM.
- Production build: passed, 61 modules; main JavaScript about 209.46 kB / 81.09 kB gzip. Whitespace check passed.
- Two Chromium browser clients, distinct storage origins (`127.0.0.1` / `localhost`), using the actual existing Supabase Realtime relay: UI room creation, joining by code, New York stage selection, shared race seed, position exchange, forced guest WebSocket close and reconnection retaining the race, matching finish rows/times, and one rematch all passed.
- Host departure: remaining browser client finished with the host retained as DNF. Both clients clicked the enabled result-screen new-room action, reached the room chooser and created new rooms via the actual Make a room button.
- Browser smoke checks: Airport, New York and Shibuya each rendered in bot race and Classic mode at a 390 × 844 viewport; bot races had three bots and stage pickups. Screenshots were inspected. Customize opened and rendered its preview and race stats. No captured JavaScript errors or unhandled rejections were observed.
- Existing ghost read endpoints returned HTTP 200 for all three stages during the Classic smoke check. Supabase HTTP writes were blocked in the test clients, and observed HTTP traffic contained only GETs. No schema or account settings changed.

Browser limits: these were desktop Chromium checks with a phone-sized viewport, not physical-phone automation. The embedded browser throttled background-tab animation even though both documents reported visible. The network checks therefore advanced simulation through the existing test hooks, and finishes used the finish-line hook. Shared finish records converged, but these artificial times do not measure start fairness, phone latency or competitive timing. Mobile Safari, real touch feel, prolonged device suspension, and older-phone scenery performance still rely on user testing. The earlier real-phone feedback tested the multiplayer checkout, not this newly combined scenery build.

## Release assessment

Suitable for a controlled beta after a short two-phone check of this combined build. There are no database migrations, paid services or new server dependencies, and the existing leaderboard/ghost paths are preserved. This does not make the races server-authoritative: ephemeral rooms, mixed cached builds, host departure during long partitions and browser suspension remain documented limits. Live multiplayer still intentionally disables shared power-ups; power-ups are available in races against bots.

Pushing main runs `.github/workflows/deploy.yml`: install, tests, build and GitHub Pages deployment. Main has not been pushed or deployed by this verification. Before an authorized push, recheck origin/main; if it changed, integrate and retest rather than force-pushing. Keep `e5588e2` as the pre-release reference. Rollback should revert the candidate change in a new commit and redeploy, preserving the existing scenery and offline-update commits.

The combined build can be served through the existing temporary test link without publishing main. If accepted after the phone check, the prepared candidate can be fast-forwarded onto main only while its base still matches the current remote.
