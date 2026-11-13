Outcome:     partial
Branch:      stefanvargas100-hue/cup-presets; implementation 4cb9410
Changed:     Exact city presets, dynamic lengths, protocol 11, preset-specific rules identity, lobby buttons and mobile screenshots.
Checks:      New core test failed first then 63/63 focused passed; latest stronger focused 4/5 passed (Tokyo bot finish failure); npm test 882/888 passed; build and diff check passed.
Not checked: Stable actual Tokyo bot finishes, reconnect on phones, real network, independent review; full suite not green. Friend Cup has no saved records/scores/ghosts/progress; old saves untouched.
Off plan:    none; tools/room-sim.mjs needs preset update but is outside allowed files, so left untouched.
Trouble:     Actual bot-finish check unstable (Tokyo passed then failed); stopped without AI tuning. Full-suite failures: five stale cap-wire protocol/airport expectations and room-sim custom stages. See batch-19-evidence.
