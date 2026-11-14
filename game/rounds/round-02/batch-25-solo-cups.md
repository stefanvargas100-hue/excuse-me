# Round 02, batch 25: solo Tokyo and Airport Cups

**Builder:** Claude Sonnet 5.5, medium. Why: Codex is near its weekly limit (91% on 2026-11-12, resets 2026-11-16) and this is a clearly defined local batch.
**Risk:** medium (saved records). Second review: no, the lead reviews it.

## Goal
"Race vs bots" → Cup offers three solo Cups: New York (unchanged), Tokyo and Airport. Each is 4 races against 7 bots with the same points, XP and table as the NYC Cup, and each keeps its own best.

## Read first
- `src/sim/cup.js` (whole file, 46 lines)
- `src/sim/game.js`: `showCupEnd` (about line 428), the `NYC Cup` section `cupRun` … `cupRoundDone` (about lines 585-622), `restartRun`, and the pause eyebrow in `showPauseMenu` (about line 639)
- `src/ui/menus.js`: the `raceFormat() === 'cup'` branch of the stage list builder (about line 110)
- `src/sim/cup-presets.js` (`stageGroups`)
- `src/sim/runopts.js`: `recordKey` (line 28)
- Tests: `test/cup-flow.test.js`, `test/cup-model.test.js`, `test/cap-compatibility.test.js` line 39

## Stages and order
- **New York:** `CUP_STAGES` `[1, 5, 3, 4]` exactly as now (Director-set order).
- **Tokyo:** `[2, 6, 7, 8]`. Shibuya Crossing, Takeshita Street, Tsukiji Outer Market, Skytree Sky Walk.
- **Airport:** `[0, 9, 10, 11]`. Terminal B, Security Lanes, Baggage Claim, Gate Change Rush.

These are the same orders as the Friend Cup presets. Take Tokyo and Airport from `stageGroups(LEVELS)`, so a new stage in that city later joins its Cup. Keep New York as the fixed list.

## May edit
- `src/sim/cup.js`: a city-to-stages lookup. `cupDone` must use the Cup's own stage count. Keep `CUP_STAGES` exported for New York.
- `src/sim/game.js`: only the functions named above. `startCup(city)` defaults to New York, so the existing calls `startCup()` keep working. Labels use the Cup name ("Tokyo Cup · round 2 of 4", "3rd in the Tokyo Cup", "Next round: …"). `cupBest(city)` also defaults to New York.
- `src/ui/menus.js`: the Cup branch shows three cards (New York, Tokyo, Airport). Each card shows its best or "Win rounds for points". Fix the stale "3 NYC races" text to read 4 races.
- `index.html` line 132: rename the format chip "NYC Cup" to "Cup".
- `tools/fit-check.mjs`: only the `NYC Cup` route (about line 154), so it finds the renamed chip and the New York card, plus the screenshot line below.
- `style.css`: only if three cards do not fit the stage list. Use rules scoped to these cards.
- New `test/solo-cups.test.js`. Change existing tests only where a label or chip text intentionally changes. Say which ones in the report.

## Must not change
- **New York Cup identity:** record key `excuseme_cup_nyc:r4` and run identity `{ category: 'cup', rules: CUP_RULES }` with round seeds `seed + ':round' + n`. Saved NYC bests must still load. Do not bump `CUP_RULES`.
- New Cups get their own record keys, `excuseme_cup_tokyo:r4` and `excuseme_cup_airport:r4`. A Tokyo best never shows as, or replaces, a New York best.
- Points, XP, bot count, tie-breaks and `cupTable` ranking.
- Friend Cups, `friendcup.js`, `duel.js`, `PROTO`, Daily/Weekly/Challenge and the ordinary race list.

## Fairness
Every player in a city's Cup races the same stages in the same order, against 7 bots drawn the same way as the NYC Cup. One city's best is compared only with that city's bests.

## Done when
- From the menu, each of the three Cups plays 4 rounds in the listed order. It ends with the place and XP, and saves to its own key. A test covers this for Tokyo and Airport and shows that the NYC key is untouched.
- A test proves that the NYC Cup stage order, run identity and record key are the same as before.
- New tests failed first and now pass.
- No new fit problems on the `NYC Cup` route: run `node tools/fit-check.mjs` before and after, and report both counts. For screenshots, add one line to that route that saves the Cup card list at each size to `game/rounds/round-02/batch-25-evidence/`, like the existing `page.screenshot` calls near line 235.
- `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
Whether three Cup cards read clearly on a phone, and whether the new stages are fun as a 4-race run.
