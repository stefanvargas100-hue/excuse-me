Outcome:     done (batch 18b review fixes and single guest browser attempt complete)
Branch:      stefanvargas100-hue/lobby-groups; implementation 961bd91
Changed:     Fixed summary separator, preserved picker options across refreshes using roster count, hid Cup-only empty groups, restored full-Cup invite rule, added tested grouping helper.
Checks:      Six new grouping/picker/guest-summary checks failed first then passed; full 865/865 pass; npm.cmd run build and git diff --check pass.
Evidence:    batch-18-evidence/18b-real-guest-ready-{320,390}.png and 18b-guest-result.json: real guest pages via batch-10c local relay, 3 players/2 bots, enabled Ready within viewport and clicked successfully on both sizes in one attempt.
Not checked: Independent review; real phones, real network joins/leaves, reconnect and host transfer with custom bots.
Fairness:    Existing no-record/no-ghost policy unchanged for all Friend Cups; eight-racer identity/data unchanged; bot settings retain existing Ready reset.
Off plan:    none (new pure helper explicitly permitted by 18b brief)
Trouble:     Earlier host-role guest fixtures are superseded by successful multi-page guest evidence; no further browser attempts needed.
