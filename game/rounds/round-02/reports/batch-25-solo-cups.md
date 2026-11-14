Outcome:     done
Branch:      stefanvargas100-hue/solo-cups, see latest commit
Changed:     Race vs bots → Cup offers New York, Tokyo, Airport solo Cups (4 races, 7 bots); own record keys `excuseme_cup_tokyo:r4` / `excuseme_cup_airport:r4`; NYC identity and key unchanged
Checks:      new test/solo-cups.test.js failed first, now 8/8 pass; npm test 1019 tests, 0 fail (2 todo/skipped); build and git diff --check clean
Fit-check:   before 71 checks / 40 problems, after 71 / 34; no new kinds (only the shorter "Cup" chip, 320 wide, smaller overflow). Screenshots in game/rounds/round-02/batch-25-evidence/solo-cup-cards-*.png
Not checked: three Cup cards on a real phone; whether Tokyo and Airport are fun as 4-race runs
Off plan:    none. No existing tests changed; no style.css change (cards fit). Cup model gains an optional `stages` field; cupStagesFor in cup.js uses stageGroups
Trouble:     source files use CRLF, so scripted edits needed care
