# Director-requested native bot cap trial

Reproduce from the repository root with `node tools/build-bot-trial.cjs`, then `node game/rounds/round-02/batch-17a-evidence/summarize-bots.cjs`. Raw results are `bot-results.json`; all per-case losses, unfinished runners and paired deltas remain in `bot-summary.json`. This supplements, and does not replace, the isolated Classic evidence.

Protocol: production `tick(1/30)` on Fifth Avenue (1), Subway (5), Takeshita (6); fixed seeds 1/4/8/42/73 and fixed harness date. 180 controlled races = three courses x five seeds x two kits x three rotations x legacy/A. Each race has three native bots, one small/medium/large with identical male body and same plain or capped-speed gear. Rotate builds through all three native grid slots, preserving slot-specific starting positions, native pace, skill and controller random stream within each pair. 30 additional normal random-outfit races retain the native random field/body/gear (reconstructing shades from its visible face before checking original cached stats). Six additional 20-second contact trials add actual collidable pedestrians on the current bot coordinates: one cross-floor probe and two same-floor probes. Normal crowds are never cleared. The bots keep native steering, bursts, dashes, shout, collision resolution, pickups, drafting, pace, routes, spawning, recovery and energy.

The formula is varied only by overriding cached `race.me` and each bot's `st` before countdown, from the independent historical combined-cap reference or approved A; A is asserted equal to production `statsOf`. This avoids editing production AI or game files. Controlled visual gear/build fields are overwritten after native creation; collision radius is fixed for all builds (`applyBuild` only changes drawing height/breadth/head visibility), so render-only body dimensions are not a measured physical advantage. The physical player uses the paired kit/build with no steering/actions, solely as a normal in-world reference; this is NOT a player skill or bot-controlled-player comparison.

Native Hard pace multipliers are 0.98/1.02/1.06 by slot, with miss .01, dash 1, burst .6, fight 1, excuse 2, detour .3. There is no extra trial catch-up multiplier. Native draft pressure can change steering. The same grid rotations balance build allocation to these unequal pace/skill slots, but five seeds do not establish general competitive fairness. Treatment trajectories change AI/crowd/random-call ordering, so paired finish deltas include these interactions rather than isolating a pure speed coefficient.

Stop conditions: all bots finished, physical player finishes (remaining field explicitly censored as timeout), or 600 simulation seconds (20 in forced-contact cases). Native placements rank only the three bots; unfinished placements rank remaining distance and are not finish places. Finish-time deltas use only pairs where the corresponding bot finished both runs; unfinished runners remain in denominators and raw rows. The physical player is a reference, can remain unfinished when all bots finish, and is not included in bot completion rates.

Instrumentation: bumps are production `b.bumps`; recovery burden is accumulated live ticks with `b.bumpT > 0`, not estimated distance lost or full time-to-cruise. Burst/dash usage counts observed off-to-on timer transitions (including truncated bursts); an expiry and immediate retrigger within the same tick can be missed, so these are observed episodes rather than an exact action log; routeSeconds counts known main/mezzanine/back-alley floor ticks and records native route/side-choice maps. Every sampled bot position, speed, velocity and energy must be finite; any unknown/cross-course bot route aborts the experiment. Cross-floor collision probes retain the same geometry but a different route label, so route matching excludes contact. Crowd can still cause unrelated bumps during such a probe; those are retained, not subtracted. No networking or database calls are enabled in the headless harness.

Tests first: the placeholder failed cache/population, repeated-contact/isolation and populated-repeat assertions; the implemented harness passes. The VM returns arrays from another realm, so serialization normalizes raw records before strict comparisons (no numeric tolerance was relaxed). Representative A speed-kit full races repeat exactly once per course; the bounded test also repeats Takeshita. Exact paired legacy/A baseline positions/outfit/pace equality is checked by the summary script.

No real-phone handling, browser rendering, optimal human steering, medal recalibration, or overall balance approval is claimed. Compatibility isolation/UI normalization, independent review and integration approval remain required before publication and the separate real-phone trial.

## Observed results

All 630 native bots in 210 ordinary races finished: 540 controlled and 90 random-outfit bot attempts, with no ordinary timeout or player-finish censoring. All 18 bots in six deliberate 20-second contact cases timed out as designed; these runs are retained separately and excluded from finish-time comparisons. All 135 plain-kit paired bot records (45 races per treatment) matched exactly, including finish time, placement, collisions, burst observations and routes. Three complete controlled A speed races and three complete random-field A races (seed 42, one per course) repeated exactly. The full suite is 825/825 passing; build and diff checks passed.

Controlled speed-kit results below have 15 complete pairs per row (five seeds x three slot rotations). Positive delta means A took longer; rank histograms count first/second/third among native bots only.

| Course | Build | Mean legacy / A finish s | Mean paired delta s | Faster / slower under A | Legacy ranks 1/2/3 | A ranks 1/2/3 | Mean bumps legacy / A |
|---|---|---|---|---|---|---|---|
| Fifth Avenue | small | 133.59 / 136.74 | 3.15 | 8 / 7 | 6/7/2 | 6/4/5 | 7.27 / 9.13 |
| Fifth Avenue | medium | 136.88 / 136.37 | -0.51 | 8 / 7 | 5/3/7 | 6/4/5 | 8.93 / 9.53 |
| Fifth Avenue | large | 137.71 / 138.81 | 1.10 | 7 / 8 | 4/5/6 | 3/7/5 | 8.00 / 10.07 |
| Subway | small | 99.09 / 99.85 | 0.76 | 9 / 6 | 5/6/4 | 4/3/8 | 1.80 / 2.07 |
| Subway | medium | 96.57 / 95.98 | -0.60 | 10 / 5 | 7/3/5 | 7/5/3 | 2.87 / 1.93 |
| Subway | large | 99.00 / 98.30 | -0.70 | 8 / 7 | 3/6/6 | 4/7/4 | 2.80 / 3.00 |
| Takeshita | small | 91.81 / 93.01 | 1.20 | 6 / 9 | 5/2/8 | 4/4/7 | 5.47 / 3.73 |
| Takeshita | medium | 89.90 / 92.78 | 2.88 | 4 / 11 | 7/4/4 | 5/5/5 | 3.67 / 4.53 |
| Takeshita | large | 91.76 / 91.74 | -0.02 | 7 / 8 | 3/9/3 | 6/6/3 | 4.40 / 4.47 |

Forced contacts: every bot registered at least 2 production bumps; minimum recorded slowdown exposure was 2.80s. Cross-floor probe frame bump increments totaled 0. Same-floor contacts were resolved by production geometry, without manually setting bump timers.

The restored top-speed distinction does not guarantee a crowded finish improvement: large averaged +1.10s on Fifth Avenue, -0.70s on Subway and -0.02s on Takeshita, with slower individual large runs on every course. Small averaged slower on all three courses (+3.15/+0.76/+1.20s), while still beating its own legacy run in some seeds/slots. Medium stats are unchanged, yet its results shift because opponents, encounters and random-call order change. These are native-controller interactions, not evidence that medium physics changed or proof of human balance.

In random-outfit races all 45 native bots per treatment finished. Legacy/A recorded 263/215 bumps and 1150/1102 observed burst episodes; varied gear/body and chaotic traffic prevent attributing these totals to a universal build advantage. Detailed finish distributions, slowdown exposure, burst observations and route times are preserved in bot-summary.json and every raw row. Large does not win every race; no production AI or tuning was changed to force a result. Normal-row kit labels describe the idle player kit, while the bots retain their random look objects.
