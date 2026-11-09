# Excuse Me: Roadmap from Web Game to Phone App

**Where we are:** a single-file HTML5 canvas game (~2,200 lines, one IIFE) with 3 levels, character customization, procedural music, stars/unlocks, a daily run and a tutorial. It runs in a mobile browser today.

**Goal (updated Nov 2026):** launch a fuller game, not a minimal one. The original goal of having it downloadable and installable is done (live PWA, tests, automatic deploys). The new goal is that the features players would expect, including more levels, modes, online play and leaderboards, are in the game at launch rather than added afterwards.

**Status:** Phases 0 (playtest in progress), 1 and 2 are done. Next is the launch-scope work below.

**Recommended route:** keep the web codebase and wrap it. Do not rewrite it. Each phase below ships something usable.

---

## Phase 0: Share it as-is (a day)

- Set the artifact to "Anyone with the link" (claude.ai on web or desktop).
- Send it to 5–10 friends. Watch them play on their own phones.
- Collect: what confused them, what device lagged, what they did on the first run.
- **Exit:** a list of top 10 issues and the device models that struggled.

## Phase 1: Make it a PWA (1–3 days)

Installable from the browser, full screen, works offline. No app store needed.

- [x] Split the single file into `index.html`, `style.css`, `game.js` (or ES modules).
- [x] Add `manifest.webmanifest` (name, icons 192/512, `display: fullscreen`, `orientation: portrait`, theme colour).
- [x] Add a service worker to cache everything for offline play.
- [ ] Host it free (GitHub Pages, Netlify or Cloudflare Pages) on a real URL.
- [x] Add "Add to Home Screen" instructions on the start screen.
- [x] Handle safe areas (`env(safe-area-inset-*)`), `viewport-fit=cover`, and block pull-to-refresh and pinch-zoom (`touch-action: none`, `overscroll-behavior: none`).
- **Exit:** friends install it from a link, and it launches full screen and works in airplane mode.

## Phase 2: Set up a proper project (2–4 days)

- [x] `git init`, push to GitHub.
- [x] Tooling: Vite (TypeScript skipped for now; revisit when the code grows).
- [x] Split the IIFE into modules (done in src/; layout differs slightly: config, input, sim, render, audio, save, ui):
  - `config/` (tuning constants, levels)
  - `input/` (zones, double taps, keyboard)
  - `sim/` (people, crowd, rivals, scoring)
  - `render/` (camera, world painters, figures, HUD)
  - `audio/` (music, SFX, ambience)
  - `save/` (stars, bests, look, settings)
- [x] Move the node `vm` test harness and bot into `npm test` (headless sim, NaN checks, lane-formation check, daily-seed determinism).
- [x] Add CI (GitHub Actions) that runs the tests on every push.
- **Exit:** `npm run dev`, `npm test` and `npm run build` all work.

## Phase 2.5: Gameplay sprint and Race mode (after the playtest and Phase 2)

Fix what the playtest shows first, then add one mechanic at a time and playtest each.

- [ ] **Race mode (A to B):** a bump slows you down instead of ending the run. First to the finish wins. Playable solo against a ghost or bots, so it can be tuned with no server.
- [ ] Tune the slowdown (length, how much, recovery) so a bump hurts but a comeback is possible.
- [ ] Decide how race results are scored (finish time), separate from classic score runs.
- **Exit:** a race against a ghost that friends call fun, and a bump that feels fair.

## Phase 3: Wrap as a native app with Capacitor (3–5 days)

Capacitor packages the web build inside a native iOS/Android shell.

- [ ] Install Node, Android Studio (Android) and Xcode (iOS, needs a Mac).
- [ ] `npm i @capacitor/core @capacitor/cli`, then `npx cap init` and `npx cap add ios android`.
- [ ] Replace web-only bits with native plugins:
  - **Haptics:** `navigator.vibrate` does not work on iOS. Use `@capacitor/haptics`.
  - **Storage:** `localStorage` can be cleared by the OS. Use `@capacitor/preferences` for stars, bests and look.
  - **Audio:** unlock WebAudio on first touch and resume after the app is backgrounded. Pause music and sim on `appStateChange`.
  - **Orientation / status bar / splash:** lock to portrait, hide the status bar, add a splash screen and icon.
  - **Keep awake:** keep the screen on while playing.
