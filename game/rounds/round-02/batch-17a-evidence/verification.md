# Active treatment A verification

Seed 42, dt 1/60; isolated level-0 Classic ticks, 60s open/120s burst policy >=70 energy. Reproduce with `node game/rounds/round-02/batch-17a-evidence/reproduce.cjs`. Measurements are new active-production runs, checked exactly against historical analytical A; historical evidence files are unchanged.

522,720 loadouts: active stats equal independent A reference; acceleration/recovery exactly match legacy for every loadout; medium and uncapped cases unchanged; strict small < medium < large for all 174,240 same-gear/body tuples. Small decreases in 4,814 tuples (2.76%), large increases in 17,502. Small/medium/large extrema are [-13,7]/[-10,10]/[-7,13], so small can fall to 2.766 m/s. Counts describe design space, not usage.

| Male speed kit | Cruise m/s | 2s / 60s m | Burst duty / mean m/s | Steering90 / refill s | Post-bump95 s / m |
|---|---|---|---|---|---|
| small | 3.126 | 5.528 / 186.835 | 0.236 / 3.683 | 0.283 / 13.900 | 2.083 / 3.270 |
| medium | 3.180 | 5.458 / 189.897 | 0.239 / 3.729 | 0.333 / 13.233 | 2.200 / 3.662 |
| large | 3.234 | 5.295 / 192.862 | 0.247 / 3.772 | 0.367 / 12.633 | 2.367 / 4.172 |

All 18 active plain/speed/responsive x body x build rows match historical A exactly, including first tick, short/long distance, burst duty/average, steering/refill, and post-bump metrics. Repeated production runs are identical. Legacy analytical current/candidate/A/B rows remain reproducible; current means the historical pre-trial baseline in the tool, active means production.

Three new regression tests failed before implementation (speed cap 10 vs 13 and reference mismatches), then all 21 focused stats/build tests passed. No phone, browser, overall competitive balance, medal calibration or human-controller claims. The later Director addendum adds native populated races and real collision geometry: see bot-validation.md and raw bot-results.json. Numeric stat helpers support +/-13; preview bars still need per-stat normalization and shared-mode wording in the companion. Compatibility plan is mandatory before integration; no shared UI/network/game files edited.
