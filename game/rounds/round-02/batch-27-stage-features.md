# Round 02, batch 27: stage features for Tsukiji, Skytree, Baggage and Gate Change

**Builder:** Claude Opus 5.5, high. Why: crowd changes in the simulation that affect seeded runs, bots, friend rooms and records.
**Risk:** high. Second review: yes, by a fresh Claude Sonnet worker before merge.

## Goal
Four stages each get one or two crowd features that their new scenery explains, so they play like their own places and not like a plain corridor. The design is in `game/rounds/round-02/stage-worlds.md`. Security Lanes is not part of this batch.

## Read first
- `game/areas/gameplay.md` and `game/rounds/round-02/stage-worlds.md`
- `src/sim/people.js`: the per-stage `pool` lists (about lines 150-175), the crowd kinds below them (`case 'shopper'` is the model for a new kind), `runEvent` (`bagspill`, `tour`, `viewpoint` and `queue` are the models for placement and banners), and `genChunk`
- `src/config/levels.js`: the `events` lists of `tsukiji`, `skytree`, `baggage` and `gatechange`
- `src/sim/race.js`: how bots steer round people and props
- `src/render/tsukiji.js`, `skytree.js`, `baggage.js`, `gatechange.js`, and the sharpness rules at the top of `src/render/style.js`
- `test/tsukiji.test.js`, `test/baggage.test.js`, `test/gatechange.test.js`, `test/medals.test.js`

## Build
1. **Tsukiji, shoppers.** Add the existing `shopper` kind to Tsukiji's pool, so about a third of its crowd stops at the stalls. No new behaviour.
2. **Tsukiji, porters.** A new crowd kind: a porter walks your way at about 1.0 m/s pushing a hand cart, so you overtake a slow, long obstacle.
   - Footprint: the porter and the cart ahead of them, at most 0.9 m wide.
   - At most one per 30 m of alley, never on a wet patch, and always with at least 1.9 m clear on one side (the gap the `queue` event already guarantees).
   - Draw the cart in `src/render/figures.js` in the stage's colours (wood and ice crates, as on the stall counters).
3. **Skytree, lift arrival.** A new event `lift`: 6 to 8 people leave the exhibit wall on the left and cross the deck to the windows on the right, then stand there as viewers.
   - They cross one at a time, 4.6 m or more apart front to back (the spacing `bagspill` uses), so there is always a gap.
   - Announce it with a banner, and draw lit lift doors on the exhibit wall in `src/render/skytree.js` where they come out.
   - Add it to Skytree's `events`.
4. **Baggage, people waiting at the carousel.** Groups of 3 to 5 people stand along the carousel kerb (within 1.6 m of the left edge), every 40 to 60 m, placed from the chunk position and seed.
   - A bag spill must never slide through a waiting group. Solve it in a way that stays deterministic, and say how.
5. **Gate Change, boards flip.** While a `gatechange` crowd is turning, the departure boards on the right wall turn pink and read "GATE CHANGE".
   - Add a small timer on `S` set by the event. `src/render/gatechange.js` reads it. Do not parse the banner text.
   - This item is drawing only and must not change any run.

## Must keep fair
- Every feature comes from the seeded stream or the chunk position. Nothing looks at where a racer is, except the distance-ahead placement that existing events already use.
- Solo runs, bot races and friend rooms all get the features. In a friend room the host and every guest must see the same crowd, as today.
- Bots must get through every feature without getting stuck. A bot must not gain or lose more than a human would.
- The other 8 stages must not change at all: the same seed gives exactly the same people.

## May edit
- `src/sim/people.js`
- `src/config/levels.js`: the `events` lists of the four stages only
- `src/sim/race.js`: only if bots need help with a new feature
- `src/render/figures.js`, `src/render/skytree.js`, `src/render/gatechange.js`
- `src/config/medals.js`: only as described under "Done when"
- `src/online/duel.js`: `PROTO` only (see below)
- `src/main.js`: only to add names to the `window.__excuse` debug list, if your capture script needs them
- Tests for these four stages, new tests, your capture script, and `game/rounds/round-02/batch-27-evidence/`
- Report: `game/rounds/round-02/reports/batch-27-stage-features.md`

## Must not change
- Security Lanes, and the crowd on any stage not named here.
- The scenery painters' look, `src/render/style.js`, `src/config/styles.js`, `src/render/weather.js`.
- `SEEDED_RULES`, `CLASSIC_RULES` and the Cup record keys. See "Records" below.
- Existing tests outside the four stage test files. If one pins a value you must change, stop and report it.

## Records and online version
- These features change seeded daily and weekly runs and the stage records on four stages. Do not change any record identity yourself. In the report, state which record identities each changed stage uses and whether old records stay comparable, so the lead can take it to the Director.
- If a host and a guest on different builds would now see different crowds, raise `PROTO` from 14 to 15 and say so. If not, explain why not.

## Done when
- Each feature has a test that failed first and now passes, including the spacing and gap limits above.
- A committed script records the people of one fixed seed on each of the 8 unchanged stages. Run it on `develop` before your change, commit the output as a fixture in `batch-27-evidence/`, and a test compares your branch against it.
- Bot races of 4 on each changed stage finish for seeds 1 to 20 with no bot stuck.
- Median bot finish times before and after are in the report, measured the way `test/baggage.test.js` and `test/gatechange.test.js` already log them. Change `MEDAL_TIMES` for a stage only if its medians moved by more than 3%, and give the numbers.
- Screenshots of each feature on screen in an emulated 390x844 phone, in `batch-27-evidence/`. Write a small capture script modelled on `tools/style-shots.mjs`.
- `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
- Whether Tsukiji is now too crowded for an 8 m alley, and how each feature feels on a phone.
- Friend rooms on two real phones.
