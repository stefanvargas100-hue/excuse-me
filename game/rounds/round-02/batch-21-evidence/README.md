# Tokyo stage evidence

Six PNGs are real Vite game captures through Orca's embedded browser at 390 x 844 CSS pixels (PNG headers checked). These are controlled inspection poses, not continuous playthrough recordings: start a race, remove other racers, place the player at 80 m or nine metres before the finish, call the main event for event poses, shift event people 48 m nearer, and position the crossing truck at x=-1. Pause the simulation, hide the pause menu and render. All six were visually inspected.

Tsukiji shows a narrow stall corridor, repeated awnings and crates, a small delivery truck with room on either side, and MARKET EXIT. Skytree shows a broad bright walkway, glass and a skyline on the right, a low rail on the left, window tourists leaving most of the walkway open, and TEMBO GALLERIA. The shared neon recipe still gives racers a strong glow; all art is placeholder.

Bot calibration: test/skytree.test.js runs three seeds at 60 Hz per difficulty, seven bots per race, following the rear bot so the generated course stays active. bot-medians.json records medians over the 21 bot finishes for each difficulty. All finish inside 600 simulation seconds. These seven-bot medians are finish-fairness checks. calibrate.js separately runs ordinary three-bot races with the same seeds and Hz; ordinary-medians.json records those nine-finish medians per difficulty, and medal thresholds round the ordinary medians up.

Fit comparison: baseline batch-10c has 31 findings; this run reports 62 screen checks, 43 problems. The twelve additional findings are nine Friend Cup checks blocked by ambiguous inherited preset selectors and three 1280x800 race-end buttons (#endLook, #shareBtn, #menu) outside their panel. No stage-specific layout finding was reported. The coordinator instructed this worker to leave these for the lead.

Wet grip hooks are in src/sim/game.js movePlayer and src/sim/race.js stepBot; both call the same people.js function. It reduces lateral acceleration to 22% on a marked patch and for 0.22 seconds after leaving, without changing forward movement. Existing stages return grip 1 without consuming randomness.
