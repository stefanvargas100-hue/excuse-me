Batch 12 evidence

Chromium emulation: 320x844 and 390x844, all three builds, pickups and active boosts, 51-pass combo with zero slowT/hitStop. Screenshots and browser.mjs reproduce the checks. External requests were aborted; no live writes or phone testing. Camera focal-length scaling and combo vignette are removed; ordinary bob and collision feedback remain.

Classic reuses racePace, effects(statsOf), nearMul and powerMul. It has no racer field and gains no drafting from pedestrians. Race drafting now requires a racer; scripted practice keeps its walker target. Race constants/layouts stay unchanged. Existing race record/ghost identities were retained: independent review should assess whether the draft-target restriction needs a separate race compatibility tag before integration.

Stage guards audited: strips, airport belts/glass/containment, side-route speed and side-route content remain race-only. Sharing these requires Classic route content beyond this batch. Daily/Weekly retain prior pace/build/pickup rules and crowd streams. Tutorial keeps scripted movement, then resumes Classic effects/pickups in the same run.

Classic cm2 identity covers local bests, own/friend ghosts, submissions, top ghost fetches and both board displays. Legacy storage stays untouched, never copied into cm2. Versioned classic:cm2 wire kind makes old clients reject new ghosts; new clients require matching rules too. Non-Classic boards and ghost payloads are unchanged. Local schema permits classic:% names up to 40 characters; no database/live validation was performed.

Behavior tests failed before fixes for near boost, all-build parity, endless pickups, clear protection, diagonal sweep, legacy isolation, boards, wire kind and tutorial handover. Old tests requiring Classic to ignore builds/fit/body/near boost now assert approved behavior.
