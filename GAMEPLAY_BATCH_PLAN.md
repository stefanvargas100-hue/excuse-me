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
| B2 | Bots use Excuse me | B0, B1 validation | Bot races | Planned |
| B3 | Replayable practice course | B0, B1, B2 | Four short local lessons | Planned |
| B4 | Stage-specific route choices | B0-B3 | Airport pilot, then NYC and Tokyo | Planned |
| B5 | Elimination races | B0, B3, B4 | Bots first; friend rooms second | Planned |
| B6 | Weekly challenge race with a supplied outfit | B0, B3-B5 | Solo timed race and dedicated board | Planned |
| B7 | Combined balance, compatibility and release check | B1-B6 | All supported modes | Planned |

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
