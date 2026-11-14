# Round 02, batch 24: host-selected bots in plain friend races and Elimination

**Builder:** Claude Opus 5.5 (`--agent claude --model claude-opus-5-5 --effort high`). Why: tricky online work (model routing). Codex is near its weekly limit until 2026-11-16, and no other Claude worker is running.
**Risk:** high (online protocol). Second review: yes, by Codex after its limit resets. Do not merge before that review.

## Goal
In a friend room, the host can add bots to a plain race or an Elimination race, as the Cup already allows (Director decision 2026-11-12, `game/decisions.md` top entry). The host picks the bot count and difficulty. Every phone sees the same bots, and bots finish, place and get eliminated like racers.

## Read first
- `src/online/duel.js`:
  - `startDuel`, `beginRace`, `hostStart`, `receiveBots`, `outcomeRows`, `publishOutcomes`, `applyOutcomes`, `setRoomElim`, `setRoomCup`, `roomCup`, `sendRoster`
  - the `roster` branch of `onMessage` (about line 456), `normalBots`, `validCup`
- `src/sim/race.js`: lines 175-230, where the Cup host runs bots (`cupBotLook`, `addCupBot`, `botRows`, the `D.cup && D.cup.host` checks)
- `src/sim/game.js`: lines 550-565 (`addCupBot` vs `addRemoteRacer` for `P.ai`)
- `src/sim/friendcup.js`: how `newFriendCup` picks bot ids and names. Reuse it rather than copying it.
- `src/ui/friend.js`: `showStages` lines 80-95 and the bot controls at lines 120-135
- `src/ui/friend-groups.js`: `syncBotOptions`
- Tests to extend: `test/room.test.js`, `test/elimroom.test.js`, `test/friendcup-room.test.js` (pattern for a host plus guests over a fake room), `test/spectate.test.js`

## Design (lead decisions)
- **Setting:** the plain and Elimination settings gain `bots` (0 to the free seats, or `'fill'`) and `difficulty` (0-2). The host sends them on the roster, the same way `cupCfg` travels.
  - Plain and Elimination default to 0 bots, so a room that touches nothing behaves exactly as today.
  - Changing the setting un-readies guests, as Cup changes do.
- **Bot identity:** the host decides the bot field at start: ids, names, looks (`cupBotLook`) and difficulty.
  - Guests must receive it before the start and check it, the way `publishCup` goes before `lobby.start` for a Cup.
  - Bot ids must never collide with player ids.
  - A guest whose field disagrees with the start refuses the start ("Start could not be confirmed"). It never runs a different field.
- **Running bots:** only the host simulates bots and sends `bots` rows. Generalise the `D.cup.host` checks to a host-runs-bots flag that is true for a Cup host and for a plain or Elimination host whose race has bots. Guests draw bots from those rows, unchanged.
- **Results:** bots appear in places and results on every phone. In Elimination, the host eliminates bots by the same rule as players.
- **Host leaves mid-race (plain or Elimination):** bots stop with no finish time and are listed as not finished. Players race on. Cup host handover is unchanged.
- **Minimum players:** a start still needs 2 real players (`canStart`). Bots never count toward it.
- **Spectating** works on bots as it does in Cups.
- Bump `PROTO` to 14. Tests read `PROTO` from `duel.js`; keep it that way.

## May edit
- `src/online/duel.js`, `src/sim/race.js`, `src/sim/game.js` (the duel setup lines above only), `src/ui/friend.js`, `src/ui/friend-groups.js`
- `index.html`: the label and aria text of `#friendCupBots` / `#friendBotCount` / `#friendCupLevel`, so they are not Cup-only
- `style.css`: only rules for those controls, if the lobby needs it
- Tests: new `test/room-bots.test.js`, plus changes to existing room tests where `PROTO` or roster shape must change. Name each changed test in the report.
- Evidence: `game/rounds/round-02/batch-24-evidence/`

## Must not change
- Friend Cup rules, `FRIEND_CUP_RULES`, Cup bot counts, Cup traffic and Cup host handover. The existing Cup tests pass without edits apart from `PROTO`.
- Rooms with 0 bots: same messages, places, Elimination order and ghosts as before. Prove it with a test that compares results and messages before and after.
- Bots never send or receive ghosts. Solo modes, records, boards, Daily and Weekly are untouched.
- Every received bot field and `bots` row is validated, as `cupFromMessage` and `receiveBots` already do. A guest must not crash or run a bot that the host did not declare. Add tests that feed bad fields and bad rows (wrong ids, too many bots, a bot id equal to a player id, bad numbers).

## Fairness
- Every phone in the race sees the same bots with the same difficulty.
- Bots start in the room's start lineup like players. No bot gets a better start slot than a player at the same position in the order.
- An Elimination round treats a bot exactly like a player.

## Done when
- Tests show the following, with a host and 2 guests over the fake room:
  - a plain race with 3 bots, and an Elimination race with bots, run to the end;
  - every phone shows the same bot names and places;
  - Elimination knocks out bots correctly;
  - the bad-message tests are refused.
- The 0-bot equivalence test passes.
- New tests failed first and now pass.
- Browser evidence uses the two-page local relay in `game/rounds/round-02/batch-22-evidence/capture.mjs`, copied and adapted into the batch-24 evidence folder. It needs a real joined guest, not a DOM fixture. Capture:
  - the host lobby with the bot controls in Race and Elimination;
  - a guest mid-race seeing bots;
  - a results screen with bots;
  - each at 320x568 and 390x844.
- No new fit problems in `node tools/fit-check.mjs` (report before and after counts).
- `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
Real phones over the internet, and whether bot difficulty feels right in a friend race.
