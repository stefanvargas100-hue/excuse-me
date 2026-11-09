Outcome:     Part 1 done; Part 2 pending, committed before beginning Takeshita.
Branch:      stefanvargas100-hue/side-routes; foundation 1cf85eb, encoding/medals in this commit.
Changed:     Subway mezzanine route, route isolation, bot choice, drawing/race dots, tagged records/ghosts, protocol 6 player/Cup-bot route positions; fixed painter encoding after lead diagnosis.
Checks:      core route/ghost tests failed first; focused side-routes/Subway/UTF-8 16/16 pass; previous full suite 637/637; build and git diff --check pass.
Timings:     clear-course scripted mezzanine about 6.2% faster, within 3-8%; easy route comes in Part 2.
Medals:      Subway old bronze/silver/gold 159/119/97 s -> 153/138/121 s; nine bot finishes per tier, three seeds 11/22/33 at 60 Hz, player trails field; medians Easy 152.383, Medium 137.283, Hard 120.017 s, all bots finish.
Screens:     inspected built-game Playwright captures at 390x844, C:/Users/stefa/AppData/Local/Temp/subway-entrance.png (platform/right stairs) and subway-mezzanine.png (tan isolated mezzanine/rejoin label).
Not checked: route readability/value, medal fairness and feel on a real phone remain for a person.
Off plan:    lead-approved game.js movement/pass loop and actions.js reach/who only; local develop merged as requested in batch 07c.
Trouble:     single code-page 0xB7 in painter masked by offline-cache hook; UTF-8 test caught it, resaving fixed build.
