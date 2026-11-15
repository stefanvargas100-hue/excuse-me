# Batch 27 report: stage features (with 27c: wet patches, porter notch; 27f: the crowd steers round porters' carts)

```text
Outcome:     done
Branch:      stefanvargas100-hue/stage-features, commit in the worker_done message
Changed:     Tsukiji shoppers, porters (crowd steers round the cart) and wet patches; Skytree lifts; Baggage waiters; Gate Change boards; PROTO 15
Checks:      27f: 3 new tests failed first, now pass; porters touched 92/122 -> 0/112; npm test 1062 pass / 0 fail / 2 todo; build ok; diff --check ok
Not checked: real phones; friend rooms on two phones; how Tsukiji feels with patches, porters and shoppers together (emulated 390x844 shots only)
Off plan:    security.test.js stage 7-8 hashes (27b, 27c); race.js shove() skips steady people; cart handles; 2 Tsukiji slip-throughs (ruling 27f)
Trouble:     27f: overlaps came from 4 causes, found one trace at a time (side drift, kerb side, Excuse me, cart behind); remaining grazes needed a push-out
```

## For the lead

**Batch 27f: the crowd steers round porters' carts (review 27e, finding S1).** All in `src/sim/crowd.js` (porters only; every branch needs a porter, so other stages are untouched) and `src/sim/people.js`.
- Avoidance treats a porter as its body and cart: people steer round the nearest point of its length, as wide as the cart (0.38 m), even when it is beside or just behind them. Beside a kerb-lane porter they always go round the open side (0.6 m between cart and kerb is too narrow for anyone).
- An Excuse me never steps someone into a cart. Someone standing (a shopper stopped at a stall) steps aside toward the open side when a cart is about to reach them: that is how stopped shoppers in a porter's lane are handled.
- After everyone has moved each tick, anyone still touching a cart is moved sideways just clear of it (sideways only; open side by the kerb). This removes the last 1 to 7 cm grazes.
- Nobody is created touching a porter, and a new porter never lands on anyone: they are moved sideways clear. This always happens beyond the newest chunk, off screen, and reads no random numbers.
- `batch-27-evidence/porter-overlap.js`, seeds 1-20, 4-bot races, porters on screen: before 92 of 122 touched, 315 people, 11 created on top, 7 stopped shoppers; after 0 of 112, 0, 0, 0 (`porter-overlap-before.json`, `-after.json`). Widest free stretch across the alley beside a porter, counting the porter and the people stepping round it: smallest 2.16 m after (2.23 before). Counting everyone in the alley there it can be 0.66 m (0.72 before): any dense row of walkers does that, porter or not.
- Porters keep their place, line and exactly 1.0 m/s; the reviewer's and my porter tests pass unedited. **Stage 7 hash unchanged:** in the hash test's 500 ticks the new code never acts: the closest anyone comes to a porter is 1.28 m (Classic) and 11.28 m (race), outside every porter rule.
- **Bots:** Tsukiji seeds 1-20, every bot finishes, none stuck, 2 slip-throughs (accepted, ruling 27f). Seed 12 is the earlier one (wet patch and delivery truck). Seed 4, t 104.2 s, z 352.5: no porter within 17.2 m; a walker jammed at the kerb (x 3.65) with sideways speed 3.67 m/s from a bot's repeated bumps pins the bot. Reproduce: `node game/rounds/round-02/batch-27-evidence/bot-sweep.js tsukiji` (seed 4 row, slips).
- **S4, two sideways nudges left as they are (ruling 27f):** someone at the kerb just ahead of a kerb-lane cart is moved 0.3 to 0.5 m in one 1/30 s tick: seed 19, t 24.8 s, z 74.6 (a walker); seed 13, t 108.2 s, z 338.0 (a shopper stopped at the kerb). `porter-overlap.js` counts them as jumps (0 before).
- **Medians**, Tsukiji vs develop: stage test 144.6/121.3/93.2 (+0.3/+0.6/+7.1%), sweep 146.9/116.9/94.3 (+3.9/+0.2/+0.9%). No medal moves the same way by more than 3% in both: `MEDAL_TIMES` unchanged. PROTO stays 15.

**Batch 27c: wet patches.** `people.js` placed a patch when `z0 % 32 === 16`, but real runs build chunks from 14 m, so no patch ever appeared. Patches are now placed by chunk number (`Math.floor(z0 / 4) % 8 === 4`), one per 32 m; side, size and place in the chunk are unchanged. A new test in `tsukiji.test.js` walks a real race and a real Classic run and fails on the old rule ("race: 0 patches"). The Tsukiji tests and `batch27-features.test.js` now build the course from 14 m as real runs do, and the porter tests assert they met real patches. Porters needed no change for patches: their lanes miss both patch sides.

