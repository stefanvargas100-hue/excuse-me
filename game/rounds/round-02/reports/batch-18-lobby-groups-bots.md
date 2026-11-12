Outcome:     done (batch 18d validation fixes)
Branch:      stefanvargas100-hue/lobby-groups; implementation a053399
Changed:     Normalized received/local bot choices, kept invalid values inert, cleared invalid cached setup, and required setup bots to match an agreed valid config using setup player count; PROTO stays 10.
Checks:      Reviewer file merged unchanged: exactly 2 failed first, then all 7 passed; 55 room tests passed, including stale-config join/leave with fill/explicit counts and honest starts; full 879/879 pass; npm.cmd run build and git diff --check pass.
Evidence:    Prior 18b real guest Ready evidence at 320x568 and 390x844 retained; no browser rerun for this validation-only change.
Not checked: Independent re-review after HOLD; real phones/network joins/leaves, reconnect and host transfer with custom bots.
Fairness:    Existing no-record/no-ghost policy and eight-racer identity/data unchanged; no points, UI, styling or start-protocol changes.
Off plan:    none (review branch merged as instructed)
Trouble:     Reviewer exposed two input-validation gaps; malformed counts and count-disagreeing setups now reject through existing paths.
