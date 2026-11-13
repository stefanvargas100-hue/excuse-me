# Round 02, batch 22: Finish spectating in friend modes

**Builder:** Codex, defaults. Why: defined build; Claude reviews it, as the other model.
**Risk:** high (online race flow, shared files). Second review: yes, independent, before integration.

## Goal
Director decision 2026-11-12 (`game/decisions.md`, top entry): in a friend race, Elimination or Friend Cup, a player who finishes goes **straight into spectating** instead of a static results screen. They can switch between racers still running and can **stop watching**, which shows their own results while they stay in the room. Early finishers are no longer stuck waiting.

## Read first
- `game/areas/online.md`, `game/areas/gameplay.md`
- `src/sim/race.js`: `finishRace` (line 556), the remote racer sampling (about line 207), host bots after the host finishes (about line 228)
- `src/sim/game.js`: `tick` camera line 106, `showEnd` (line 286), the "Finished · waiting for racers" text (line 449), `showFriendCupEnd`
- `src/render/camera.js`, `src/render/render.js`, `src/render/hud.js`
- `src/online/duel.js`: results refresh and `bye` handling (about lines 226, 374, 394, 516) — read only unless the rules below need it
- `test/friendcup-room.test.js` test "bots keep running and reporting after the host has finished" (line 272): the room-test pattern to copy
- `studio/skills/test-first/SKILL.md`

## Rules
- **When:** the moment the local player finishes, or is knocked out in Elimination, while at least one other racer (human or bot) is still running. If nobody is left running, show results as today. Solo modes (Race vs bots, NYC Cup, Classic, Daily, Weekly) are unchanged.
- **Target:** start on the closest unfinished racer ahead of the race (the leader still running). Previous/next buttons cycle through all unfinished racers, bots included. Show the target's name and current place. When the target finishes, leaves or disconnects, switch to the next one automatically. When the last racer is done, go to the results screen as today.
- **Stop watching:** a button shows the player's own results screen at once, with the same content and actions as today (next Cup race, rematch, leave). The player stays in the room. Leaving spectating is one-way for that race.
- **No influence:** a spectator's input does nothing to any racer. The player's finish time, place, Cup points, XP and rewards are fixed at the finish and must not change. Spectating sends no new network messages; use positions the phone already receives. If you find a protocol change is truly needed, stop and report before making it.
- **Host:** when the host spectates, host-run bots must simulate exactly as when the host does not spectate. Test it: same seed, compare bot finish times with spectating on and off. If the crowd cannot be shown around a racer far behind without changing the host's simulation, show the street without that crowd and say so in the report.
- **Controls:** the spectate bar (name, place, previous, next, stop watching) fits and is reachable at 320x568 and 390x844 and works by touch. Respect calm/reduced-motion settings for camera moves (cut instead of pan).
- Pause, host handover, a guest reconnecting, rematch and the Cup award animation keep working. A Cup's next race must not wait on anyone who is spectating.

## May edit
- `src/sim/game.js`: end-of-race flow, `tick` camera, `showEnd` / `showFriendCupEnd` entry only. Batch 23 (Airport stages, running at the same time) may add a few lines in `movePlayer` and `stepBot`; do not touch movement.
- `src/sim/race.js`: `finishRace` and the code that decides when results show
- `src/render/camera.js`, `src/render/render.js`, `src/render/hud.js`, `src/ui/screens.js`
- `src/online/duel.js`: only the local results/waiting state, no message formats and no `PROTO` change
- `index.html`, `style.css`: the new spectate bar only
- Tests: new `test/spectate.test.js`, plus existing room tests only where they assert the finish screen appears immediately
- `game/rounds/round-02/reports/batch-22-spectating.md`, `game/rounds/round-02/batch-22-evidence/`

## Must not change
- Message formats, `PROTO`, `START_PROTOCOL`, start sync, scoring, points, rewards, records, ghosts, bot AI, crowd generation for racers still running.
- Solo modes and their end screens. Art worlds. Live database, dependencies.

## Done when
- New tests failed first and now pass: auto-spectate on finish with racers left; no spectate when all are done; next/previous cycle skips finished and departed racers; target auto-switch on finish and on disconnect; stop watching shows the same results with unchanged place, time and points; spectator input ignored; host bot finish times identical with and without host spectating; Elimination knocked-out player spectates; Cup next race starts while a guest spectates.
- Browser screenshots at 320x568 and 390x844 of a host and a real joined guest spectating a bot and a human, and after stop watching. Start from the two-page capture in `game/rounds/round-02/batch-19-evidence/capture.mjs`. Run `npm run test:fit` and report only problems you introduce (the lead's current run on develop: 71 checks, 36 problems).
- `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
- Real phones on a real network: does following another racer feel smooth, and is it clear how to stop watching?
