Outcome:     done
Branch:      stefanvargas100-hue/friend-cup-online, d3d3739 (on lead's WIP save 75146ca)
Changed:     Room Cup setup, host-run bots in one message, self-healing results, leaver takeover, host-left end, PROTO 3 to 4.
Checks:      friendcup-room 35/35 (failed first, 34/34); npm test 611/611; build ok; diff --check 8c8d473 clean; test:fit 70 checks, 0 problems, screenshots viewed.
Measure:     Simulated connection, 7 host-run bots: host 10.2 msg/s, bots 4.3/s = pos 4.3/s; bot message 347 B; largest Cup message 2,495 B (8 phones, long names).
Not checked: All network checks used the simulated connection; no browser or phone network play. Phones: 8-racer smoothness, natural bots, clear setup.
Off plan:    test/lobby.test.js, test/interruptions.test.js proto values (lead-approved). Test hooks attach in friend.js (main.js not allowed). friendcup-room asserts PROTO === 4: update when merging.
Trouble:     Usage limit mid-batch (lead saved WIP). A fit-check edit broke operator precedence, briefly hiding two existing routes; fixed and re-run.
Notes:       Bots never shove or call the crowd, are never solid, and react to anyone on their tail. A 'bots' row for a player not yet known to have left is skipped.
