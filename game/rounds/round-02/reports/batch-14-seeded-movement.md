Outcome:     partial
Branch:      stefanvargas100-hue/seeded-movement; implementation uncommitted because tests fail (report-only commit)
Changed:     Daily/Weekly shared movement, mp2 captured scores/boards, menu/results labels; existing markers and queues retained
Checks:      initial movement tests failed first then 14 passed; boards 5 passed; full suite 766/772 passed (6 failures); build and diff check passed
Not checked: browser /playtest/ 320/390, phones, deployed schema, independent review; boundary simulation and broader acceptance coverage incomplete
Off plan:    none; checked-in schema accepts mp2 names; no migration, live write, deployment or integration
Trouble:     stopped after two failed attempts at crowd fixture comparison (mutable visual/position fields differ); another existing identity assertion expects legacy boards
Limit:       existing device markers plus first accepted score only; separate versions do not provide account-wide/cross-version attempt enforcement