- [ ] Test on real devices (an emulator will not show the real frame rate).
- **Exit:** a debug build runs on your own phone.

## Phase 4: Performance and feel on real hardware (ongoing, 1 week to start)

- [ ] Target a steady 60 fps on a mid-range Android phone from the last 4 years. Measure first.
- [ ] Likely wins: cap the device pixel ratio at 2, cache gradients and far-figure sprites to offscreen canvases, cull people beyond fog distance, reuse objects to avoid garbage collection stutter.
- [ ] Add a quality setting (Low, Medium, High) that scales crowd count and draw detail. Auto-pick from the first seconds of frame time.
- [ ] Re-tune controls on real thumbs: hold zones, `DOUBLE_MS`, `PAIR_MS`, `BOTH_DOUBLE_MS`. Add a settings slider for double-tap speed.
- [ ] Re-tune difficulty and star targets using real run data (see Phase 6).
- [ ] Battery and heat check: a 10-minute session should not throttle.
- **Exit:** no visible stutter on a mid-range phone, and a 10-minute session stays smooth.

## Phase 5: Product polish (1–2 weeks)

- [ ] Real app icon, splash, store screenshots, short trailer (screen recording).
- [ ] Onboarding: the tutorial exists, so add a skip option and "replay tutorial" in settings.
- [ ] Settings screen: sound, music, haptics, camera bob, left-handed layout, quality, reset progress.
- [ ] Accessibility: colour-blind-safe rival and prop cues (shape plus colour), reduced-motion option, larger tap targets.
- [ ] Error handling: never crash on a missing save, a corrupt save, or audio failing to start.
- [ ] Pause automatically when the app is interrupted (call, notification, background).
- [ ] Privacy policy page (required by both stores, even if you collect nothing).
- **Exit:** a build you would hand to a stranger without explaining anything.

## Phase 6: Online features (after Race mode is fun)

Decisions made: anonymous accounts with generated names first (works on web and phone, one leaderboard for everyone); Game Center / Apple / Google sign-in added later when the store apps exist. Live races use a shared crowd (same seed for everyone). Lobbies: 1v1, and a 4–8 player race, joined by invite link first.

**6a. Leaderboards (1–2 weeks)**
- [ ] Backend: Firebase, Supabase or Cloudflare Workers + KV. Keep it small.
- [ ] Anonymous account per device with a generated name. Custom names later, with a profanity filter.
- [ ] Boards: daily run, weekly run (same seeded crowd for the whole week), and one per stage.
- [ ] Anti-cheat: submit the seed, an input recording and the score; the server re-checks. Never trust a raw score.
- [ ] Privacy-friendly analytics and crash reporting (Sentry or Firebase Crashlytics).

**6b. Live lobbies (2–4 weeks)**
- [ ] Invite-link lobbies: 1v1, then 4–8 players. Everyone runs the same seeded crowd; others appear as see-through runners. Finish order decides the winner.
- [ ] Ongoing server cost: watch the free tier.

**6c. Cut-offs between players (about 1 week, after 6b)**
- [ ] Rule: when two runners overlap, the one in front keeps going and the one behind slows (same logic as rivals). Each phone applies it to itself, no server referee.
- [ ] Known limit: network delay can make tight contacts feel unfair. Fine for friends; revisit before any ranked play.

**6d. Later**
- [ ] Public matchmaking, Game Center / Apple / Google sign-in, ranked play.

## Phase 7: Release (1–3 weeks, mostly waiting on review)

| Store | Cost | Notes |
|---|---|---|
| Google Play | $25 one-time | Closed testing first; new personal accounts may need a minimum tester period before production. Check current rules. |
| Apple App Store | $99/year | Needs a Mac for builds, TestFlight for beta, and review is stricter. A thin webview wrapper can be rejected, so make sure it has native haptics, offline play and real polish. |

