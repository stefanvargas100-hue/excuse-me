Outcome:     done; HOLD integration for S2 race regression.
Branch:      stefanvargas100-hue/classic-review; review commit on d7913b1 (reviews 5c91068 vs 2d712c0).
Changed:     review evidence/report only; see ../batch-12b-evidence/audit.md for exact lines and fixes.
Findings:    S2 race.js:54 removes existing pedestrian draft without race identity changes; revert race-only condition and fixture edits.
Findings:    S3 browser evidence query does not enable playtest; S3 pickup test intermittently fails, isolate crowd generation.
Checks:      focused 45/46; full 749/749; movement recheck 11/11; build/diff pass; regression fails as intended, restored-condition control passes; six browser cases pass.
Compatibility: cm2 keys/wire/boards coherent, legacy preserved; checked-in SQL accepts keys; deployed constraints not verified.
Not checked: real phones and deployed schema; Daily/Weekly/scripted and race-only strips/belts/glass/routes remain explicit parity gaps.
Off plan:    none; no production changes, integration, live writes or subagents.
Trouble:     intermittent pickup assertion and long race tests; all 12 supplied screenshots inspected individually at native size.
