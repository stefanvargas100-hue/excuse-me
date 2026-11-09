Outcome:     done
Branch:      stefanvargas100-hue/subway-stage, commit in git log (message "Add Subway Platform stage")
Changed:     Stage 5 `subway` (450 m, half 4.5) with `train` event (4 doors 9 m apart, tight groups), painter, medals 159/119/97, PROTO 4, rotation capped at 5 stages.
Checks:      subway/rotation/bridge/medals tests fail-first then pass; npm test 586/587 first run, the 1 failure (lobby.test.js hard-coded proto 3) fixed and lobby+interruptions rerun 45/45, not re-run as one full suite; npm run build ok; test:fit "Summary: 55 screen checks, 0 problems"; git diff --check clean.
Medians:     bot finish (pooled 3 seeds x 3 bots, 60 Hz, player capped at goal-20): Easy 158.1, Medium 119.0, Hard 96.3, all bots finished. Same method on bridge gave 190/170/137 vs saved 208/176/136, so method is close not identical.
Screenshots: browser 390x844, $TEMP = C:\Users\stefa\AppData\Local\Temp: subway-quiet.png, subway-train.png (banner not caught, train + wave visible), subway-finish.png (race mode, tips skipped). Classic is endless so finish is shown in Race.
Not checked: feel, wave fun, medal fairness, phone smoothness; real train arrival animation (cars appear stationary); banner screenshot.
Off plan:    test/lobby.test.js and test/interruptions.test.js proto 3 -> 4 (needed by the PROTO bump); test/medals.test.js and bridge.test.js stage lists. Commuters start slightly past `half` inside the train (free until they turn), then obey it.
Trouble:     Finding a medal method that kept bots racing after the player finishes.
