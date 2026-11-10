Outcome:     done; returned for independent re-review, no integration
Branch:      stefanvargas100-hue/classic-movement; exact tested implementation 0cbb2d7883c3847cadd56b380f15dabc55319361
Changed:     restored original race walker drafting; isolated pickup lifecycle; current-kind/wrong-rules coverage; actual /playtest/ evidence.
Checks:      new player/bot regressions failed first then 2/2 passed; focused 22/22; pickup repeat 20/20; full suite once 751/751; build and diff --check pass.
Browser:     Chromium 320/390 x all 3 builds; prefixed storage/offline queue and cache bypass asserted; external requests blocked, no live writes.
Not checked: real phones, deployed server acceptance, pre-existing live service worker; Daily/Weekly and stage-feature parity remain outstanding.
Off plan:    none; no merge of lead/review branches, no identity migration or further gameplay widening.
Trouble:     original pickup flake not independently reproduced; isolated generation/collision explanation and browser limits recorded in batch-12c-evidence/audit.md.
