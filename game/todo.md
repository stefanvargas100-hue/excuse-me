# To-do

## Current follow-ups - 2026-11-10
- Gameplay owner lead, S3, not scheduled (new 2026-11-15, from batch 27f): bump-and-kerb jam on every stage. A walker against the kerb takes a bot's repeated bumps (`shove` in `src/sim/race.js`, +1.6 m/s each), its sideways speed into the kerb builds (3.67 m/s seen), and the bot behind is pinned until the stuck rule lets it slip through. Seen on Tsukiji seed 4, t 104.2 s, z 352.5: `node game/rounds/round-02/batch-27-evidence/bot-sweep.js tsukiji`. A fix touches bot or crowd movement on all 12 stages, so it needs its own batch and re-taken hashes.
- Visual owner lead, S4 (new 2026-11-15, batch 27): the Tsukiji wet patch reads as a teal mat, not wet concrete (`wetpatch` in `src/render/figures.js`). Two one-tick sideways nudges (0.3 to 0.5 m) of people at the kerb just ahead of a kerb-lane cart: seed 19, t 24.8 s, z 74.6; seed 13, t 108.2 s, z 338.0. Tsukiji gold target 92 is tight against a Hard bot median of 93-94.
- Online owner, not scheduled (new 2026-11-14): friend rooms never run stage events (`!S.duel` in `src/sim/game.js`), so delivery trucks, bag spills, tour groups, viewpoints and batch 27's Skytree lift and Gate Change boards appear only in solo runs and bot races. Director accepted this for now. Running events in rooms needs a one-page spec, a second review and a `PROTO` bump.
- Lead/visual owner, S3 (new 2026-11-12): at 320x568 with 8 players the host Friend Cup status (#friendStatus) overflows by 39.67px and the lobby card by 70px (baseline 21px), after batches 18-19 lengthened status/preset text. Start stays reachable. Seen in lead fit run after merging batch 19. Batch 19c S4 notes (unused CUP_RACES imports, cupFromMessage not pinned to agreed preset pre-race) are logged in reports/batch-19c-review.md.
- Lead/visual owner, S3: narrow customization item captions overlap card borders in batch-17d 320px extrema screenshots. Builder identifies existing cramped labels; independent 17f review must distinguish inherited/new. Include actual-size label readability in the queued visual pass.
- Lead/visual owner, S3: review the 31 shared fit failures in batch-10c-evidence/fit-comparison.json (play/boards/stages/challenge). Independent 10d audit found zero introduced by host/Cup work; these existing issues remain open for the queued visual pass.
- Lead/shared UI owner, S3: fix the leaderboard heading clipping at 320px. Independent batch-14c review reproduced it on baseline dd3fddb; evidence is in batch-14c-evidence/. Include in the queued visual review; no new regression in seeded movement.
- Lead: complete tutorial movement parity and separately scope race-only stage features; Daily/Weekly publication does not close these. Keep interrupted host/Cup-points batch 10 and remaining playtest feedback visible in status.
- Director phone playtest: compare build feel and boost/pickup readability across Classic, Daily and Weekly after the latest build is verified; check crowded main-versus-shortcut timing. Main still requires explicit approval.

The older handover list below is historical; use game/status.md for completed work.

**Written:** 2026-11-09, at a lead handover. Start from `game/status.md` for the current state.

## Stefan (Director)
1. **Playtest on your phone:** https://stefanvargas100-hue.github.io/excuse-me/playtest/
   - Does the red build tag show, and is all gear, every title and every picture unlocked?
   - Do splits sit too low or overlap the stamina bars?
   - Do the medal times feel fair on each stage?
   - On a short screen, do race results look right without the podium?
   - NYC Cup with 8 racers: does it stay smooth, and does the start look right?
   - Once the slipstream fix lands: do bots still line up, does a 6 second cooldown feel right, and are the new medal times fair?
2. **Later, with a second phone:** Friend Cup on the playtest link, once it is built.
3. **Decide the 5 matchmaking questions** in `game/rounds/round-02/matchmaking-spec.md`.
4. **Try Subway Platform and the clothing fixes** on the playtest link. Check whether a hip still looks wrong on female bodies in trousers.
5. **Approve the next merge to `main`** after those checks. It also brings the deploy queue fix.

## Lead (Claude)
1. After the Director tries Subway: allow stage 5 in Friend Cups, and add Subway to NYC Cup (`CUP_STAGES`, `CUP_RULES` 3, 4 races) after the Director tries it.
2. **Merge** Friend Cup online after the Codex review (set `PROTO` to 5), and **review** and the slipstream-lines result (bot-line table, medal times old and new).
3. **QA worker trial:** an independent worker tests the Cups on the playtest link and files bugs by severity without fixing them.
4. **End of Round 1:** write the round report.
5. **After that:** passing the host role, then Round 2 (race time boards, the Subway stage and the side-route system), then the other new stages and matchmaking.
