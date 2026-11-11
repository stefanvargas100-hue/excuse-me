Outcome:     done (builder acceptance; independent review pending)
Branch:      stefanvargas100-hue/playtest-fixes, implementation/evidence 17fb564
Changed:     semantic award keys prevent duplicate visual animations on fresh equivalent state; corrected inconsistent screenshot fixture; scoring/protocols unchanged
Checks:      2 duplicate-animation assertions red then green; focused 120/120; strengthened presentation 62/62; full suite 829/829; build and diff pass
Browser:     /playtest/ local-only eight-page rooms; enabled Ready/Start clicked at 320x568 and 390x844, same synchronized seed, stable finished animations, correct current/next labels
Fit:         npm.cmd run test:fit fails 31/71; identical-environment baseline 32, candidate 31, matching 31, introduced 0; resolved 320px full-roster overflow
Boundary:    completed valid rounds award 1-10 even for DNF; tested Pending/zero-total before authority and eighth-place +1, calm/reduced separately, redraw/state replacement and final totals
Not checked: real phones, actual transport reconnect/reload, independent review; dropped-ack browser exercise stopped after two timeouts (simulated cancellation/promotion tests pass)
Off plan:    none; evidence/notes at game/rounds/round-02/batch-10c-evidence/ (notes.md and fit-comparison.json)
Trouble:     browser RAF-disabled wait polling; documented stopped cancellation check and corrected polling for passing enabled-start/presentation checks
