HOLD — Outcome: done; independent review found two S2 input-validation defects; production unchanged.
Branch: stefanvargas100-hue/lobby-review (review commit contains this report and regression tests).
S2: src/online/duel.js:463 retains JSON bots={"toString":null}; cupSummary at :237 throws TypeError during roster receive; reproduce test/batch18-review-input.test.js:71.
S2: src/online/duel.js:258 validates setup independently of cupCfg; agreed 2 players/0 bots accepts a 3-racer Cup, diverging from host; reproduce test/batch18-review-input.test.js:78.
Checks: focused 5/7 pass (two intentional failing regressions); full suite 870/872 pass (only these regressions fail), details in batch-18c-evidence/full-suite.txt; build and git diff --check pass.
Coverage: four-race simulated 2/3/5/8 fields agree on totals, host earns 40, storage unchanged; explicit-count Ready reset, full-room clamp and custom 0/2/5-bot guest departure/host takeover pass; existing tests cover fill, invalid setups, awards, takeover and version rejection.
Source: PROTO=10, START_PROTOCOL=2 unchanged; existing version checks both directions, count derived from racers, no other mode identities/policies changed; all source/style paths allowed by 18/18b.
UI: opened 320-cup-open and both 18b-real-guest-ready screenshots: grouped numbered picks and bot selector visible; host Start below viewport with supplied scroll-fit success; guest Ready clear at both sizes; grouping/picker helper tests inspected.
Not checked: own browser captures (existing evidence sufficient for HOLD), real phones/network/reconnect; custom-count award replay not independently simulated, nor executable develop-vs-branch comparison.
Off plan: none. Trouble: untrusted roster count and independent setup validation; failing regressions retained for builder, no fixes attempted.
