Outcome:     done
Branch:      stefanvargas100-hue/time-boards; implementation 6c43f74; report in following commit
Changed:     Race stage boards, inverted millisecond best times, top 20 plus own place, gated coming-soon tab; shared offline name filter and fallbacks.
Checks:      Feature assertions failed first; focused 26/26; full suite 638/638 (before final own-rank/room additions, checked separately); final build and git diff --check passed.
Checks:      Chromium emulation 320x568: Race notice visible; injected 24-character board/room names remain within viewport, nowrap/ellipsis; zero live board requests on /playtest/.
Not checked: physical phones; live database; migration execution; enabled Race board against Supabase. Director must apply/verify 0003 then enable RACE_SUBMIT_ENABLED.
Migration:   Needed: existing update policies reject race boards. First lines: "-- Race time boards: friendly, client-reported times. NOT APPLIED." / "-- Score = 2000000 - finish milliseconds; faster is higher, reusing keep_best unchanged."
Off plan:    Lead-approved: cap raised to 24 for all names; no name form/setter/refusal copy; duel import allowed. Existing room CSS already uses nowrap/ellipsis, no CSS changes.
Trouble:     Full suite took 337 seconds; PowerShell pipe replaced Unicode test literal with question marks, corrected to Unicode escapes.
