# Excuse Me: Roadmap from Web Game to Phone App

**Where we are:** a single-file HTML5 canvas game (~2,200 lines, one IIFE) with 3 levels, character customization, procedural music, stars/unlocks, a daily run and a tutorial. It runs in a mobile browser today.

**Goal:** an installable, polished app on iOS and Android, with an optional path to the App Store and Google Play.

**Recommended route:** keep the web codebase and wrap it. Do not rewrite it. Each phase below ships something usable.

---

## Phase 0: Share it as-is (a day)

- Set the artifact to "Anyone with the link" (claude.ai on web or desktop).
- Send it to 5–10 friends. Watch them play on their own phones.
- Collect: what confused them, what device lagged, what they did on the first run.
- **Exit:** a list of top 10 issues and the device models that struggled.

## Phase 1: Make it a PWA (1–3 days)

Installable from the browser, full screen, works offline. No app store needed.

- [ ] Split the single file into `index.html`, `style.css`, `game.js` (or ES modules).
- [ ] Add `manifest.webmanifest` (name, icons 192/512, `display: fullscreen`, `orientation: portrait`, theme colour).
- [ ] Add a service worker to cache everything for offline play.
- [ ] Host it free (GitHub Pages, Netlify or Cloudflare Pages) on a real URL.
- [ ] Add "Add to Home Screen" instructions on the start screen.
- [ ] Handle safe areas (`env(safe-area-inset-*)`), `viewport-fit=cover`, and block pull-to-refresh and pinch-zoom (`touch-action: none`, `overscroll-behavior: none`).
- **Exit:** friends install it from a link, and it launches full screen and works in airplane mode.

## Phase 2: Set up a proper project (2–4 days)

- [ ] `git init`, push to GitHub.
- [ ] Tooling: Vite + TypeScript (optional but worth it as the code grows).
- [ ] Split the IIFE into modules:
  - `config/` (tuning constants, levels)
  - `input/` (zones, double taps, keyboard)
  - `sim/` (people, crowd, rivals, scoring)
  - `render/` (camera, world painters, figures, HUD)
  - `audio/` (music, SFX, ambience)
  - `save/` (stars, bests, look, settings)
- [ ] Move the node `vm` test harness and bot into `npm test` (headless sim, NaN checks, lane-formation check, daily-seed determinism).
- [ ] Add CI (GitHub Actions) that runs the tests on every push.
- **Exit:** `npm run dev`, `npm test` and `npm run build` all work.

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

## Phase 6: Online features (optional, 1–3 weeks)

Only after the core is fun. The daily run already uses a seeded crowd, so it is ready for a shared leaderboard.

- [ ] Backend: Firebase, Supabase or Cloudflare Workers + KV. Keep it small.
- [ ] Anonymous sign-in (device ID) first. Add Apple/Google sign-in later if needed.
- [ ] Daily leaderboard (same seed, so scores are comparable) and friends-only boards.
- [ ] Basic anti-cheat: submit the seed, a replay of inputs and the score. The server re-simulates, or at least sanity-checks the score against the replay. Do not trust a raw score.
- [ ] Privacy-friendly analytics: levels started, finished, where runs end, tutorial drop-off. This feeds balancing.
- [ ] Crash reporting (Sentry or Firebase Crashlytics).

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
| Free or paid? | Decide after Phase 0–1 feedback. |

## Known risks

- **iOS audio and haptics** behave differently from Android and desktop. Test early on a real iPhone.
- **Frame rate on older phones** from many projected figures. Mitigate with the quality tiers in Phase 4.
- **Store rejection** for "just a website". Mitigate with native plugins and offline play.
- **Save loss** if you stay on `localStorage`. Move to Preferences in Phase 3.
- **Leaderboard cheating** in Phase 6. Use input replays.

## Suggested order of work

1. Phase 0, then Phase 1 (PWA) for fast real-world feedback.
2. Phase 2 (project structure) before the code grows further.
3. Phase 3 and Phase 4 together, since you need real-device testing for both.
4. Phase 5, then beta (Phase 7), then Phase 6 only if players want it.

## Rough timeline (solo, part-time)

| Milestone | Target |
|---|---|
| Friends playtest | Week 1 |
| PWA live | Week 1–2 |
| Modular project plus tests | Week 2–3 |
| Native debug build on your phone | Week 4 |
| Polished beta | Week 6–8 |
| Store release | Week 8–12 |
