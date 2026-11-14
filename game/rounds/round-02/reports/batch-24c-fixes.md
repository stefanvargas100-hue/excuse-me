Outcome:     done
Branch:      stefanvargas100-hue/room-bots (merged room-bots-review a0893e6), 24c fix commits on top
Changed:     S2: a host whose bots are all in now keeps showing friends who are still running; Cup hosts and 0-bot rooms are unchanged. S3: in Race/Elimination, Bots and difficulty share one row, and the room code is smaller on tall screens (Cup and guest lobbies are unchanged). S3: 0-bot rooms are now checked against a fixture recorded on develop.
Fixture:     zero-bot-record.cjs records every message in order with payload, plus friend ghosts and places/eliminations, using a fixed seed and frozen clock. On develop 656ec3b the output is byte-identical to this branch. Only "proto" is normalised (13 vs 14); there are no other differences.
Fit:         capture.json Start button: 390x844 y=764 h=58 (bottom 822, card bottom 828, scrollTop 0, fully visible); 320x568 y=668 h=44 (scrolls, as allowed). Code font is 5.5vh, about 46px at 844. fit-check: 34 problems before and after, same list.
Checks:      both review tests pass unedited; room-bots 14/14 (the fixture test fails when 0-bot traffic is changed); npm test 1031 pass, 0 fail, 2 todo; npm run build ok; git diff --check d8e6b15 clean.
Not checked: real phones; difficulty feel.
Off plan:    #friendCode rule in style.css (approved by lead, option A). The "add then remove bots" test compares race traffic only, because changing the setting re-sends the lobby by design.
Trouble:     a bot row cannot fit in the 31px spare at 390, so the code box had to shrink; Start's bounding box looked on-screen while the scrolling card clipped it.
