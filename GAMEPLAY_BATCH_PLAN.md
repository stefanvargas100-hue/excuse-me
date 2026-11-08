# Gameplay expansion: batch plan

Created 2026-11-07. Planning only; none of the mechanics below has been implemented by this plan.
Baseline: Gameplay/main release `75f3cd4`, with 324 passing tests, shared room pause, glass-separated collisions, x16 combos and concrete customization stats.

This is the current plan for the six gameplay ideas Stefan selected. ROADMAP.md and older sections of NEXT_STEPS.md contain historical or already-completed items; do not treat their checkboxes as the current feature inventory.

## Outcome

Make clean driving, crowd management, learning, route selection and different race formats matter. Deliver six mechanics in small batches, preserving Classic, private races, saves, existing unlocks and the current control scheme.

## Batch queue

| Batch | Deliverable | Depends on | Initial scope | Status |
|---|---|---|---|---|
| B0 | Mode boundaries and reproducible run setup | Existing release | Small supporting changes only | Validated (headless) |
| B1 | Clean-race rewards | B0 | Bot races; private-race summary | Validated (headless + browser) |
| B2 | Bots use Excuse me | B0, B1 validation | Bot races | Validated (headless + browser) |
| B3 | Replayable practice course | B0, B1, B2 | Four short local lessons | Validated (headless + browser) |
| B4 | Stage-specific route choices | B0-B3 | Airport pilot, then NYC and Tokyo | Validated (headless + browser) |
| B5 | Elimination races | B0, B3, B4 | Bots first; friend rooms second | B5a, B5b Validated (headless; no live two-phone test) |
| B6 | Weekly challenge race with a supplied outfit | B0, B3-B5 | Solo timed race and dedicated board | Validated offline; online board switched off pending the DB migration |
| B7 | Combined balance, compatibility and release check | B1-B6 | All supported modes | Complete: automated checks and user-reported release testing |

Order: B0 -> B1 -> B2 -> B3 -> B4 -> B5 -> B6 -> B7.
The dependencies intentionally favour one stable batch at a time. There is no need to implement all six before reviewing the first one.

## Review adjustments (2026-11-07, before building)

