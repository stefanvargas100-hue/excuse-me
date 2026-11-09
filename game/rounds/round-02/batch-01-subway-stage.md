# Round 02, batch 01: Subway Platform stage, first version

**Builder:** claude, Sonnet, medium effort. Why: a clearly defined stage, and it spreads usage while Codex builds Friend Cup rules.
**Risk:** medium. It adds a stage to shared lists, so existing modes must stay exactly as they are. Second review: no, the lead reviews screenshots.

## Goal
A playable sixth stage: a New York subway platform where arriving trains release waves of commuters. Placeholder art is fine, but it must clearly read as a subway platform and play differently from the other stages. It is available in Classic, Race vs bots and friend rooms. It is not in NYC Cup yet.

## Read first
- `game/areas/gameplay.md`
- `git show --stat c92254e`: the Brooklyn Bridge commit is the recipe for adding a stage. Copy its pattern, and open only the parts you need
- `src/config/levels.js`, `src/config/medals.js`
- `src/render/bridge.js`: smallest example of a stage painter
- `src/sim/people.js`: `bridgeProps`, `runEvent`
- `src/sim/game.js`: `dailyLevel`, `weeklyLevel`
- `test/bridge.test.js`, `test/rotation-stage.test.js`

## May edit
- `src/render/subway.js` (new), `src/render/render.js`, `src/render/figures.js`, `src/render/weather.js`
- `src/config/levels.js`, `src/config/medals.js`, `src/config/colour.js`
- `src/sim/people.js`, `src/audio/soundtrack.js`, `src/ui/menus.js`, `style.css`
- `src/sim/game.js`: `dailyLevel` and `weeklyLevel` only
- `src/online/duel.js`: the `PROTO` value only
- `test/subway.test.js` (new), `test/rotation-stage.test.js`, `test/entries/rotation-entry.js`, and existing tests only where they assert the list of stages
- `game/rounds/round-02/reports/batch-01-subway-stage.md`

If it needs anything else, stop and report.

## The stage
| Item | Value |
|---|---|
| Index and id | 5, `subway`, appended to `LEVELS` |
| City and name | New York, Subway Platform |
| Goal | 450 m, goal text `UPTOWN EXIT` |
| Half-width | 4.5, constant, with no change to `halfAt` |
| Look | Underground and dimly lit. Tiled wall on one side, track and yellow safety edge on the other, ceiling, and columns |
| Music | Add to the soundtrack using the existing New York playlist |

## The main challenge
A new event, `train`. A train arrives on the track side, `TRAIN ARRIVING` shows on the banner, and commuters step out of its doors in groups and cross the platform.

- Waves appear ahead of the player, beyond `SPAWN_FAR`, as all spawns do.
- Doors are spaced apart, so **there is always a clear way through a wave.** It can be slow, but never a solid wall.
- The player, bots and crowd all share the same `half` boundary.
- All randomness uses the same seeded functions the other events use.

## Must stay fair
- Bots at Easy, Medium and Hard all finish the stage. Report their median times.
- A wave treats all racers alike and never targets the player.
- No racer can be trapped: add a test that checks for a gap during a wave.

## Medal times
Measure as in the comment at the top of `src/config/medals.js`: median bot finishes across 3 seeded races at 60 Hz, using the same method for each level. These are first guesses.

## Rotation and online
- **Daily and Weekly must not change.** Published periods use the current stage count, so adding a stage would change today's course. Cap the rotation at the 5 existing stages in `dailyLevel` and `weeklyLevel` for all dates, keeping the older date guards. Subway Platform stays out of the rotation for now. Test that several current and future keys give the same stage before and after.
- **Weekly Challenge** keeps its own stage list unchanged.
- **`PROTO` goes from 3 to 4,** so a phone without this stage gets the existing "update the game" message.

## Must not change
- Indexes of the other 5 stages.
- Crowds and random sequences on the other 5 stages, in every mode. Do not make other stages draw extra random numbers.
- `src/sim/cup.js`, `CUP_STAGES`, and `src/sim/friendcup.js`, which another worker is building.
- `src/config/routes.js`: no route zones or side routes in this batch. A later batch adds them.
- Existing saves.

## Done when
- Tests failed first and now pass for: the stage list and index, the `train` event and its gap, staying inside `half`, medal lookup, rendering at several positions, and the unchanged rotation.
- Classic and Race vs bots both play through on the stage in the test harness.
- 3 screenshots from the real game in a browser at 390x844: a quiet stretch, a train wave, and the finish. Save them to `$TEMP/subway-*.png`, look at them yourself, and name the paths in the report.
- `npm test`, `npm run build`, `npm run test:fit` and `git diff --check <base commit> HEAD` pass. Report the fit summary line.

## Left for a person
Whether it feels good to play, whether waves are fun rather than annoying, medal fairness, and smoothness on a phone.
