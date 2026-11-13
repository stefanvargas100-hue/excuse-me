Verdict:     PASS (no S1-S3 findings; two S4 notes). Reviewer: Claude Sonnet 5.5, branch stefanvargas100-hue/cup-presets-review-19c off c2f0613.
Validation:  stagesOK needs an exact preset; reordered, repeated, extra, short, Airport alone, non-integer, string, sparse, 1e7-element and throwing-Proxy stages are all rejected fast (sim and guest roster/cup paths). rounds.length is bounded by the preset (addRace also refuses extras).
Cup length:  No literal 4 left in Friend Cup paths. 2-race Cup checked in a room: eyebrow "race 1 of 2", final standings, new-Cup button, award, host leaving between races and mid race 2, reconnect state, wrong PROTO. CUP_RACES is imported but unused in duel.js:13 and game.js:43; the constant (4) is only asserted by a test.
Identity:    FRIEND_CUP_RULES 3 + stage list only enters makeRun for friendcup, whose policy is all-false (no records, ghosts or boards). Classic, Daily, Weekly, Challenge, solo Cup, plain races untouched; no saves rewritten.
Lobby:       Ready clears on preset change; bots clamp on join/leave with Tokyo. Screenshots 320 and 390 (host both presets, guest, final): nothing clipped; only the batch 18 ellipsis on long player names. Start looks disabled before the guest is Ready (existing rule).
Tests real:  Mutation (stagesOK relaxed to any 2-4 distinct ints 0-6) failed 9 tests across friendcup, friendcup-room and my file; reverted (git checkout).
Scope:       Production changes only in the allowed files (cup-presets.js, tools/room-sim.mjs and cap-wire test allowed by 19b). No file changed outside the May edit lists.
Checks:      npm test 894/894 (run before my new file was added); focused 8 files 123 pass, 0 fail, 2 todo; build and git diff --check pass.
Not checked: Real phones, real network, two-phone reconnect.
Findings:
- S4 src/online/duel.js:262 cupFromMessage: setup.stages is checked as "some preset", never equal to the agreed cupCfg.stages before the race starts (after racing, fixed() pins it). Only the host can send it, so no attack. Todo test: test/batch19c-review.test.js "before the race starts, a host Cup message may carry a different preset".
- S4 src/sim/friendcup.js:10,25 cleanSetup validates raw.stages then re-reads it for [...raw.stages]; a local Proxy/getter can flip between reads. Unreachable from JSON. Todo test in the same file.
- S4 duel.js:13 and game.js:43 unused CUP_RACES import; CUP_RACES=4 is now misleading.
- S4 game.js:506 rules is now a string ("3:1-3-4-5"); recordKey would still build a valid key but nothing saves Friend Cup runs. Keep in mind if Friend Cup records are ever enabled.
