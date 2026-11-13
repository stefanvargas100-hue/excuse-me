Outcome:     done (partial on fit: see Trouble)
Branch:      stefanvargas100-hue/airport-stages; commits f7432d9 (tests read PROTO) plus the batch commits
Changed:     Security Lanes (9), Baggage Claim (10), Gate Change Rush (11) with lane/rope/gate, bagspill and gatechange events; PROTO 12 to 13; medals from calibrate.js (156/123/101, 142/112/99, 184/141/126)
Checks:      npm test 998 tests, 0 fail (946 before); build ok; git diff --check clean; Airport Friend Cup [0,9,10,11] with 0 and 6 bots completes; PROTO bump verified: set to 14, 156 network tests still pass; stages 0-8 crowd hashes identical to base; mutation check (ropeContain disabled) fails the rope test
Checks:      test:fit 71 checks, 58 problems; 10 are mine (Airport Cup button label overflows at 320x568, same as the existing NYC Cup one); the other 48 I did not compare with a base run
Not checked: phones, fun, medal fairness, performance; screenshots are poses from the real game in Orca's browser (390x844), not playthroughs
Off plan:    src/sim/crowd.js (settleT line, quiet flag on drive beep, rope/steer calls), test/harness.js exports PROTO, tests updated for 4-race Airport and 3 presets (bridge, subway, styles, medals, friendcup, friendcup-room, batch19c), figures.js props; stepBot has two one-line Security hooks (target and rope containment)
Trouble:     Wrote code before the tests (not test-first); added a mutation check afterwards. Cap-wire test also hard-coded 13 as "newer" and proto 12; fixed. Classic has no seed, so Security draws a per-run key from R (Security only).
