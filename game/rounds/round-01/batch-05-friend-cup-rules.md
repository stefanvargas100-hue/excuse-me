# Round 01, batch 05: Friend Cup rules

**Builder:** codex, defaults. Why: pure rules with exact inputs and outputs, tested without a browser.
**Risk:** low, because nothing calls this code yet. Second review: no. The lead reviews it closely, because batch 06 builds on it.

## Goal
A tested rules module for Friend Cups, ready for the online batch to use. Players see no change yet.

## Read first
- `src/sim/cup.js`: reuse `pointsFor` and `rankRows`, and do not copy them
- `src/sim/runopts.js`: `POLICIES`
- `test/cup-model.test.js`: shows how to load and test a module like this

## May edit
- `src/sim/friendcup.js` (new)
- `test/friendcup.test.js` (new)
- `src/sim/runopts.js`: add the `friendcup` policy only
- `test/runopts.test.js`
- `game/rounds/round-01/reports/batch-05-friend-cup-rules.md`

## Rules
A Friend Cup has 4 races and exactly 8 racers. It has at least 2 real players and at most 8, and bots fill the other places. The host chooses 4 different stages from indexes 0-4 in any order, and a bot difficulty of 0, 1 or 2.

Points and tie-breaks are the same as every Cup: `pointsFor` and `rankRows`. A bot that took over for a player who left keeps that player's name and points, and continues earning.

**The host's phone decides the results, and sends them to the others.** So every function must be pure: no game state, storage, network, DOM or `Math.random`. Randomness comes from a passed-in `rand` function. Objects are never changed in place.

## Exports
```js
FRIEND_CUP_RULES = 1, CUP_RACES = 4, CUP_RACERS = 8, BOT_LEVELS = 3
newFriendCup({ seed, stages, difficulty, players: [{ id, name }], rand }) // cup, or null if the setup is invalid
cleanSetup(raw)                  // { seed, stages, difficulty, racers }, or null. Checks a setup received from the host
cupRacers(cup)                   // [{ id, name, bot, left }], in the same order on every phone
currentStage(cup)                // the next race's stage index, or null when the Cup is over
raceSeed(cup)                    // seed + ':race' + race number, the same on every phone
addRace(cup, rows)               // new cup, or null if rows are invalid or the Cup is over
playerLeft(cup, id)              // new cup: that racer becomes a bot and keeps their points. Unknown ids and bots change nothing
hostLeft(cup)                    // new cup: over, with the standings from completed races
friendCupOver(cup)               // true after 4 races or hostLeft
standings(cup)                   // [{ id, name, bot, left, points, wins, last, time }], ranked
```
`rows` is `[{ id, place, time }]`, where `time` is seconds, or `null` if the racer did not finish.

## Details that must hold
- **Identify racers by `id`, never by name.** Two friends can have the same name, and each must keep their own points.
- **Bots:** ids are `bot:0`, `bot:1` and so on. Names are drawn from `BOT_NAMES` in `src/config/names.js` using `rand`, with no duplicates and no match with a player's name, ignoring case.
- **Racer order:** players as given, then bots. An exact tie in `standings` keeps this order, so all phones agree.
- **A valid `rows`:** exactly one row per racer, with places 1-8 each used once, and each time either `null` or a finite number from 0 to 3600.
- **A racer who did not finish** counts 1e6 towards total time, as `cupTable` does in `src/sim/cup.js`.
- **`cleanSetup`:** `raw` may be anything, because it arrives over the network. Reject anything malformed, including wrong counts, duplicate ids, non-strings, and `seed`, `id` or name strings over 24 characters. It never throws. A valid setup returns only the listed fields.
- **After `hostLeft`:** `addRace` returns null, `currentStage` returns null, and the race in progress is not counted.
- **Add to `POLICIES`:** `friendcup: { ...NONE }`.

## Fairness
These rules must not favour any racer:
- Host and guests earn points the same way, and only from their place.
- Bots are scored exactly like players.
- Leaving must not improve anyone's standing or reset their points.
- The same inputs in any phone's copy produce identical standings, so test that two separately built cups end identically.

## Must not change
`src/sim/cup.js`, the NYC Cup, and every other file not listed above. Do not add networking, screens or calls from the game. That is the next batch.

## Done when
- Tests failed first and now pass for everything above, including: full 4-race Cup, 2-player and 8-player setups, invalid setups, same-named players, a leaver keeping points, the host leaving, invalid rows, and at least 10 malformed `cleanSetup` values.
- `npm test`, `npm run build` and `git diff --check <base commit> HEAD` pass.

## Left for a person
Nothing yet. Players cannot reach this until the online batch.