Gaps found when reading the code, now part of the plan:
- **Run options are the single gate.** Every run carries `S.run = { category, rules, seed, outfit, policy }` (src/sim/runopts.js). Categories: `standard` (all current modes), `practice`, `challenge`. New modes start with `start(mode, undefined, { run: {...} })`; daily, weekly and friend races always force `standard`. Policy flags: xp, progress (challenge tallies, rotating goals, unlocks), records (personal bests), scores (online boards), ghosts. Unknown categories get the strictest policy.
- **Challenge tallies are global**, not per run (`track`/`trackMax` are called from scoring, actions and race code), so progress is switched off at the source (`setCounting`) rather than at each call site. New code that awards progress must go through `track`, or check `S.run.policy`.
- **Record keys:** standard rules-1 keeps its legacy keys; anything else uses `recordKey(base, run)` = `base:category:rN`. B2 does not need a rules bump (race records are win times against the player's own skill); B4 route geometry and any B5/B6 rules do.
- **B1:** a bump is exactly a fresh `raceCollide` contact (`S.bumps++`), so glass-separated and live-racer contact are already excluded. Count distance walked (`speed * dt` while the race clock is running), not belt-carried distance, so the airport walkway cannot hand out segments.
- **B2:** bot randomness already uses a seeded `S.race.rng` for decisions, but `makeBot` picks loadouts with `Math.random`. Keep new bot decisions on `S.race.rng`; do not add more `Math.random`.
- **B3:** practice runs use `category: 'practice'` with a supplied `outfit`, a fixed `seed` per lesson and no bots, so lessons are repeatable and cannot pay anything.
- **B5/B6:** both need a list of outstanding online-protocol/server changes written down at the start of the batch (message types, schema, migration), before any client code.
- **Browser checks** are mandatory for batches with visible UI (B1 onwards). B0 has none; it is covered by the headless harness only.

## How to work through a batch

Use the following states: Planned -> Active -> Implemented -> Validated -> Ready for review -> Shipped.
Only one batch is Active at a time. A failed check stays attached to that batch until fixed; record the reason instead of calling the batch complete.

For each batch:

1. Refresh the baseline: inspect Git status and current main, read the previous batch notes, preserve unrelated work, and integrate any overlapping upstream changes before testing the combined result.
2. Define a small playable outcome and its acceptance checks. Put tunable values in named configuration, with the initial values recorded below.
3. Follow the test-first skill for simulation, scoring, persistence and network changes. Reproduce the missing behaviour before implementing it. Do not add tests that merely repeat presentation wording.
4. Implement the smallest complete version. Keep refactors limited to what the feature needs. Make the initial release scope independently usable.
5. Run the relevant focused tests, then the full suite and production build. Inspect the diff and test failures; do not weaken assertions to obtain a pass.
6. Check the feature in a running game through Orca's browser. Include a phone-sized layout; multiplayer batches need two clients. Record actual checks and limitations, distinguishing simulated clients from physical phones.
7. Update this file and DECISIONS.md. Leave a short checkpoint: behaviour, tests, visual evidence, initial tuning, known issues and next step. Keep the work on Gameplay for review unless a different branch is requested.
8. Publish only within the user's authorized release scope. A feature is Shipped only after its commit is on remote main, CI and Pages succeed, and the deployed build is checked after its offline-cache update. Keep the release commit as the rollback reference; use a revert for rollback, never a destructive reset.

An instruction to implement a batch authorizes working through its checks without repeated routine confirmations. An instruction to implement several batches authorizes continuing through that specified queue. This planning request alone does not start implementation or authorize publication.

### Checkpoint template

- Batch / state / commit:
- Playable behaviour:
- Regression reproduced before implementation:
- Focused tests / full-suite result / build:
- Browser scenarios and viewport:
- Physical-phone checks performed or still outstanding:
- Tuning and known limitations:
- Published version, if authorized and deployed:
- Next batch and prerequisites:

## B0 - Mode boundaries and reproducible setup

Goal: prevent practice, new routes and weekly races from accidentally changing ordinary progress or competing against incompatible records.

Work:
- Inventory existing mode, seed, build, ghost and leaderboard paths. Extend the existing setup only where needed; do not build a general-purpose game framework.
- Define run options for rules version, layout seed, chosen/supplied outfit, progress eligibility and record category. Existing modes keep their defaults.
- Make it explicit which new modes award XP/unlocks, save personal records, submit scores and record ghosts.
- Plan record compatibility: changed routes or competitive rules must not silently compare against earlier times or ghosts. Preserve old records; use a distinct rules/category key for new records.
- Establish a small set of deterministic test scenarios: clear track, dense crowd, glass boundary and repeatable finish. Reuse the existing harness and interruption tests.

Acceptance:
- Ordinary Classic and race controls, rewards, saves and boards behave as before.
- A practice-configured run cannot submit scores or farm progress.
- A supplied outfit affects that run without replacing the player's saved outfit.
- Replaying the same configuration reproduces the same layout; gameplay never depends on drawing or frame rate.

Likely touchpoints: sim/game.js, sim/state.js, sim/replay.js, config/stats.js, save/level.js and online/boards.js. Extract shared code only when the first consumer needs it.

## B1 - Clean-race rewards

Goal: reward controlled racing as combos increase speed.

Initial design:
- Every 100 continuous metres without an NPC/obstacle bump earns a clean segment and advances its reward tier.
- A bump resets distance towards the next clean segment and its tier. It does not erase already-earned segments.
- A suggested bot-race XP schedule is +2, +4, +6, +8, then +10 per further segment, capped at +50 bonus XP per finished race. Treat these as initial tuning values, not a permanent economy decision.
- Award the banked bonus once on finishing. Quitting/restarting does not pay the bonus.
- Private races show clean segments and a clean-race medal in the results; preserve their current XP/unlock exclusions.
- No added speed boost or time deduction. Finish order stays based on who actually finishes first.
- Glass-protected near contacts and the existing penalty-free contact between live racers do not count as bumps.

Acceptance:
- Exact distance thresholds pay once, including a threshold crossed at high speed in one tick.
- Countdown, pause, respawn/restart and stationary time cannot generate segments.
- A bump resets the correct counters; finishing/reopening results cannot pay twice.
- The results explain the bonus and private-race medal. During play, use a small milestone notification rather than another permanent HUD bar.

Playtest: does the reward encourage clean lines without making safe driving mandatory? Compare reward totals on Easy and Hard before adjusting the XP cap.

## B2 - Bots use Excuse me

Goal: make bots participate in crowd management under recognizable player rules.

Initial design:
- Reuse the player's crowd eligibility, range, maximum people affected, cooldown and resistance rules with an actor position/direction parameter.
- Do not give bots a larger range, shorter cooldown, immunity or automatic perfect timing.
- Show an audible/visible Excuse me cue. Opening a gap can help any racer who follows it.
- Normal and Hard bots choose useful moments more reliably; Easy bots use the ability sparingly. Put decision timing in difficulty configuration.
- Respect the glass when deciding who is reachable. Keep effects deterministic for a fixed seed and input sequence.
- Scope the first version to local bot races. Private races continue to send each human's own actions; this batch does not add bots to friend rooms.

Acceptance:
- A bot clears only eligible people in front of itself, including rejection of NPCs behind glass or otherwise out of reach.
- Resistant people and cooldowns behave like the player's equivalents.
- Multiple bots cannot move the same crowd member an unlimited distance by stacking calls in one step.
- The player benefits from an opened gap without losing normal collisions or control.
- Fixed-seed tests remain deterministic; crowd flow still presents meaningful obstacles.

Playtest: cue readability, call frequency, whether Hard feels skilled rather than unfair, and whether groups of bots clear too much of the track.

## B3 - Replayable practice course

Goal: teach the skills that ordinary racing currently expects players to discover.

Initial scope: four short lessons, each with a fixed outfit and repeatable setup:
1. A close pass: learn the Close/Razor spacing and stamina reward.
2. A perfect dash: identify the timing window and try again immediately.
3. Thread the Needle: alternate close passes through a readable gap.
4. Slipstream and burst: follow, charge, overtake, and observe stamina use.

Work:
- Add Practice to Play, with a lesson picker, retry and exit.
- Explain one action at a time, then report what the game detected and why an attempt failed.
- A missed attempt resets only the lesson. Do not make the player replay a full race or tutorial.
- Preserve existing touch and keyboard controls and accessibility settings. Success must come from the real mechanics, not a separate permissive practice implementation.
- No XP, unlocks, daily/weekly attempts, leaderboard entries or ordinary best-time writes.

Acceptance:
- Fixed setups reset reliably; retries clear queued input and temporary boosts.
- A lesson neither reports success too early nor traps the player after failure.
- Save data and selected outfit are unchanged on exit.
- Instructions, feedback and buttons fit small screens without hiding the action.

Playtest: can a new player explain each mechanic after completing its lesson? Add a simple route-choice lesson later if B4 demonstrates the need.

## B4 - Stage-specific route choices

Goal: create readable decisions between a shorter crowded route and a longer clearer route.

Split this batch into three reviewable slices:
- B4a Airport pilot: a queue/roped detour with an ordinary path and a tighter opening.
- B4b New York: a sidewalk detour around street furniture or a loading zone.
- B4c Tokyo: a crossing with a clear longer arc and a crowded direct line.

Rules:
- Both paths rejoin the same course. Keep an accessible route with no required item, paid unlock or perfect action.
- The advantage comes from distance and crowd risk; do not add another universal speed multiplier.
- Boundaries and crowds must match the visuals. Do not turn decorative scenery into surprise collision geometry.
- Entry should be readable before a fast racer reaches the decision. Keep exits clear and account for glass, vehicles and reverse belts.
- Share layout data between rendering, collision, spawn placement and bot planning. Bots must choose and navigate routes competently.
- Use deterministic layouts shared by all racers in a private room. Version records and ghosts when course geometry changes.

Acceptance:
- Both routes can be finished with every supported body/build; there are no unavoidable blocks or softlocks.
- Shortcuts cannot be taken through walls, and rewards/clean distance cannot be farmed by looping.
- Bot decisions work on each route and in dense crowds.
- Camera, scenery and signs stay readable on the smallest supported viewport and at high speed.
- A run with the same seed and inputs has the same collision outcome whether rendering is enabled or not.

Playtest: measure the actual risk/time trade-off. Adjust geometry or crowd density if one route always dominates.

## B5 - Elimination races

Goal: make position matter throughout a race, with a clear fair warning before each elimination.

Split into B5a local bots, then B5b private rooms. Do not expose the online variant until its ordering, interruption and pause tests pass.

Initial design:
- Start with the usual four-racer bot field. Use three marked distance checkpoints; one last-place racer is eliminated at each, leaving a winner.
- The lead racer crossing the checkpoint triggers the decision. Put markers at sensible fractions of the course; show the next checkpoint and identify last place.
- For 2-8 players, derive enough spaced checkpoints for the field size; never eliminate several racers accidentally because one frame crosses multiple markers.
- Define ties explicitly: greatest progress survives; exact progress ties use a stable starting-slot order. The UI must make a near tie understandable.
- An eliminated player gets an immediate result with spectate/exit. In private rooms, leaving a spectator view does not stop the race for everyone.
- In friend rooms, use the current host to issue ordered, race-scoped elimination decisions. Validate identity, checkpoint and duplicates. Reuse DNF/disconnect policy; no host migration in the first version.
- Shared pause stops elimination progress. Host loss ends the online elimination race with a clear result instead of inventing competing winners.

Acceptance:
- Exactly one eligible last racer is eliminated per checkpoint; eliminated racers cannot steer, collide, collect pickups or affect the remaining field.
- Countdown/pause cannot trigger eliminations, and a disconnected racer is handled once.
- Reordered, repeated, wrong-race or non-host decisions cannot eliminate someone.
- All clients converge on the same survivors and winner, including a disconnect at a checkpoint.
- Rewards/results distinguish winning, being eliminated and abandoning the race.

Playtest: checkpoint spacing, warning time, early elimination frustration and spectator usefulness. This is host-coordinated beta play, not a claim of server-authoritative competition.

## B6 - Weekly challenge race with a supplied outfit

Goal: a shared timed course where everyone races the same layout with the same stats, regardless of unlocked gear.

Initial design:
- One weekly course and supplied outfit, derived from a stable UTC week identifier and rules version. Lock stage, route layout, crowd seed, gear, difficulty/modifiers and power-up policy for the week.
- Use a solo time trial with no physical bots in the first release, avoiding AI variance in competitive times.
- The course can be retried freely; submit only the best valid finish. Existing one-try Daily/Weekly score modes keep their rules and categories.
- Show the exact outfit, stage, conditions and time remaining before starting. The player's saved customization is restored afterwards, including after an interrupted run.
- Give this race its own versioned best-time board. Reuse existing anonymous identity/read clients where possible.
- Audit existing server validation first. If the board needs a schema or RPC change, prepare a versioned migration and test it separately before enabling submission. Do not assume a client-side time check prevents cheating.
- Keep ordinary ghosts separate. Use a compatible weekly-course ghost only if its rules/week/outfit match; otherwise omit the ghost from the first version.
- A valid run finishes under the week it started, even across rollover. The board clearly separates weeks and rules versions.

Acceptance:
- Different devices given the same week/version create the same course and stats.
- Changing equipped gear, clock locale/timezone, retrying or going offline cannot silently change the challenge setup.
- Mid-run exits cannot submit unfinished or invalid times; retries cannot consume ordinary one-try attempts.
- Empty/loading/error board states work. Repeated submissions update best time correctly, and old rules/weeks do not contaminate the current board.
- Database changes, if needed, have a tested application and rollback path before release.

Playtest: weekly course length, retry appeal, supplied-outfit clarity and whether the chosen layout suits repeated runs.

## B7 - Combined balance and release check

Work:
- Re-run the full regression matrix below and compare performance with the baseline on the same device/scene.
- Review peak speed and crowd readability with x16, existing temporary boosts, bot calls and new routes together. Tune only from observed problems; keep rewards and difficulty values in configuration.
- Check old saves, locked items, current unlock counters, new-mode eligibility and record separation.
- Confirm all room participants use a compatible build. Test the published offline-worker update without clearing saved progress.
- Verify old modes and menus remain understandable; avoid overloading the permanent HUD with every new counter.
- Run the final production build, inspect the release diff and document the verified commit, open limitations and rollback reference.

Acceptance:
- No unresolved correctness regression in controls, collision, progress, replay compatibility or multiplayer results.
- No material performance loss from shared simulation changes in identical scenes. Record measured values and device limits rather than claiming an unmeasured FPS target.
- Tests and CI pass, new layouts are visually inspected, and any untested physical-phone behaviour is stated explicitly.
- If publication is authorized, verify Pages and the live build after cache activation; distinguish pushed, deployed and phone-tested states.

## Regression matrix for every relevant batch

- Classic, Daily, Weekly score runs: controls, score multiplier, challenge progress and one-try policy.
- Bot races: start/countdown, stamina, glass, bumps, boosts, finish order and rewards.
- Private rooms: 2 players and 8-player protocol tests, shared pause, concurrent pausers, leaving, reconnect, stale messages, DNF, results and rematch.
- Practice/new modes: correct reward eligibility, outfit restoration, retries and exit.
- Airport, New York and Tokyo: render smoke test; deterministic simulation independent of scenery rendering.
- UI: touch/keyboard, small phone portrait, a short viewport, long names and relevant try-on comparisons.
- Storage/network: existing save survives; invalid or unavailable data fails gracefully; offline mode does not claim successful online submission.
- Records/ghosts: stage, week, rules and mode match before comparison or display.

## Decisions and defaults

Approved direction: all six mechanics. The details above are implementation defaults, with specific numbers left tunable through playtesting.

Preserve these established rules unless Stefan changes them:
- Combo growth remains one level per three passes, capped at x16; difficult moves earn extra points/rewards rather than faster multiplier growth.
- Glass separates collision interactions; open belt ends and the divider between belts remain open.
- Any racer can pause a room; every pauser must become ready or leave before it resumes.
- Keep current private-race XP/unlock exclusions and disabled shared power-ups until a batch explicitly implements a replacement policy.
- No permanent outfit changes from practice or supplied-outfit challenges.

Later expansion ideas, not required for this queue: public matchmaking, bots filling friend rooms, host migration, saved outfit slots and further stages.

## Checkpoints

### B0 - Validated (headless), 2026-11-07
- Playable behaviour: none visible. `start()` accepts `opts.run`; practice/challenge runs cannot pay XP, move tallies, write bests/ghosts or submit scores; a supplied outfit applies to that run only (player model, stats, fit check); a run seed reproduces the layout; non-standard records use separate keys.
- Regression reproduced before implementation: 6 of 7 new tests in test/runopts.test.js failed first (no `S.run`).
- Tests: runopts 8/8 (includes a control proving a standard run does change XP/tallies/bests); full suite 332/332; `npm run build` succeeds.
- Browser / phone: not applicable (no UI change); ordinary start path covered by the existing suite.
- Known limitations: determinism-with-rendering-off is not separately tested yet (first needed in B4); bots' loadouts still use `Math.random`.
- Not published.
- Next: B1 clean-race rewards.

### B1 - Validated, 2026-11-07
- Playable behaviour: every 100 m walked without a bump is a clean segment (popup "CLEAN xN +M XP"); a bump restarts distance and tier, keeps earned segments; bot races pay +2/+4/+6/+8/+10 per segment, capped at +50, added to the race XP once on finishing. Results show "N clean segments · +X XP bonus" plus "Clean race medal · no bumps" (medal = zero bumps). Friend rooms show segments and the medal but pay no XP.
- Tuning: src/config/clean.js (CLEAN_SEGMENT_M, CLEAN_XP, CLEAN_XP_CAP). Distance counted is `speed * dt` while the race clock runs (never the countdown, a pause, or belt carry).
- Regression reproduced first: 7 of 9 new tests in test/clean.test.js failed before implementation.
- Tests: clean 9/9, full suite 341/341, production build succeeds.
- Browser: Orca browser, dev server; results screen with the new line at 390x844 and 320x568, no overflow. The in-play "CLEAN" popup was not looked at visually. Simulated viewport only; no physical phone.
- Known limitations / playtest: Easy vs Hard reward totals not compared yet; the cap (+50 = 500 clean m) is untested by feel. Standing still cannot be produced by the headless walker, so the "stationary earns nothing" case is covered by the speed*dt rule and a no-op test, not by a pinned-player scenario.
- Not published. Next: B2.

### B2 - Validated, 2026-11-07
- Playable behaviour: bots in local races say "Excuse me" (speech bubble, shout sound if within 14 m) when someone is in their way. The shout is one shared implementation (src/sim/actions.js: wellTimed / shoutTargets / shoutReact), so range, 4-person limit (6 when well timed), 5.5 s recharge (3.5 s when well timed), rival refusal and phone-user rule are identical for you and bots. Decision rate per second while someone is within 4.5 m in its lane: Easy 0.15, Medium 0.7, Hard 2 (`excuse` in DIFFICULTIES, race.js). Bot decisions use the seeded S.race.rng.
- Side effect on the player (intended, consistent with the glass rule): people on the other side of the airport glass are no longer reachable by your own Excuse me either.
- Stacking guard: bot calls skip anyone already stepping aside, and the push is a fixed amount, not additive.
- Regression reproduced first: all 9 tests failed before implementation (no botExcuseMe). The friend-room case is guaranteed structurally (remote bots never run stepBot) rather than by a test.
- Tests: botexcuse 8/8, full suite 349/349.
- Browser: dev server in the Orca browser. The bubble and crowd responses were checked in a manually rendered frame (the hidden page auto-pauses the game, so live capture was not possible). The viewport emulation did not resize the page (desktop-sized capture). Call frequency/feel in real play still needs a human playtest.
- Not published. Next: B3.

### B3 - Validated, 2026-11-07
- Playable behaviour: home screen Practice tile opens four lessons (Close pass, Perfect dash, Thread the needle, Slipstream) on a bare airport street: no crowd, bots, clock or countdown. A lesson panel states one task, reports what was detected (e.g. "That pass left 83 cm", "Dash started 4.2 m away: too early") and offers Try again / Next lesson / Exit when done. A bump, a wrong attempt or running out of people restarts only the lesson (fresh people, full stamina, boosts and queued taps cleared, player back at the start). Pause > Restart retries the lesson.
- Real mechanics: the normal pass, dash, slipstream and bump code post events to S.lesson.log; lessons only read them (src/sim/practice.js). Runs use category `practice` (B0), a fixed supplied outfit and a fixed seed, so nothing is paid, recorded, submitted, ghosted, or written to the save, and the saved outfit is untouched.
- Regression reproduced first: all 12 tests in test/practice.test.js failed before implementation.
- Tests: practice 12/12, full suite 361/361, production build succeeds.
- Browser: home, practice list and lesson panel (running and done states) at 320x568; lesson text and buttons do not cover the player. The Play screen was left unchanged after a sixth card made it too tight at 320x568 (Practice moved to the home tiles).
- Known limitations: lessons are driven by simulated steering in tests, not by a person on touch; the first-time 'how to play' text mentions no link to Practice yet; route choice lesson deferred to after B4.
- Not published. Next: B4a (Airport route pilot).

### B4 (a, b, c together) - Validated, 2026-11-07
- Playable behaviour: in bot races and friend races each stage has three route zones (src/config/routes.js): a barrier line across the street (Airport: rope, New York: orange construction fence, Tokyo: crowd-control barrier) with a tight 1.0-1.1 m DIRECT opening in the middle behind a zigzag queue of four stationary people, and a wide clear DETOUR opening (3.0 m airport, 1.5 m NYC, 4.0 m Tokyo) off to one side that alternates left/right between zones. Nothing is required to take either; no speed multiplier was added. Classic, Daily and Weekly are unchanged (no barriers), so their seeded crowds and records are unaffected.
- One data source: routes.js drives placement/collision (barriers are solid props with circles, queue people are ordinary stationary people), the renderer (rope/fence/crowdbar skin on the prop) and bot planning. Placement uses data, never the random stream.
- Bots: each bot decides once per zone (Easy 75% / Medium 50% / Hard 30% take the detour) and lines up for that opening up to 30 m out. This fixed a real softlock found by the tests: without it, bots hugging the barrier far from an opening could not plan a 4 m sideways move in time and sat pinned.
- Records: stages with routes use ':rt1' on their race best and race ghost keys, so old times and ghosts are preserved but never compared with the new course. Old Airport/NYC/Tokyo race records and ghosts are therefore no longer shown (they are intact under the old keys). Bump ROUTE_RULES in routes.js for any later geometry change.
- Regression reproduced first: the route tests failed (no barriers) before implementation; a Shibuya bot-softlock was reproduced and fixed. test/routes.test.js: 8 tests across all three stages (opening widths, clear of belts/crossings/strips, barriers only in races, barrier solid with both openings passable, bots clear every zone on several seeds, identical simulation with and without drawing, draw smoke test, versioned records). Two existing ghost tests moved to the versioned airport key.
- Tests: full suite 369/369, production build succeeds.
- Browser: barrier and opening readable at 390x844 on Airport, New York and Tokyo (manually placed frames; the hidden page pauses the game).
- Tuning (first guess, to be playtested): headless crude-controller timing for the Airport first zone, 12 seeds: direct 16.5 s / 3.3 bumps vs detour 17.3 s / 2.9 bumps (direct 0.8 s faster, slightly more bumps). Later zones were noisy and roughly even. The controller is not a person, so treat as a sanity check only.
- Known limitations: no signage or floor arrows tell a new player what the two openings mean; NYC/Tokyo fences are only visually distinguished by colour; friend rooms have no build-version handshake (see B7), so phones on different versions would see different layouts.
- Not published. Next: B5a (elimination vs bots).

### B5a - Elimination vs bots - Validated, 2026-11-07
- Playable behaviour: Play > Race vs bots has a Format chip (Race | Elimination; remembered). An elimination race has the usual four racers and three red checkpoint gates at 25/50/75% of the course (n-1 checkpoints at k/n for n racers). When the lead racer crosses a gate, exactly one racer, the one furthest behind at that moment, is out; a step handles at most one checkpoint. 25 m before a gate a banner names who is last ("ELIMINATION AHEAD · CATO IS LAST" or "YOU ARE LAST") and the HUD shows "cut in N m". Eliminated bots are removed from the field (no movement, collisions, drafting, pickups). If you are last you get the results at once ("Eliminated · 4th of 4", checkpoints survived, "Eliminated at checkpoint 1" in the standings). When one racer is left they win immediately, so the race ends at the third gate and the finish line is not used. Ties: greatest progress survives, an exact tie keeps the lower start slot (you are slot 0).
- Rewards: category `elimination` (B0): XP 6 for being cut, 11 for winning, plus the B1 clean bonus; counts as a race played ('races' tally) but not as a race win, and writes no race best, ghost or board entry, so it cannot be farmed for win unlocks. Race again / pause > Restart keep the format (restartRun).
- Tests: test/elim.test.js 13/13 (checkpoint spacing for 2-8 racers, tie rules, one elimination per checkpoint and per step, warning, pause/countdown, removed bots stay out, player cut with right place/XP once, winner, no records/win credit, format kept, normal races unchanged); full suite 382/382. All new tests failed before implementation (no elimination module).
- Browser: format chips and stage list fit at 320x568; gate, banner, "cut in" HUD text and the Eliminated results screen checked at 390x844. The gate's "CHECKPOINT n" label is not clearly legible in the render (the red frame is).
- Adjustment found: "Clean race medal" now needs at least one clean segment, so being cut at 0 m no longer shows a medal.
- Known limitations / deferred: no spectate (an eliminated player sees the results immediately; "watch the rest" needs a follower camera); no checkpoint ticks on the progress bar; no sound cue for the elimination beyond the existing effects.
- Not published. Next: B5b (friend rooms), which needs the protocol list below before any client code.

### B5b - Elimination in friend rooms - Validated (simulated room), 2026-11-07
Protocol (written before the client code, as the plan required):
- `start` (host to guests) and `roster.activeRace` carry `elim: true`; the roster also carries the host's chosen `elim`, so guests see the format in the lobby and a late-starting guest begins the same format. Only the host's messages count (existing rule).
- New message `elim` (host to guests): `{ id, session, race, rev, out: [id, ...] }`, the ordered list of eliminated racer ids; entry i is checkpoint i+1. The host sends it on every decision and repeats it on every keepalive (2 s). A guest applies only messages from the host id for the current race seed and only entries beyond what it already knows; entries must be strings naming a racer, never a duplicate, never more than the checkpoint count. Applying is idempotent, so repeated, late, reordered or partly lost copies cannot make phones disagree (a copy that skips an earlier one still applies in order). `rev` is informational only.
- The host decides: when the lead racer it can see (its own runner plus the interpolated remote runners) crosses the next checkpoint, it removes last place. Guests never decide. Ties: greatest progress survives; exact tie keeps the lower start slot (the room list order).
- Pause: nothing is decided while anyone in the room is paused (the host's elimination step is skipped while any pauser exists, and a paused phone does not run).
- Leaving/DNF: a racer who left is removed from the field by the existing bye/DNF handling and is shown as DNF, never as eliminated; the checkpoint then cuts the next-last still racing. If a decision names someone this phone already dropped, it still uses up that checkpoint.
- Host eliminated: their phone keeps following the other racers and keeps deciding (no host migration). Host lost or left: guests end the race ("Race ended · host left"), no winner.
- Results: eliminated racers get their results at once with their final place (n - k + 1); the board stays live behind the results screen. The last racer standing wins at the final checkpoint. Friend rooms keep their XP and unlock-progress rules (no 'races'/'wins' tally); XP is paid as for a finished friend race.
- Rematch keeps the format. Host picks it with the Race | Elimination chips in the room screen.
- Tests: test/elimroom.test.js 11/11 with 3 and 4 simulated phones (format and identical checkpoints on every phone, one decision converging everywhere, forged/duplicate/old/foreign/unknown decisions, never more cuts than checkpoints, pause, a racer leaving at the checkpoint, eliminated host continues to a winner with correct places, host leaving, no tallies, rematch keeps format, normal rooms unchanged). Full suite 393/393.
- Browser: host room screen with the format chips fits at 320x568. The room logic was tested only through the in-memory fake room; there was no live two-phone test over the real Supabase channel.
- Known limitations: host-coordinated beta, not server-authoritative; the host sees others slightly late, so a near-tie can be decided on slightly stale positions; if an eliminated host backgrounds the game, decisions pause until they return (guests are not told); no spectate view; no build-version handshake, so a phone on an older build would not understand `elim` and would race normally.
- Not published. Next: B6.

### B6 - Weekly challenge - Validated offline; online board OFF, 2026-11-07
- Server audit first (as the plan required): `scores` is higher-is-better, checks only `score` 0..2,000,000 and a 3-40 character board name, lets only `classic:` rows be raised, and has no check on the week or on plausibility. The existing `weekKey()` uses the phone's LOCAL date, so it cannot define a challenge week. Both findings shaped the design.
- Playable behaviour: Play > Race vs bots > Format > Weekly shows one card (stage, week id, time left, your best). It opens a details screen with the exact supplied outfit (body, build, headpiece, top, bottoms, shoes, back), the rules and Start. The run is a solo timed race on this UTC week's course (Airport or Shibuya; chosen from the week id; New York is excluded in rules v1 because its crossing waves use the shared random stream), no bots, no pickups, the normal 3-2-1 countdown, a locked crowd seed, no random events, rivals, rush hour or timed spawns (and swerve directions come from each person's own seeded phase), and the supplied outfit only for that run (saved outfit untouched, also after quitting). Retry is free ("Try again"), the best time is kept per week and rules version (`excuseme_wchal_<week>:challenge:r1`), a slower run never replaces it, and a run is filed under the week it STARTED in even if it finishes after the Monday 00:00 UTC reset. Quitting records nothing; nothing is paid, tallied or counted against daily/weekly tries. Leaderboards has a Challenge tab for this week's board (times shown as m:ss.t).
- Same on every phone: course, seed, outfit and stats come only from `challengeFor(week)` (config/challenge.js); equipped gear, locks and the device time zone play no part (UTC week, tested).
- Online board: scores are stored as `2,000,000 - milliseconds` (higher is better, so the existing table, sort order and keep-best trigger work). `supabase/migrations/0002_weekly_challenge.sql` adds an update policy for `wchal:` rows only and a trigger that checks the board name, a 20-600 s time band and that the week is the current UTC week (or the previous one for 6 hours after the reset); `..._rollback.sql` undoes it. The SQL could NOT be run here (no Postgres); it is untested. Submission is therefore switched off (`CHALLENGE_SUBMIT_ENABLED = false`): the time trial works fully offline, the results screen shows no online board, and the Challenge tab will simply read empty. It cannot stop cheating: a phone reports its own time within the band.
- To enable: apply the migration in the Supabase SQL Editor, check it by hand (insert and improve a test row; try a bad week, a 5 s time, and another user's row), then set the flag to true and ship.
- Regression reproduced first: all 12 tests in test/challenge.test.js failed before implementation. They cover UTC week boundaries, time left, determinism of course/outfit, solo/no-bots/no-pickups, identical setup and crowd across phones, equipped gear irrelevant and saved outfit untouched, no random crowd events, best-time storage and no other rewards, free retry, quit records nothing, rollover filing, encoding and plausibility band, submission off. A Challenge tab test was added to test/boards.test.js.
- Tests: full suite 406/406, production build succeeds.
- Browser: Weekly card, details screen (outfit grid, rules, Start) and results screen at 320x568, after trimming the text so the Start button fits.
- Known limitations: no weekly-course ghost (omitted from v1, as allowed); the timed spawns are removed rather than seeded, so the weekly crowd is quieter than a normal race; no push/notification when the week changes; the supplied outfit keeps the player's own colours (cosmetic only); online submission and the board are unverified until the migration is applied.
- Not published. Next: B7.


### B7 - Compatibility checkpoint, 2026-11-07 (in progress)
- Recovered the unfinished protocol-version guard after B6. Room protocol v2 is carried by hello, roster and start, including reconnects, heartbeats and rematches. Hosts refuse missing/different versions; guests refuse incompatible host rosters and start messages. A rejected join gives instructions to reload both phones.
- Test-first: the new incompatible-start test reproduced a race starting despite a mismatched protocol, then passed after guarding start. Added rejection tests for old/missing hello and roster versions. Updated existing synthetic packets representing compatible phones to include v2; their behavior assertions are unchanged.
- Targeted lobby/interruption tests: 45/45 pass. Production build succeeds. Fresh full regression run: 409/409 pass (npm.cmd test). git diff --check passes.
- Not published or committed. Current base: 4025e12 (B6); changes remain on Gameplay for review.
- Still pending: same-device performance comparison with the baseline, x16 plus boosts/route readability playtest, small-phone input/menu review, real two/eight-phone tests and published service-worker activation preserving saves. Earlier batch screenshots and simulated rooms do not establish these checks. Weekly online submissions remain disabled pending verified migration.

### B7 - User validation complete
- Stefan reports that the remaining release checks all work correctly, including deployed updates/save preservation, phone play, live friend rooms and performance. This is user-reported validation.
- Gameplay and main visual updates were integrated and pushed as 29dfcf9; combined regression suite 416/416 and production build passed before push.
- B7 is complete. Weekly leaderboard activation remains a separate B6 follow-up pending live database migration and verification.

### B6 follow-up - Database activation preparation
- Added tools/verify-weekly-db.cjs, an isolated in-memory PostgreSQL/PGlite check (dependency installed outside the repository). It checks repeat migration, insert/improvement/slower retry, bad week/time/name, ownership, classic/daily behavior and repeat rollback.
- Reproduced a trigger-order validation bypass before fixing it: changing a challenge row's submitted board to classic skipped challenge validation before keep_best restored its original board. The validation trigger now retains the original board/user before checking; the failing regression now passes.
- Production build passes. Live migration and submission activation await an authenticated Supabase dashboard session; the game flag stays false.
- Follow-up validation: all 416 game tests pass; production build and isolated SQL checks pass. No live database changes or submission activation performed.
