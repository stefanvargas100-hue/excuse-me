# Round 02, batch 21: Tsukiji Outer Market and Skytree Sky Walk

**Builder:** Claude Sonnet 5.5, medium (Codex defaults if a Claude worker is already running). Why: clearly defined stage work; Sonnet built the Subway stage in one clean pass.
**Risk:** medium. It adds stages to shared lists, so existing modes must stay exactly as they are. Second review: no; lead reviews screenshots and diff.

## Goal
Two new Tokyo stages, completing a 4-race Tokyo Cup (Shibuya, Takeshita, Tsukiji, Skytree). Context: `game/rounds/round-02/complete-cups-plan.md`. Placeholder art is fine, but each must clearly read as its place and play differently from every other stage. Available wherever Takeshita is: Classic, Race vs bots, friend rooms and the Friend Cup Tokyo preset.

## Read first
- `game/areas/gameplay.md`
- `git show --stat a692504`: the Takeshita commit is the recipe for adding a stage. Copy its pattern and open only the parts you need.
- `src/config/levels.js` (Takeshita entry), `src/config/medals.js` (comment at top), `src/config/styles.js` (`STAGE_STYLE`, line 161)
- `src/render/takeshita.js` and `src/render/subway.js`: small stage painters
- `src/sim/people.js`: how `takeshita` and the subway `train` event hook in; `runEvent`
- `src/sim/game.js`: `dailyLevel`, `weeklyLevel` (lines 490-491, read only)
- `test/takeshita.test.js`, `test/subway.test.js`, `test/rotation-stage.test.js`
- `studio/skills/test-first/SKILL.md`

## The stages
| Item | Tsukiji Outer Market | Skytree Sky Walk |
|---|---|---|
| Index and id | 7, `tsukiji`, appended | 8, `skytree`, appended after it |
| City | Tokyo | Tokyo |
| Goal | about 420 m | about 600 m |
| Half-width | about 4, narrow market lane | about 8, wide walkway |
| Look | Stall awnings on both sides, crates, wet concrete | Glass wall on one side with city far below, rail on the other, bright day |
| Style | Map in `STAGE_STYLE` to an existing Tokyo recipe (`neonpop` or `noir`); no new recipe: the Director is redirecting visuals later | Same rule |
| Music | Existing Tokyo progression | Same |

## The main challenges
- **Tsukiji, carts and wet floor.** New event `cart`-like crossing (name it `turret`): a small delivery truck crosses the lane from one side, announced on the banner and visible before it enters. It blocks a band of the lane while crossing but always leaves a gap or passes before you arrive at normal speed. **Wet patches:** visible marked areas where lateral control is reduced (slower sideways acceleration and a short slide), never a stop. Patches apply identically to player and bots and never cover the full width.
- **Skytree, planning at speed.** Few obstacles but faster cruising crowd, and new event `viewpoint`: tourist groups gather at window spots on the glass side and spill partway across. They form far enough ahead to be seen early, so lane choice is a plan, not a reaction. Always leave a clear route.
- All randomness uses the same seeded functions the other events use. Waves spawn beyond `SPAWN_FAR` as all spawns do. Player, bots and crowd share the same `half`.

## Must stay fair
- Bots at Easy, Medium and Hard finish both stages; report median times.
- Events treat all racers alike and never target the player. No racer can be trapped: tests check a clear gap during a crossing truck, a viewpoint group and over wet patches.

## Medal times
Measure as the comment at the top of `src/config/medals.js` says: median bot finishes across 3 seeded races at 60 Hz. First guesses.

## Rotation, Cups and online
- Daily and Weekly stay capped at the first 5 stages: do not change `dailyLevel` or `weeklyLevel`. Test several current and future keys give the same stage before and after.
- Weekly Challenge keeps its stage list. Solo NYC Cup unchanged; no solo Tokyo Cup yet (batch 25).
- Friend Cup Tokyo preset must now be 4 races in `LEVELS` order. A simulated Tokyo Friend Cup with bots completes.
- Bump `PROTO` in `duel.js` by one from whatever it is on your base, so older phones get the update message.

## May edit
- `src/render/tsukiji.js`, `src/render/skytree.js` (new), `src/render/render.js`, `src/render/figures.js`, `src/render/weather.js`
- `src/config/levels.js`, `src/config/medals.js`, `src/config/colour.js`, `src/config/styles.js` (`STAGE_STYLE` entries only)
- `src/sim/people.js`, `src/audio/soundtrack.js`
- `src/sim/race.js` or `src/sim/game.js` only for the wet-patch lateral control hook, kept to a few lines; say where in the report
- `src/online/duel.js`: the `PROTO` value only
- `test/tsukiji.test.js`, `test/skytree.test.js` (new), and existing tests only where they assert the stage list, stage count or `PROTO`
- `game/rounds/round-02/reports/batch-21-tokyo-stages.md`, `game/rounds/round-02/batch-21-evidence/`

If it needs anything else, stop and report.

## Must not change
- Indexes, crowds and random sequences of stages 0-6 in every mode. Do not make other stages draw extra random numbers.
- `src/sim/cup.js`, `src/sim/friendcup.js`, `src/ui/friend*.js`. Side routes (`routes.js`, `side-routes.js`): none for these stages.
- Movement constants, build stats, pickups. Existing saves, records, ghosts. Live database, dependencies.

## Done when
- Tests failed first and now pass for: stage list and indexes; each event and its gap; wet-patch effect equal for player and bots and never full-width; staying inside `half`; medal lookup; rendering at several positions; unchanged Daily/Weekly rotation; Tokyo Friend Cup preset of 4 completing with bots.
- Classic and Race vs bots play through each stage in the test harness.
- Screenshots from the real game in a browser at 390x844 per stage: a quiet stretch, the main event, the finish. Save to `game/rounds/round-02/batch-21-evidence/`, look at them yourself and describe them in the report.
- `npm test`, `npm run build`, `npm run test:fit` and `git diff --check` pass. Report the fit summary line.

## Left for a person
Whether each stage is fun on a phone, medal fairness, smoothness on older phones.
