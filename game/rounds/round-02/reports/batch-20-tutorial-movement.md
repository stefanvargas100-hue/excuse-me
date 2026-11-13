Outcome:     done
Branch:      stefanvargas100-hue/tutorial-movement, see commit below
Changed:     tutorial now keeps frozen build effects (S.moveStats) from the start; only pickups and random crowd wait for handover, and endTut starts pickups at once (game.js start/tick, tutorial.js endTut).
Checks:      new test/tutorial-movement.test.js 16 tests (14 failed before the change, 16 pass); tutorial/practice/classic-movement/runopts 34 pass; npm test 898/898; build ok; git diff --check clean.
Not checked: phone or browser feel with a small and a large build, before and after handover; hint wording truth.
Off plan:    none. practice.js untouched (retry already clears boosts; test added).
Trouble:     none. Note: the existing "far_<level>" distance tally is written during the tutorial as before (not coins, records, ghosts or attempts).
