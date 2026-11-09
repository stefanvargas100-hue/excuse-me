# Model handoff: Excuse Me visuals and NYC maps

Prepared 2026-11-08. Read this before continuing. This file transfers context; it does not launch another agent.

## User intent and working style
- Stefan asked to continue Claude's visuals work, then to plan Central Park in batches before building it.
- He subsequently authorized committing and pushing to main, further release checks, and continuing the next map.
- The latest completed task is Brooklyn Bridge. Next candidate feature is NYC Cup; it has not been implemented or specified beyond the outline below.
- Work autonomously within the authorized task. Make a written batch plan before substantial new gameplay work. Do not treat a request to continue as a request for another acknowledgement or permission loop.
- Be explicit about whether work is in progress, finished, committed, pushed, or deployed. Stefan has repeatedly asked whether the agent is still working after it stopped.
- Do not spawn other agents unless Stefan explicitly requests it or an applicable skill requires delegation.

## Workspace and release state
- Repo: https://github.com/stefanvargas100-hue/excuse-me
- Live: https://stefanvargas100-hue.github.io/excuse-me/
- Current workspace: C:/Users/stefa/orca/workspaces/Excuse-Me/Visuals
- Branch: stefanvargas100-hue/Visuals
- Main checkout: C:/Development/Excuse-Me (main is already checked out there).
- Latest code commit: c92254e193bcc0603a40899f1b0bcd7572abaa88, Build Brooklyn Bridge course with tower passages and paged stage picker.
- That commit was pushed to origin/main. GitHub Tests AND Deploy to GitHub Pages are confirmed successful as of this handoff.
- Workspace was clean before creating this file. Recheck status and fetch: other model/worktree sessions have pushed gameplay and music changes during this work.
- Never overwrite another checkout's work or force-push. Integrate origin/main, validate the combined result, then fast-forward main when appropriate.

## What is built
1. Earlier character/crowd/weather/HUD/effect batches from Claude, preserved and integrated.
2. Landmarks: Fifth Avenue cathedral, Shibuya walking signals and Hachiko statue, airport taxiing jet. Fixed unreachable cathedral anchors and storefront overlap. The finish statue only appears in finite races; classic/daily/weekly are endless.
3. Central Park, index 3 / id park: 540 m race to Bethesda Terrace, elm promenade, park crowd/furniture, fitted pretzel cart/easel, lake bridge with shared containment, carriage crossing, day/autumn/golden variants and autumn footstep leaves.
4. Brooklyn Bridge, index 4 / id bridge: 600 m race to Manhattan, deck/river/skyline/cables, towers at 190 and 410 m, photo tourists/jogging pairs, tripod and furniture, tapered portal containment, day/golden/mist variants, two route choices at 120 and 310 m. Uses a set from the existing soundtrack.
5. Stage picker now paginates with the existing pageInto helper. At short heights it hides blurbs while preserving readable city/name/distance. Page two and starting Brooklyn Bridge were checked at 320 x 568.
6. Newer gameplay and soundtrack work from other branches is already integrated: practice, clean-race rewards, bot Excuse Me, route choices, elimination (bots/friend rooms), weekly fixed-outfit challenge, protocol compatibility guard, adaptive music. Do not recreate these.

## Important invariants
- Existing indexes stay stable: airport 0, nyc 1, shibuya 2, park 3, bridge 4.
- Classic, Daily and Weekly score runs are endless. Race finishes at the level goal.
- Rendering must not mutate simulation state or consume the seeded random stream. Respect calm mode.
- Fitted obstacle collision geometry and clear gaps matter; avoid making near passes count as hits.
- halfAt in src/config/levels.js is shared by movement and the new scenery for narrowed bridge/tower sections. Player/bots/crowd must agree on boundaries.
- Routes use src/config/routes.js and versioned race records/ghosts. Do not compare incompatible courses under an existing record key.
- Adding Brooklyn Bridge initially reshuffled current daily/weekly selections. The regression fix in src/sim/game.js keeps the four-stage pool through 2026-11-08 / 2026-W45; the five-stage pool begins with the next day/week. test/rotation-stage.test.js protects this. Do not remove that compatibility guard casually.
- Weekly Challenge has a separate rules-versioned stage pool (airport/Shibuya). The fifth stage did not change that pool.
- Preserve saved outfits, unlocks, records and run-policy exclusions for practice/challenges/friend rooms.

