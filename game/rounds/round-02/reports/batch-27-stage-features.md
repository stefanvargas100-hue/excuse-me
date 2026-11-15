# Batch 27 report: stage features

```text
Outcome:     partial (blocked on one pinned test)
Branch:      stefanvargas100-hue/stage-features, commit in the worker_done message
Changed:     Tsukiji shoppers and porters, Skytree lift arrivals, Baggage carousel waiters, Gate Change pink boards; PROTO 14 -> 15
Checks:      batch27-features 13/13 (failed first), batch27-unchanged 1/1, 4 stage tests + hitboxes/scenery/medals 156/156, npm test 1053 pass / 1 fail / 2 todo (security.test.js pin, below), build ok, diff --check ok
Not checked: real phones; friend rooms on two phones; whether Tsukiji is too crowded and how each feature feels (emulated 390x844 shots only)
Off plan:    race.js shove() skips people marked steady (porters, lift passengers); MEDAL_TIMES left unchanged (see below)
Trouble:     fixture test first failed on -0 vs 0 in deepStrictEqual, not a real change; races start chunks at 14 m, so z0 % 36 never matched
```

## For the lead

**How each feature stays deterministic**
- Porters: one may start per 36 m (by chunk number), from the chunk's seeded stream. All walk exactly 1.0 m/s on a fixed lane, locked, and nothing pushes them. A porter made later is placed where it would have walked to by now (the walking time of a live porter, else the run clock), so they stay 36 m apart whatever the pace. Lanes x = -3.42, 0 +/-0.12 and 3.42 miss every wet patch (0.6 to 3.0 m either side) and leave at least 3 m clear on one side. Footprint 0.76 m wide, cart 0.4 to 1.62 m ahead.
- Lift: 6 to 8 passengers, 4.6 to 6.2 m apart, start hidden behind the exhibit wall and step out on a timer from the event (11 to 14 s, later further down the deck), cross at 1.25 m/s and stop at the glass. `S.lifts` holds where the renderer lights doors.
- Waiters: group k stands at 64 + 48k + 0..8 m (so 40 to 56 m apart), from `mulberry32(seed or Classic run key + k)`. Bag spill: before each bag lane is placed, `waiterClear` moves it 3.2 m past any group it would cross. Both sides compute the same group positions from the seed, so it holds whichever is generated first.
- Boards: `S.boardFlipUntil = S.time + longest settle`; `render/gatechange.js` reads it. A test shows the run is identical with and without it.

**Bots:** 4-bot races, seeds 1 to 20, all four stages, before and after: every bot finished, no bot moved under 1.5 m in any 6 s, at most 4 safety slip-throughs in any race (same as before). Files: `batch-27-evidence/bot-sweep-*.jsonl`.

**Medians (Easy/Medium/Hard, s), measured by the existing stage tests:**
- Tsukiji 144.1/120.6/87.0 -> 149.5/112.2/92.6 (+3.7/-7.0/+6.4%)
- Skytree 188.8/157.2/123.6 -> 188.0/152.5/122.0 (-0.4/-2.9/-1.3%)
- Baggage 133.7/111.8/97.3 -> 133.4/119.1/93.0 (-0.2/+6.5/-4.4%)
- Gate Change 170.0/144.9/119.6, unchanged

The 20-seed sweep gives different signs for the same stages (Baggage Medium -4.6%, Tsukiji Easy +5.9%, Skytree Easy -5.0%), so I read the moves as noise from the reshuffled crowd and did not change `MEDAL_TIMES`. Tsukiji's current targets (151/113/92) already sit within 1% of its new medians. Lead to decide.

**Records:** these four stages have no route tag, so they use race best `excuseme_race_best_<id>`, board `race:<id>_r2`, race ghost `excuseme_ghost_race_<id>`; Classic `excuseme_best_<id>:cm3` and ghost `excuseme_ghost_<id>:cm3`; Daily/Weekly `<period>:mp3`. All four now have more or different people (Gate Change only if a seeded run's crowd differs: it does not, the boards are drawing only). Old Tsukiji, Skytree and Baggage records are not strictly comparable; Gate Change records are. No identity changed.

**PROTO 14 -> 15:** Tsukiji and Baggage chunks now hold different people, so a host and a guest on different builds would see different crowds.

**Friend rooms:** shoppers, porters and waiters come from chunks and appear in friend rooms. The lift and the gate change are events, and events never run in friend rooms today (`!S.duel` in `sim/game.js`), so they do not appear there; changing that is outside this batch.

**Blocked: an existing test pins Tsukiji and Skytree.** `test/security.test.js` "stages 0-8 keep their crowds..." hashes stages 0 to 8 on the batch-23 base. Stages 0 to 6 still match. Stage 7 (Tsukiji) is now `debb45594185` (was `a3179a0bf731`) and stage 8 (Skytree) `0c801ed00909` (was `0aa81b43bfba`), as this batch intends. The plan forbids editing that test, so it is left failing for the lead: either update those two hashes or limit the loop to stages 0 to 6 (the batch-27 fixture now covers the unchanged stages, Security included).

**Found, not fixed:** Tsukiji wet patches use `z0 % 32 === 16`, but races and Classic start chunks at 14 m (14, 18, 22...), so no wet patch ever appears in a real run. Tests pass because they generate chunks from 0. The fix is in `people.js` but changes Tsukiji's layout again, so it needs its own decision.

Evidence: `batch-27-evidence/` holds the fixture script and output, the sweep script and results, medians, and five screenshots from `feature-shots.mjs` (emulated 390x844 at 2x, not a phone).
