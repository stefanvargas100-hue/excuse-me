# Round 01, batch 06: Friend Cup online

**Builder:** claude, Opus, high effort. Why: tricky online work.
**Risk:** high. Second review: yes, by a separate worker before merging.

## Goal
Friends in a room can play a 4-race Cup with bots filling the room to 8 racers. Read `game/rounds/round-01/cups-spec.md`: it is the approved design.

## Read first
- `game/areas/online.md`
- `game/rounds/round-01/cups-spec.md`
- `src/sim/friendcup.js`: use this module for all Cup rules. Do not copy its logic
- `src/online/duel.js`: `startDuel`, `duelReceive`, `onMessage`, `sendRoster`, `applyOutcomes`, `hostStart`, `setRoomElim`
- `src/sim/race.js`: `addRemoteRacer`, `makeBot`, `initRace`, and the `D.send('pos'` block
- `src/sim/elim.js`, top comment: the same "host decides, sends the whole list" pattern
- `src/ui/friend.js`, `index.html` (friend room section)
- `test/lobby8.test.js`, `test/elimroom.test.js`: how rooms are tested with a simulated connection

## May edit
- `src/online/duel.js`, `src/ui/friend.js`, `src/sim/game.js`, `src/sim/race.js`, `index.html`, `style.css`
- `tools/fit-check.mjs`: add routes for the new screens
- `test/friendcup-room.test.js` (new)
- `game/rounds/round-01/reports/batch-06-friend-cup-online.md`

Do not edit `src/sim/friendcup.js`. If its rules need to change, stop and ask. If you need any other file, stop and report.

## How it must work
**Setup.** In a room, the host chooses Format: Cup, then 4 different stages in order, then bot difficulty. `newFriendCup` builds the Cup from the roster. Guests receive it and check it with `cleanSetup`. A Cup needs at least 2 real players.

**Stage buttons.** They currently show `L.city`, so three of them read "New York". Show the stage name, `L.name`, in the room and in Cup setup.

**Each race.** Use the existing Ready, clock and start flow. The stage comes from `currentStage`, the seed from `raceSeed`, and the run category is `friendcup`.

**Bots.** Only the host runs them. The host sends all bot positions in one combined message, at the same rate as `pos`. Guests show them through `addRemoteRacer`, like a friend. Do not add a message per bot. Bots use the Cup's difficulty, not the host's saved `excuseme_botlvl`, and that saved setting must not change.

**Results.** The host decides places, as with `applyOutcomes`, and adds them with `addRace`. It sends the Cup's complete results so far, so a lost, repeated or late message heals by itself, as elimination does. Every phone rebuilds its copy from that.

**Between races.** Everyone sees `standings`. Only the host can start the next race. After race 4, everyone sees final standings, and Rematch is not offered until a new Cup is set up.

**A player leaves.** Use `playerLeft`. A bot at the Cup's difficulty takes over from their last known position in the current race, and keeps their name and points. No rejoining.

**The host leaves.** Everyone finishes the current race, then sees "Host left" and the standings from completed races, using `hostLeft`. Passing the host role is a later batch.

**Versions.** Raise `PROTO` by one. Another worker is also raising it, and the lead resolves that when merging.

## Must stay fair
- Bots behave the same towards every racer, and host-run bots give the host no advantage in points or placing.
- A guest's finish counts the same as the host's. Follow how friend races treat finishes today.
- Racers are identified by `id`, so same-named friends stay separate.
- All network input is checked. Bad messages are dropped, never trusted or partly applied.
- Nothing is paid or recorded: no XP, tallies, records, boards or ghosts. Test this.

## Must not change
Normal friend races and Elimination, including their flow and messages other than `PROTO`. The solo NYC Cup. Classic, Daily and Weekly. Friend Cups stay on stages 0-4 for now, and the lead adds the Subway stage later. Do not touch the live database or run `tools/loadtest.mjs`.

## Measure
With a simulated connection and 7 host-run bots, report messages per second sent by the host and the size in bytes of the combined bot message. Stop and report if it would need a message per bot, or if a combined message exceeds 8 KB.

## Done when
- Tests failed first and now pass, using the simulated connection, for: a full 4-race Cup with 2, 3 and 8 phones; bots appearing on guests' phones; a guest leaving mid-race and between races; the host leaving; lost and repeated results; mismatched versions; malformed setup and results messages; and nothing being paid or recorded.
- New screens pass `npm run test:fit`, with the 8-row standings reachable at 320x568. Report the summary line and look at the screenshots.
- `npm test`, `npm run build` and `git diff --check <base commit> HEAD` pass.
- The report says which checks used the simulated connection. Real browsers and phones come next, in the QA batch.

## Left for a person
Two real phones: smoothness with 8 racers, whether bots look natural on guests' phones, and whether host setup is clear.