- [ ] Beta first: TestFlight (iOS) and Play internal/closed testing (Android), 20+ testers.
- [ ] Store listing: name, subtitle, description, keywords, screenshots, age rating, privacy answers.
- [ ] Versioning: semantic version plus build number, with a changelog.
- [ ] Soft launch to friends and a small community before a public push.

## Phase 8: After launch

- New levels (ideas: subway platform, music festival, Black Friday mall, train station).
- More crowd events and rival types; seasonal looks and unlocks.
- Weekly challenges and replays/share clips of close calls.
- Monetization options (pick one, keep it fair):
  - Free with an optional one-time "support" purchase (cosmetics only).
  - A paid app with no ads.
  - Avoid ads in the middle of runs, since they break the flow this game depends on.

---

## Decisions to make early

| Question | Recommendation |
|---|---|
| Keep web tech or rewrite in Unity/Godot? | Keep web + Capacitor. The game is 2D canvas pseudo-3D and already works. Rewrite only if profiling shows you cannot reach 60 fps. |
| JavaScript or TypeScript? | TypeScript once you split into modules. It catches the exact kind of bugs we hit (undefined colours, NaN). |
| iOS and Android together? | Ship Android and PWA first if you have no Mac. Add iOS when you can build on one. |
| Sign-in for leaderboards? | Own anonymous accounts first; add Apple/Google sign-in with the store apps. |
| Free or paid? | Decide after Phase 0–1 feedback. |

## Known risks

- **iOS audio and haptics** behave differently from Android and desktop. Test early on a real iPhone.
- **Frame rate on older phones** from many projected figures. Mitigate with the quality tiers in Phase 4.
- **Store rejection** for "just a website". Mitigate with native plugins and offline play.
- **Save loss** if you stay on `localStorage`. Move to Preferences in Phase 3.
- **Leaderboard cheating** in Phase 6. Use input replays.

## Launch scope (what must be in the game before release)

Decided: launch with a fuller game. Candidates, to be confirmed after playtest feedback:
- [ ] Race mode (A to B, bumps slow you down), Phase 2.5
- [ ] Online: daily, weekly and per-stage leaderboards; live 1v1 and 4–8 player races (Phase 6a–6c)
- [ ] More stages (Phase 8 ideas: subway platform, music festival, Black Friday mall, train station)
- [ ] More crowd events and rival types; unlockable looks
- [ ] Settings screen, accessibility, polish (Phase 5)
- [x] Race stats from build and gear, slipstream
- [x] Challenges as the only way to unlock, with a first clothing catalogue (Y2K, 80s, modern, formal)
- [ ] Tune challenge targets from real play
- [x] More random crowd events in endless runs, difficulty stays at its hardest
- [x] Skill pack, fast strips, contested drafting, ghost, replay, share, no-scroll menus
- [ ] Tune all of this from real phone play
- [ ] Anything the playtest shows is missing

Rule: one feature at a time, each playtested before the next. Cut anything that does not clear a "is this fun?" bar rather than shipping it.

## Suggested order of work

1. Finish the Phase 0 playtest and collect feedback (in progress).
2. Phase 2.5: gameplay sprint, starting with Race mode, then more stages and events.
3. Phase 6a–6c: leaderboards, then live lobbies and player cut-offs, built on Race mode.
4. Phase 3 and Phase 4 together (phone app and real-device performance), re-checked after each big feature.
5. Phase 5 polish, then beta and release (Phase 7). Phase 8 becomes post-launch updates only.

## Rough timeline (solo, part-time)

| Milestone | Target (to be re-estimated for the larger launch scope) |
|---|---|
| Friends playtest | Week 1 |
| PWA live | Week 1–2 |
| Modular project plus tests | Week 2–3 |
| Native debug build on your phone | Week 4 |
| Polished beta | Week 6–8 |
| Store release | Week 8–12 |