**Porter notch (ruling 27c).** The corrected sweep showed 4 real slip-throughs on Tsukiji, all bots wedged between a porter's body circle and its cart circle. `porterCircles` now has a push-bar circle `{ox 0, oz 0.4, r 0.32}` (footprint still 0.76 m wide), and `drawCart` draws handles and a push bar back to the porter's hands over it. Test first: a racer beside the porter's body, drifting into it, was held in the gap on the old shape (blocked up to 0.85 s, still there after 3 s) and is turned aside on the new one.

**Slip-throughs, counted correctly.** The batch-27 sweep also counted Clear power-ups, which set the same `ghostT`. `bot-sweep.js` now counts only the stuck rule (`ghostT` = 0.8). 4-bot races, seeds 1 to 20, develop -> this branch: every bot finished, none stuck (worst 6 s stretch 5.96 m).
- Tsukiji 0 -> 1 (4 before the notch fix). The one left: seed 12, t 122.1 s, z 373, an Easy bot on a wet patch (grip 0.22) held for 1.8 s against the crossing delivery truck (`turret` event). Not porter shape, so per the ruling not fixed and nothing tuned.
- Skytree 0 -> 0. Baggage 1 (seed 18) -> 2 (seed 6, one each for two bots). Gate Change 0 -> 0.
Files: `batch-27-evidence/bot-sweep-develop.jsonl`, `bot-sweep-final.jsonl`.

**Medians (Easy/Medium/Hard, s), develop -> this branch.**
- Tsukiji, stage test: 144.1/120.6/87.0 -> 138.8/117.9/94.2 (-3.6/-2.2/+8.3%). Sweep: 141.4/116.7/93.5 -> 149.8/117.5/95.9 (+5.9/+0.7/+2.6%). No medal moves the same way by more than 3% in both, so Tsukiji's `MEDAL_TIMES` stay 151/113/92.
- Skytree, stage test 188.8/157.2/123.6 -> 188.0/152.5/122.0; sweep 190.9/152.8/124.1 -> 181.3/151.1/123.5.
- Baggage, stage test 133.7/111.8/97.3 -> 133.4/119.1/93.0; sweep 142.5/119.3/97.3 -> 133.4/113.8/95.1.
- Gate Change unchanged (170.0/144.9/119.6; sweep 178.8/145.0/120.8). Other three stages' targets left alone.

**Wet patch on screen** (`tsukiji-wetpatch.jpg`, emulated phone). Easy to see: a flat light-teal slab with a yellow front edge. Two things look wrong. It reads as a mat or tile, not wet concrete (no sheen). And it is drawn as one object sorted at its centre, so it paints over anyone standing in its far half: in `tsukiji-porter.jpg` the player and a walker on a patch have their legs, ring and Excuse Me bar under the teal. Not repainted, as the brief says; it needs a drawing fix in `figures.js` (`wetpatch`).

**How the batch-27 features stay deterministic**
- Porters: one may start per 36 m (by chunk number), from the chunk's seeded stream, all at exactly 1.0 m/s on a fixed lane, never pushed. A porter made later is placed where it would have walked to by now, so they stay 36 m apart whatever the pace. Lanes x = -3.42, 0 +/-0.12, 3.42.
- Lift: 6 to 8 passengers, 4.6 to 6.2 m apart, step out of the wall on a timer (11 to 14 s after the event), cross at 1.25 m/s, stop at the glass.
- Waiters: group k at 64 + 48k + 0..8 m from the seed; a bag spill moves any lane 3.2 m past a group, whichever is generated first.
- Boards: `S.boardFlipUntil`, drawing only; a test shows the run is identical without it.

**Records.** No route tags on these stages: race best `excuseme_race_best_<id>`, board `race:<id>_r2`, race ghost `excuseme_ghost_race_<id>`; Classic `excuseme_best_<id>:cm3`; Daily/Weekly `<period>:mp3`. Old Tsukiji, Skytree and Baggage records are not strictly comparable (Tsukiji now has wet patches too); Gate Change records are. No identity changed. **PROTO 14 -> 15**: Tsukiji and Baggage crowds differ between builds.

**Pinned test.** `test/security.test.js` pins all nine stages; 0 to 6 match the batch-23 hashes unedited. Stage 8 re-taken on batch 27 (`0c801ed00909`), stage 7 on 27c (`a5791f068ab5`); the porter notch fix did not move it.

**Friend rooms.** Shoppers, porters, waiters and wet patches come from chunks and appear there; the lift and the boards do not (events never run in friend rooms; Director accepts this for now).

Evidence: `batch-27-evidence/` (fixture of the 8 unchanged stages, sweep script and results, medians, six screenshots from `feature-shots.mjs`, emulated 390x844 at 2x, not a phone).
