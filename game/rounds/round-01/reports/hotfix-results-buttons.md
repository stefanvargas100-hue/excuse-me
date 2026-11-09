Outcome:     done
Branch:      stefanvargas100-hue/r1-results-hotfix; CSS a3c8949 (report follows in this commit)
Changed:     Hide short-screen podium; tighten result spacing and top-align card only at height <=650px.
Checks:      Throwaway Chromium Playwright checks passed; npm.cmd test 504/504; npm.cmd run build passed; git diff --check 7795990 passed.
Measured:    320x568 first win with Unlocked Neon shirt: Race again y393.44..437.44; Customize/Share/Menu y441.44..479.44 (88.56px spare).
Measured:    320x568 completed NYC Cup: Race again y324.27..368.27; Customize/Share/Menu y372.27..410.27 (157.73px spare).
Measured:    390x844 podium visible; race buttons y670.94..720.94 / y728.94..770.94; Cup y645.97..695.97 / y703.97..745.97; no page errors in all four cases.
Not checked: Real phone and whether results feel good without podium; medals not implemented here.
Off plan:    Coordinator authorized spacing-only changes and revised last-button target <=y500; fonts/button heights/content unchanged; report in second commit authorized.
Trouble:     Hiding podium alone left only 43.28px spare; coordinator revised target and approved spacing adjustment.
