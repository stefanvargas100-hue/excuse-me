# Build balance proposal — cap follow-up, approval only

**Recommend treatment A for the next controlled phone trial, with original build rows; do not implement tuning yet.** It restores an uncapped build-speed distinction for every enumerated same-gear/body comparison. It does not establish competitive balance or resolve the Director's overall complaint. Withdraw the earlier +4/-3/-1 recommendation: it retains capped-loadout weakness and lowers measured burst averages. Treatment B is a narrower alternative, but still allows role collapse. Director approval is required before any production change.

## Definitions and scope

Original build points (speed/acceleration/recovery): small -3/+4/-1, medium 0/0/0, large +3/-4/+1. Original total caps are +/-10 in each stat. Let N be the sum of body, gear and the real fit bonus, excluding build. Fit is derived from gear only, applied once to every stat; body and fit are INSIDE the cap in both experiments.

- Current: speed = clamp(N.speed + build.speed, 10).
- Earlier candidate: large +4/-3/-1; all other values and caps current.
- A: speed = clamp(N.speed, 10) + original build.speed. Only speed gets the build outside the cap; acceleration/recovery still clamp the original combined sums at 10.
- B: speed = clamp(N.speed + original build.speed, 13). Acceleration/recovery unchanged.

No body, gear, fit, race pace, collision radius, medal or compatibility ID changed. Actual ticks use these effective points in S.moveStats; production source remains untouched. The analytical helper applies no build contribution twice. Unknown/cosmetic combinations are not part of the enumeration.

## Exact evidence

Baseline source 2b66b8b; initial study commit ef9bfbb. Original [36-row measurements](batch-16-evidence/measurements.json) and table remain unchanged. New [72-row measurements and enumeration](batch-16b-evidence/measurements.json), [complete table](batch-16b-evidence/table.md), and [verification](batch-16b-evidence/verification.json) include current, candidate, A and B for all three builds, both bodies, and plain/speed/responsive kits. Repeat with `node game/rounds/round-02/batch-16b-evidence/reproduce.cjs`; it runs the tool twice, checks exact output equality, verifies all 36 historical rows exactly, and checks unchanged non-speed stats/timings in all 36 A/B rows. Seed 42, dt 1/60, bounded 60s open and 120s burst cases. Reproduction took about 15s locally; no unbounded idle work.

Plain = tee/jeans/sneakers/cap/pack. Speed = suit/joggers/runners/cap/pack. Responsive = tank/shorts/slides/cap/pack. Synthetic isolated setup: level-0 Classic ground, actual movement ticks and burst actions, speed initially zero, energy 100, chain zero; crowd, pickups, dynamic spawns absent and time-left extended. Positions reset only between cases. Race and Classic share these stat effects; strips, belts, routes, drafting, combo, powerups and complete-race traffic performance are excluded. Bump starts at cruise, applies the real bump timer and cancels boosts/chain; collision contact/hit-stop are not tested. Time/distance to 95% cruise includes the slowdown interval. Steering holds right until 90% lateral maximum. Refill starts at zero, measures 0–100. Burst policy triggers actual burst when previous expired and energy >=70, so expenditure bottoms near 40 and avoids low-energy pace penalties; no dash spending or optimal-policy claim.

Focused command `node --test test/build-balance.test.js`: 3/3 pass. Known medium-male first tick is .1771 m/s, discrete t90 .650s, cruise 3.036 m/s; refill checks against 100/(9*.92) within a tick. The cap test failed against the placeholder at speed 10 versus expected 13, then passed after implementation. One test expectation was corrected from 8 to 10 for small/B with a fedora: non-build speed is 13 including +2 fit, rather than the mistakenly hand-counted 11. This corrects arithmetic, not a relaxed tolerance. Enumeration validates analytical current values and cap-inactive A/B values against actual statsOf in 1,412,718 checks. No full gameplay suite/build required by this measurement-only brief; no browser or real-phone evidence. `git diff --check` passes.

## Comparative mechanics

Male body below; full female and responsive-kit data are linked above. Speed kit is capped under current rules; plain is uncapped. Distances are meters at 2s/60s, burst mean is over 120s. A/B keep each row's acceleration/recovery and steering/refill/burst duty unchanged; only distances and speeds change. At cruise, target and actual match within numerical precision. All options retain the start advantage of plain small and the slower steering of large.

| Option | Kit/build | Cruise m/s | Distance 2s / 60s | Burst mean m/s |
|---|---|---|---|---|
| All | plain small | 2.982 | 5.304 / 178.260 | 3.546 |
| All | plain medium | 3.036 | 5.256 / 181.343 | 3.609 |
| Current, A, B | plain large | 3.090 | 5.131 / 184.348 | 3.658 |
| Candidate | plain large | 3.108 | 5.225 / 185.487 | 3.647 |
| Current/candidate | speed small | 3.144 | 5.559 / 187.911 | 3.704 |
| Current/candidate | speed medium | 3.180 | 5.458 / 189.897 | 3.729 |
| Current | speed large | 3.180 | 5.207 / 189.642 | 3.709 |
| Candidate | speed large | 3.180 | 5.281 / 189.717 | 3.693 |
| A | speed small | 3.126 | 5.528 / 186.835 | 3.683 |
| A | speed medium | 3.180 | 5.458 / 189.897 | 3.729 |
| A | speed large | 3.234 | 5.295 / 192.862 | 3.772 |
| B | speed small | 3.144 | 5.559 / 187.911 | 3.704 |
| B | speed medium | 3.198 | 5.488 / 190.971 | 3.750 |
| B | speed large | 3.234 | 5.295 / 192.862 | 3.772 |

