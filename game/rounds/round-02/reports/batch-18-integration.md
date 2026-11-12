Outcome:     done; reviewed batch 18 merged into develop as 20a24cf and pushed with this record
Branch:      develop; the pushed build is the commit that added this file
Changed:     Friend lobby track groups by city, host-chosen Friend Cup bot count (0 to free seats, default fill to 8), PROTO 10, input validation fixes
Checks:      lead full suite on merged develop 882/882, zero failed/skipped, 157.9 s (batch-18-integration-evidence/tests.log); build passed (main.js 344.70 kB); diff check passed after the lead removed one trailing blank line in test/batch18-review-input.test.js (7/7 still pass)
Review:      independent 18c HOLD (two S2), fixed in 18d a053399, re-review 18e PASS 0e0d90c; lead read all three source diffs and two 320px screenshots
Not checked: real phones, real network joins/leaves, reconnect and host transfer with a custom bot count; lead did not open the guest Ready captures (reviewer did)
Open:        S3, owner lead: after a mid-Cup reconnect a guest's immediate next-race request stays "won" instead of "play", same on develop before batch 18 (batch-18e-evidence/reconnect.cjs); may be fixture clock resync or a real inherited defect
Off plan:    lead edited one reviewer test file (whitespace only)
Trouble:     two lead misses: plan named no guest capture method (template check 6 added); lead diff review missed the unvalidated received bot count
