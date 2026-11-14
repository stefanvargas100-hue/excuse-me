Outcome:     done (not merged: waiting for the Codex second review)
Branch:      stefanvargas100-hue/room-bots, commit "Room bots: host-picked bots in plain friend races and Elimination"
Changed:     the host picks bots (0 to free seats, or Fill) and difficulty for Race and Elimination. Before each start it sends a checked `field` message. Only the host runs bots, and bots place and get eliminated like players. PROTO is now 14.
Checks:      new test/room-bots.test.js (12 tests; 11 failed first, the 0-bot baseline passed on the old build by design); focused room/elim/Cup/spectate tests 105/105 with no existing test edited; npm test 1029 pass, 0 fail, 2 todo; npm run build ok; git diff --check d8e6b15 clean; fit-check 34 problems before and after (same list).
Browser:     batch-24-evidence/capture.mjs, a host and a real joined guest over a local relay at 320x568 and 390x844: host lobby (Race, Elimination), guest lobby, guest mid-race with 3 bots, and results on both phones. Places matched.
Fit note:    the plain host lobby now has a Bots row. At 390x844, Start is about 46px lower and needs a short scroll (it fitted before; at 320x568 it already scrolled). fit-check misses this because the card scrolls.
Not checked: real phones over the internet; whether bot difficulty feels right in a friend race.
Off plan:    game.js beyond lines 550-565: the host's after-finish and eliminated-host steps now use runsBots, through a new hostField() and one results refresh. race.js marks a finished bot's row as sent so the host keeps reporting until guests are told. Results title reads "N friends + K bots".
Trouble:     CRLF files broke string-replace edits; and the host stopped stepping the field before the last bot's finish row went out (fixed).