## Validation evidence
- Final local full suite: 444/444 passed after the rotation compatibility fix.
- Production build and git diff --check passed.
- CI tests and Pages deployment succeeded for c92254e.
- New map tests failed first (missing stage, furniture, portal containment, route data), then passed. A complete generated Brooklyn Bridge race reached Manhattan. Shared route tests include Brooklyn Bridge and exercise bot navigation.
- Visual checks: desktop picker; 320 x 568 pagination/selection and mist tower interior; 390 x 844 populated day approach and golden-hour deck. Camera/run positions were manually set for some screenshots.
- Desktop sample: 37 people/props, 100 synchronous render calls at 390 x 844, median 0.8 ms, p95 4.2 ms while tests were running. This is NOT isolated performance, full-frame timing, or a real-phone benchmark.
- Real older-phone performance/heat, 4x CPU throttle, calm mode in motion, real 2-8-phone tests, and save preservation across service-worker updates remain manual checks. Do not report them as completed.

## Supabase leaderboard status
- CHALLENGE_SUBMIT_ENABLED is false in src/config/challenge.js. Keep it false until the migration is actually verified.
- supabase/migrations/0002_weekly_challenge.sql and rollback exist. No connected Supabase admin tool or local PostgreSQL/Docker/Supabase CLI was available; the SQL was reviewed, not run.
- RELEASE_CHECKPOINT.md contains concrete insert/improve/slower-score, ownership, invalid-time/week, UTC rollover/grace-period, existing-policy and rollback checks.
- Do not enable submissions just because client tests pass. Live database access and actual validation are required. The board remains a friendly client-reported-time board, not proof of legitimate play.

## Next work: NYC Cup
- Three NYC stages now exist: Fifth Avenue, Central Park, Brooklyn Bridge.
- Before code, write a concrete plan with batches and acceptance tests: entry/menu, round transitions, per-round versus total scoring, ties/placement, restart/quit/retry policy, outfit persistence, weather per round, rewards, saves, records/ghost versioning and results.
- Keep Cup results separate from ordinary single-stage boards. Avoid accidentally paying rewards twice or recording partial/abandoned cups as completed runs.
- Start with a coherent local single-player cup. Online cup synchronization is a separate scope; do not silently extend the friend-room protocol.
- Existing map release checks can be addressed before Cup implementation if a real issue is found. A dedicated physical-device playtest still needs Stefan and devices.

## Files to read
- BROOKLYN_BRIDGE_PLAN.md: four batches and implementation checkpoint.
- CENTRAL_PARK_PLAN.md and VISUALS_PLAN.md: previous map/visual work and limits.
- RELEASE_CHECKPOINT.md: release, physical-phone, multiplayer and database checklist.
- GAMEPLAY_BATCH_PLAN.md: newer gameplay batch outcomes and remaining B7 checks.
- GAMEPLAY_HANDOFF.md: historical gameplay handoff; parts of its queue are stale because B3-B7 were subsequently implemented. Prefer current code and batch checkpoints.
- src/render/bridge.js, src/render/park.js, src/config/levels.js, src/config/routes.js.
- test/bridge.test.js, test/rotation-stage.test.js, test/park.test.js, test/routes.test.js.

## Commands and tools
PowerShell; use npm.cmd, since npm.ps1 is blocked by the machine's execution policy.

    git status --short
    git fetch origin
    npm.cmd test
    npm.cmd run build
    node --test test/bridge.test.js test/rotation-stage.test.js
    git diff --check
    npm.cmd run dev -- --host 127.0.0.1

Full tests can take 2-4 minutes; keep Stefan updated rather than silently waiting. Run focused checks for new failures; avoid unnecessary duplicate full suites.

Read and follow the test-first skill for meaningful behaviour changes. Skip implementation-mirroring tests for pure styling.

Use the orca-cli skill for Orca's embedded browser. Resolve ORCA_CLI_COMMAND and load its version-matched guide, then browser reference. Discover current ports/tabs; do not assume old IDs or a running server survive a restart. Read screenshots with view_image. Hot reload/navigation can reset viewport and stale refs. In PowerShell quote refs such as '@e12'; unquoted @ can be parsed incorrectly. Prefer structured tool arguments or files for strings; native argument quoting has stripped embedded JS quotes in this session.

The python command on this machine resolved to a Windows Store alias and did not execute the edit scripts. Use Node or PowerShell for repository edits unless a real interpreter is located.

## Suggested opening instruction for the receiving model
Read MODEL_HANDOFF.md and the current plans. Check Git/remote state and deployment, preserve all existing work, then plan the NYC Cup in testable batches before implementing it. Continue autonomously, keep progress updates clear, and distinguish automated/browser checks from real-device validation.