For plain small/medium/large, current and A/B t90=.533/.650/.817s; t99=1.067/1.283/1.617s. Steering90=.283/.317/.367s; refill=12.633/12.083/11.583s. Bump95=2.000/2.083/2.250s, traveling 3.028/3.315/3.816m. Burst duties=.247/.256/.266. These persist with A/B: neither helps large in an uncapped plain loadout. Speed-kit large A/B gains .054 m/s cruise, 3.220m at 60s and .063 m/s burst mean over current, but still loses 2s distance to medium. Its bump95 remains 2.367s and recovery distance scales from 4.102 to 4.172m (distance traveled, not lost distance). The full output records exact values rather than assuming more cruise makes recovery faster. Large remains slower to regain speed; no crowd-contact advantage was added.

## Exhaustive stat-role check

All 87,120 valid five-slot combinations times two bodies = 174,240 same-gear/body tuples, each evaluated for three builds: 522,720 loadouts per option. Colors/head visibility do not affect stats. These are design-space counts, NOT player usage frequencies. A cap application means an input strictly outside its boundary (values exactly at boundary separately counted in JSON). A tests N against 10; current/candidate test total against 10; B tests total against 13.

| Option | Cap applications / 522,720 | Large=medium speed AND slower acceleration / 174,240 | Small=medium / small=large | Speed point ranges small; medium; large |
|---|---|---|---|---|
| Current | 22,901 | 6,100 (3.50%) | 1,353 / 1,346 | [-10,10]; [-10,10]; [-7,10] |
| Candidate | 29,772 | 6,100 (3.50%) | 1,353 / 1,346 | [-10,10]; [-10,10]; [-6,10] |
| A | 13,155 | 0 | 0 / 0 | [-13,7]; [-10,10]; [-7,13] |
| B | 4,972 | 1,346 (0.77%) | 30 / 30 | [-13,13]; [-10,13]; [-7,13] |

Worst-case actual flat cruise range = 3*(1+.006*points): A small 2.766–3.126, medium 2.820–3.180, large 2.874–3.234 m/s. B small 2.766–3.234, medium 2.820–3.234, large 2.874–3.234. Current small/medium 2.820–3.180 and large 2.874–3.180. These extrema can have different gear; cross-gear range overlap is not same-gear role collapse.

Across the enumeration A lowers small speed versus current in 4,814 tuples (2.76%), raises large in 17,502 (10.04%), and leaves medium unchanged everywhere. Its guaranteed same-gear +3-point gaps cost small some former ability to offset its speed penalty using high-speed gear; it also exposes small's -13 extreme with slow gear. B raises small in 585, lowers small in 429, raises medium in 4,385 and raises large in 17,502; others unchanged. B's wider cap exposes both positive and negative extremes, so it is not simply a buff. Candidate raises large cruise in 149,867 tuples but leaves 24,373 unchanged; its reduced recovery also makes its plain and speed-kit burst averages worse in this policy. Neither A nor B changes acceleration/recovery, so cap restoration alone cannot establish overall fairness.

## Recommendation and remaining decision

A meets the narrow sustained-speed-role goal under all same-gear/body combinations; B reduces but cannot remove cap-driven role collapse, and the earlier candidate does not address it. Prefer A as a trial design with original build rows rather than combining experiments. Its small nerf and greater effective speed range need explicit approval and testing. Small retains higher acceleration and steering, medium retains the middle cruise/response tradeoff, and large retains slower starts/steering and a modest recovery advantage. These mechanical distinctions are not proof of no universal winner on actual courses. If the Director prefers minimal disruption over guaranteed same-gear roles, B is the conservative alternative with its 1,346 residual tied pairs disclosed. Neither should ship from this study alone.

Practical human gate: first test the male speed kit on two real phones with two competent players, counterbalancing current and A, three repetitions per build. Time a 20m start and 200m open run; then repeat with standardized bump intervals (e.g. every 5s), then the same >=70 burst policy. Log splits, bumps, burst counts, energy lows and failures; check large gains long cruise without taking every short/bumpy task, and small's lost speed-kit performance is acceptable. Repeat plain kit and female speed kit before broader validation. Only then compare crowded main routes and Subway main/mezzanine using physically applied steering, recorded seeds 4/8/42, paired within-player trials; retain failed runs. No controller or complete-race claims here. Browser emulation cannot replace phone feel.

Future implementation affects race players/bots and shared Classic/Daily/Weekly movement, plus applicable Practice/Challenge/Cup/Friend Cup/elimination loadouts. Preserve saves and split incompatible competitive results: Classic cm2 records/ghosts/boards, Daily/Weekly mp2 identities and period boards, race recordKey/courseTag bests and ghosts, and race boards currently race:<stage> without a rules suffix. Incrementing RULES_VERSION=1 alone does not isolate standard results: recordKey still maps current standard rules to unsuffixed keys. Design explicit separate new keys while retaining old records; align ghost and leaderboard read/write paths. Check fixed-outfit Challenge identity/rules if affected. Nonstandard modes suppress ordinary records per run policy but still need compatible multiplayer rules. Medal calibration, competitive sign-off and release remain delayed pending Director decision, compatibility implementation and human checks. No IDs or medal targets changed here.
