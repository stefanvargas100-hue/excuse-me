# Round 02, batch 07: side routes, proven on Subway, then Takeshita Street

**Builder:** codex, defaults. Why: the Director chose Codex for Round 2. It is one worker, so the system and its first reuse share context.
**Risk:** high: it changes how racers move and are drawn, and the online messages. Second review: the lead reviews part 1 and the route timings.

## Goal
Stages gain side routes that leave the street and rejoin it. **The Director's rule: a hard route must reward the player, and an easy route must be no better than the main path.** Build the system once on Subway Platform, then use it for the first Tokyo stage, Takeshita Street.

## Read first
- `game/rounds/round-02/side-routes.md`, all of it
- `game/rounds/round-02/stage-ideas.md`: the Tokyo table
- `game/areas/gameplay.md` and `game/areas/visuals.md`
- `game/rounds/round-02/batch-01-subway-stage.md`: how a stage was added, and which files and tests that touched
- `src/config/routes.js`: today's route zones
- `game/rounds/round-01/batch-03-medal-times.md`, section "Setting the times"

## Part 1: the side-route system, on Subway
- **Data per stage:** entrance, exit, level (up, down or same), difficulty (easy or hard), and its shape.
- **Racers gain a route value.** Collisions, crowd, drawing, the radar and remote players use it. Racers on different routes do not collide.
- **Subway route:** stairs up to the mezzanine and back down. Hard: the stairs cost speed, then a clear, fast stretch.
- **Bots** choose routes, Hard bots more often on hard routes, so routes feel contested. Do not change bot lane choice in `think()` or any `DRAFT_*` value: another batch is changing those. Add the route choice as its own step.
- **Online:** a remote racer's route travels in the position message. Raise `PROTO` from 5 to 6, and search the tests that hard-code it. Another batch may also raise `PROTO`; the lead reconciles that.
- **Ghosts and records** stay fair, using the existing course tag. Classic, Daily and Weekly keep their seeded crowds unchanged.
- **Placeholder art is allowed:** readable stairs and a mezzanine floor are enough.
- **Measuring test**, `test/side-routes.test.js`: a scripted racer drives the main path and each route. Hard routes come out 3-8% faster, and easy routes within 1% of the main path, never faster.
- Re-measure Subway's medal times with the batch 03 method.
- **Commit part 1 with its report section before starting part 2.** Then carry straight on.

## Part 2: Takeshita Street (Tokyo)
- A narrow shopping street where shoppers stop without warning. Its main challenge is reading who is about to stop.
- **Side route:** the back alley. Easy: quieter but longer, at most equal to the main path.
- Add it as Subway was added: the stage list, menus, colours, music, and Daily/Weekly rotation, following batch 01. **Do not** add it to any Cup; the lead does that after the Director tries it.
- Set its medal times with the batch 03 method. Placeholder art is allowed, and the look must read as Tokyo, not New York.

## May edit
- `src/config/routes.js`, `levels.js`, `medals.js`, `colour.js`, and new config files for side routes
- `src/sim/race.js` (not `think()` lane choice or `DRAFT_*`), `people.js`, `crowd.js`, `ghostshare.js`, `replay.js`, `traffic.js`
- `src/render/*` (new files allowed), `src/audio/soundtrack.js`, `src/ui/menus.js`, `style.css`
- `src/sim/game.js`: `dailyLevel` and `weeklyLevel` only
- `src/online/duel.js` and `src/online/remote.js`: `PROTO`, and the route in the position message only
- `test/side-routes.test.js` (new), `test/takeshita.test.js` (new), `test/subway.test.js`, `test/rotation-stage.test.js`, `test/entries/rotation-entry.js`, and existing tests only where they assert the stage list or hard-code `PROTO`
- `game/rounds/round-02/reports/batch-07-side-routes-takeshita.md`

If it needs anything else, stop and report.

## Must not change
Bot lane choice in `think()`, `DRAFT_*`, Cup stage lists, the live database, and seeded crowds in Classic, Daily and Weekly.

## Done when
- Tests that failed first now pass: route timings within the targets, racers on different routes not colliding, a remote racer's route arriving, and the stage lists.
- Focused tests, then `npm test`, `npm run build` and `git diff --check` pass.
- The report gives route timings as percentages against the main path, medal times old and new for Subway and new for Takeshita, and a short description of each new screen, using images from `npm run build` and a Playwright capture at 390 x 844.

## Left for a person
Whether routes are easy to see and worth taking, how Takeshita feels, and whether the medal times are fair, on the playtest link.
