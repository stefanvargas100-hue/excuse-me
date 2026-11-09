Outcome:     partial
Branch:      stefanvargas100-hue/host-handover (commit recorded in worker_done)
Changed:     draft roster-based Cup host transfer, PROTO 6, failing regression and simulated room tool; do not merge.
Checks:      regression failed first; online checks 102/102 passed; Cup checks 35/36 before restoring old expectations; full suite 626/632 (includes 2 transient encoding failures); build and diff check passed.
Not checked: phones, fake-host/countdown/return regressions; no completed message-rate measurements.
Off plan:    none; plain friend races and elimination retain existing departure behavior.
Trouble:     stopped after two unsuccessful fixes to next-race simulation; readyPlayers cannot be used while coordinator phase is running, and transfer initially stalled race 3.
| Humans | Host leaves | Message table |
| 2 / 4 / 8 | no | unavailable: simulator failed before completing first Cup |
| 4 | race 2 | unavailable: host-leaves Cup has not completed |
