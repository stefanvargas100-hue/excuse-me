Outcome:     done (stats implementation and compatibility plan; integration not approved)
Branch:      stefanvargas100-hue/cap-trial; implementation 61b9edb, evidence/report in companion commit
Changed:     treatment A speed cap, preserved legacy tool baseline, exhaustive/tick/native-bot evidence, batch-17b plan
Checks:      tests failed first; focused 24/24, full 825/825; build pass; diff check pass; 522720 loadouts; 18 active tick rows/72 historical rows
Bot checks:  216 races + 6 exact full-race repeats; 630/630 ordinary bots finished; 18 deliberate 20s contact timeouts retained; all contacts >=2 bumps
Finding:     plain races exact; large speed-kit mean deltas Fifth +1.10s/Subway -0.70s/Takeshita -0.02s; no consistent crowded winner
Not checked: compatibility implementation, preview +/-13 normalization, independent review, browser/phone handling, general competitive balance
Off plan:    none; Director bot addendum read from develop without merging; shared batch-10 files untouched
Trouble:     long CPU-bound native matrix; normalized VM arrays and reconstructed shades to preserve native random stat caches
