# Round 02, batch 23: Security Lanes, Baggage Claim and Gate Change Rush

**Builder:** Claude Sonnet 5.5, medium. Why: clearly defined stage work; Codex's weekly limit is nearly used (89%) and goes to batch 22.
**Risk:** medium. It adds stages to shared lists, so existing modes must stay exactly as they are. Second review: no; lead reviews screenshots and diff.

## Goal
Three new Airport stages, completing a 4-race Airport Cup (Terminal B, Security Lanes, Baggage Claim, Gate Change Rush). Context: `game/rounds/round-02/complete-cups-plan.md`. Placeholder art is fine, but each must clearly read as its place and play differently from every other stage. Available wherever Takeshita is: Classic, Race vs bots, friend rooms and the Friend Cup presets (an Airport preset appears on its own once Airport has 2+ tracks).

## Read first
- `game/areas/gameplay.md`
- `git show --stat c9fbfaf`: batch 21 added Tsukiji and Skytree; it is the closest recipe. Open only the parts you need.
- `src/config/levels.js` (the `tsukiji` entry), `src/config/medals.js` (comment at top), `src/config/styles.js` (`STAGE_STYLE`)
- `src/render/tsukiji.js`: a small stage painter
- `src/sim/people.js`: `runEvent` (the `turret` and `viewpoint` branches, and the airport `queue`, `spill`, `cart` events), `spawnUnit`, `wetGrip`
- `src/sim/race.js`: `stepBot` (how bots pick their lateral target)
- `game/rounds/round-02/batch-21-evidence/calibrate.js`: how medal medians were measured
- `studio/skills/test-first/SKILL.md`

## The stages
| Item | Security Lanes | Baggage Claim | Gate Change Rush |
|---|---|---|---|
| Index and id | 9, `security` | 10, `baggage` | 11, `gatechange` |
| City | Airport | Airport | Airport |
| Goal | about 450 m | about 480 m | about 600 m |
| Half-width | about 6 | about 7 | about 6 |
| Look | Stanchion rope lanes, scanner arches, trays | Carousels with bags along one side, trolleys, arrivals screens | Long concourse, gate signs, departure boards |

All three: map `STAGE_STYLE` to the existing `space` recipe (no new recipe; the Director is redirecting visuals later), use the Airport music progression, and give no moving belts (`strips.js` must not gain these ids).

## The main challenges
- **Security Lanes: choose a lane early.** The course has stretches of 3 or 4 parallel queue lanes divided by rope lines that block sideways movement, with open gaps between stretches. In each stretch some lanes are closed at their far end by a scanner gate. Closed lanes are visible (gate sign or light) as soon as the stretch is generated, at least one lane is always open, and the open/closed pattern is seeded. Bots must read the same lane state to choose an open lane before a stretch: add the smallest hook in `stepBot` that does this, without changing bot behaviour on other stages.
- **Baggage Claim: things spill across your path.** New event (for example `bagspill`): bags slide and trolleys roll across the walkway from the carousel side, in a short burst, announced on the banner. Moving obstacles collide like people. Always leave a gap.
- **Gate Change Rush: the crowd turns and surges.** New event `gatechange`: a banner announces the change, then most of the crowd ahead turns around and walks briskly toward you for a few seconds before settling. Gaps must remain; nobody is pushed through the player.
- All randomness uses the same seeded functions the other events use. Spawns appear beyond `SPAWN_FAR`. Player, bots and crowd share the same `half`. Other stages must not draw extra random numbers.

## Must stay fair
- Bots at Easy, Medium and Hard finish all three stages; report median times. Seven Medium bots finish each stage within 600 simulated seconds on 3 fixed seeds (copy the deterministic style of `test/cup-preset-bots.test.js`).
- Events treat all racers alike and never target the player. No racer can be trapped: tests check an open lane in every security stretch, a gap during a spill, and a gap during a gate change surge.

## Medal times
Measure as the comment at the top of `src/config/medals.js` says, using `batch-21-evidence/calibrate.js` as the method. First guesses.

## Rotation, Cups and online
- Daily and Weekly stay capped at the first 5 stages: do not change `dailyLevel` or `weeklyLevel`. Weekly Challenge keeps its stage list. Solo Cups unchanged (batch 25).
- The Friend Cup Airport preset must be 4 races in `LEVELS` order; a simulated Airport Friend Cup with bots completes.
- Bump `PROTO` in `duel.js` by one from its value on your base.
- **Permanent fix, do this first:** batches 19 and 21 each spent time editing about 8 test files that hard-code `PROTO` (`cap-wire-compatibility`, `elimroom`, `friendcup-room`, `friendcup`, `ghostroom`, `interruptions`, `lobby`, `batch18-review-*`, `host-handover` and others: search for `proto:` and `PROTO` with a number). Make those tests read `PROTO` from the module they already load instead of a literal, so a bump needs no test edits. Tests that deliberately send a wrong protocol keep doing so relative to `PROTO` (for example `PROTO - 1`). Do this as its own commit, with the full suite passing before and after.

## May edit
- `src/render/security.js`, `src/render/baggage.js`, `src/render/gatechange.js` (new), `src/render/render.js`, `src/render/figures.js`, `src/render/weather.js`
- `src/config/levels.js`, `src/config/medals.js`, `src/config/colour.js`, `src/config/styles.js` (`STAGE_STYLE` entries only)
- `src/sim/people.js`, `src/sim/crowd.js` (only if rope lines need a collision rule), `src/audio/soundtrack.js`
- `src/sim/race.js`: the lane-choice hook in `stepBot` only. `src/sim/game.js`: only if the player needs the same rope-line rule, kept to a few lines in `movePlayer`; batch 22 is editing the end-of-race flow and camera in this file at the same time, so touch nothing else.
- `src/online/duel.js`: the `PROTO` value only
- New tests `test/security.test.js`, `test/baggage.test.js`, `test/gatechange.test.js`; existing tests for the `PROTO` fix above and where they assert the stage list or count
- `game/rounds/round-02/reports/batch-23-airport-stages.md`, `game/rounds/round-02/batch-23-evidence/`

If it needs anything else, stop and report.

## Must not change
- Indexes, crowds and random sequences of stages 0-8 in every mode. Terminal B's belts and events.
- `src/sim/cup.js`, `src/sim/friendcup.js`, `src/ui/friend*.js`, side routes.
- Movement constants, build stats, pickups, bot behaviour on existing stages. Existing saves, records, ghosts. Live database, dependencies.

## Done when
- Tests failed first and now pass for: stage list and indexes; each event and its gap; an open security lane in every stretch and bots choosing it; staying inside `half`; medal lookup; rendering at several positions; unchanged Daily/Weekly rotation; Airport Friend Cup preset of 4 completing with bots.
- Classic and Race vs bots play through each stage in the test harness.
- Screenshots from the real game in a browser at 390x844 per stage: a quiet stretch, the main event, the finish. Save to `game/rounds/round-02/batch-23-evidence/`, look at them yourself and describe them in the report.
- `npm test`, `npm run build`, `npm run test:fit` and `git diff --check` pass (fit: report only problems you introduce; the lead's develop run before this batch had 71 checks, 36 problems).

## Left for a person
Whether each stage is fun on a phone, medal fairness, smoothness on older phones.
