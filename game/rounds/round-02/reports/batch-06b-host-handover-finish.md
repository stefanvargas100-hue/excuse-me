Outcome:     done
Branch:      stefanvargas100-hue/host-handover-2, code at 2b11a96 (on the draft b5e751a)
Changed:     the Cup hands over to the next player in roster order (bye or silence); the old start coordinator closes and the new host's may make an agreed start (start-sync.js, 1 line); a countdown is cancelled everywhere, sends nothing, and the new host restarts it; the old host is ignored and stands down if it returns; room-sim finishes a full Cup.
Checks:      11 new handover tests: 9 failed on 1e65271 (2 guard unchanged behaviour), the cancelled-start test also failed on the draft, and all pass now. 169/169 focused online tests pass. npm test 642/642 (1e65271 was 631/631, so the draft's 6 failures were real, not encoding problems: 3 old host-left tests, the sim test, and 2 I did not identify). Build and diff check pass.
Not checked: real phones (host closes the app mid-race and during the countdown). A race-1 countdown cancel shows "race 0 of 4 · Finished · waiting for racers" until the new host restarts it: the fix is in game.js, which this plan does not allow.
Off plan:    rewrote 3 friendcup-room tests to the new rule (Cup carries on). Plain races and elimination are unchanged. A host leaving before race 1 starts on a phone still closes the room. Message ids are not authenticated, so a guest could still fake a host 'bye' (not new).
Trouble:     working out the draft's stall: room-sim used readyPlayers between races, and a fresh coordinator refused agreed starts.

Messages per second, average / peak, from `node tools/room-sim.mjs` (simulated connection; 30 s races; humans stand still). "Received" counts every copy delivered.

| Humans | Host leaves | Seconds | Room sent | Room received | Host sent | Host received | Guest sent | Guest received | New host sent | New host received |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | no | 124 | 19.9 / 43 | 19.9 / 41 | 13 / 29 | 6.9 / 14 | 6.9 / 14 | 13 / 27 | - | - |
| 4 | no | 124 | 38 / 83 | 113.6 / 228 | 17.3 / 41 | 20.7 / 42 | 6.9 / 14 | 30.9 / 62 | - | - |
| 8 | no | 124 | 69.9 / 158 | 487.5 / 1001 | 21.6 / 61 | 48.3 / 98 | 6.9 / 14 | 62.5 / 129 | - | - |
| 4 | race 2 | 124 | 32.5 / 83 | 79.1 / 228 | 17.6 / 41 | 21.1 / 42 | 6.9 / 14 | 25.4 / 62 | 12.1 / 30 | 20.4 / 67 |
