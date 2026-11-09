# Roadmap

Rule from the original roadmap: one feature at a time, and cut anything that does not clear "is this fun?" The full history is in `archive/ROADMAP.md`, `archive/NEXT_STEPS.md` and `archive/ONLINE_PLAY_NEXT_STEPS.md`.

**Live:** https://stefanvargas100-hue.github.io/excuse-me/

## In the game today
- **Modes:** Classic, one-try Daily and Weekly, Race vs bots, Elimination, NYC Cup, Practice lessons, Weekly Challenge, and a tutorial.
- **Stages:** Airport, Fifth Avenue, Shibuya Crossing, Central Park, Brooklyn Bridge.
- **Online:** friend rooms for up to 8 phones with Ready and synced starts, shared pause, rematch and Elimination. Daily, Weekly, Classic and Challenge boards.
- **Progress:** XP and levels, challenges that unlock clothing, personal race bests, ghosts.

## Phase: Production, heading to Alpha
**Alpha gate (Director, 2026-11-08):** every major system exists, though it may be buggy and use placeholder art.
- **3 Cups:** New York, Tokyo and Airports, at 4 races each.
- **Online matchmaking,** including player-chosen names.

**Stages today:** New York 3 of 4 (subway platform next), Tokyo 1 of 4, Airports 1 of 4, so Alpha needs 7 new stages if each Cup uses 4 different ones.

## Now: Round 1
Competitive depth: goals, measurements and rivals. Ideas are in `rounds/round-01/proposal.md`.

## Next: Round 2
Race time boards, and a subway platform stage so NYC Cup can reach 4 races. The subway stage also proves the side-route system (`rounds/round-02/side-routes.md`).

## Before launch
- **Real-device checks:** older-phone frame rate and heat, calm mode in motion, 2-8 phone sessions, and saves surviving an update. The checklist is in `archive/RELEASE_CHECKPOINT.md`.
- **Tuning from real play:** bot speed, challenge targets, stats, slipstream and boosts. Most balance numbers began as guesses.
- **Save protection:** browser storage can be wiped. Move saves to phone storage in the app, or add a backup code first.
- **Phone app:** wrap the web build with Capacitor, and add native haptics, storage and audio handling. iOS needs a Mac (still unanswered).
- **Launch polish:** real icon and splash screen, bundled fonts, settings and accessibility, a privacy policy, and privacy-friendly analytics.
- **Store release:** beta testers, then Google Play and the App Store.

## Later
- **Online:** host transfer, synced power-ups, race history, public matchmaking, then a dedicated server if needs justify it (see `archive/INTERNET_MULTIPLAYER_PLAN.md`).
- **Content:** music festival, Black Friday mall and train station stages, with crowd behaviour per stage.
- **Business model:** still open. Any choice should be cosmetic-only or a paid app, with no ads during runs.
