Outcome:     done (batch 22b validation); independent review remains with lead
Branch:      stefanvargas100-hue/spectating; implementation ab523cf, prior report 81d2ad2; validation commit follows
Changed:     Added Cup award preservation check and 12 host/joined-guest browser captures at 320x568 and 390x844; no implementation changes in 22b.
Checks:      Full suite once, no other suite running: 953 tests, 951 pass, 0 fail, 2 existing TODO, 420s; both Skytree calibrations passed. Final focused spectate 8/8; build and diff check pass.
Checks:      Cup next race starts without guest leaving spectating; stop preserves points, settled round awards +10 once across redraws. Earlier seeded bot times and host/guest message comparisons pass.
Checks:      Two-page local relay, real joined guest, external traffic blocked: human/bot targets verified by identity, next/stop exercised by touch; 12 screenshots and capture.json show controls >=44px, reachable and unclipped at both sizes.
Checks:      Fit 71/37; baseline 64d4705 also 71/37 with identical warning lines (fit-comparison.json), so zero introduced. Lead's 36 not reproduced; first warning is 320x568 Daily run button vertical overflow 19px, also present before spectating.
Not checked: Real phones/network, follow smoothness, independent review. Crowd simulation unchanged; no extra crowd generated for camera. Prior logs retain superseded failures; tests-22b.txt and spectate-22b.txt are final evidence.
Off plan:    Previously approved stepRemotes sampleOnly API; initRace initializes per-race presentation state. No additional implementation changes.
Trouble:     Skytree made full suite take seven minutes; let it complete uninterrupted. Corrected capture to fresh two-page room per spectator role and verified target type through touch cycling.
