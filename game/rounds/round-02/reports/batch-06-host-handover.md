Outcome:     partial
Branch:      stefanvargas100-hue/host-handover (commit recorded in worker_done)
Changed:     draft roster-based Cup host transfer, PROTO 6, failing regression and simulated room tool; do not merge.
Checks:      regression failed first; focused Cup tests 35/36 passed before restoring old departure expectations; build passed; diff check passed; full suite result follows in worker_done.
Not checked: phones, fake-host/countdown/return regressions; no completed message-rate measurements.
Off plan:    none; plain friend races and elimination retain existing departure behavior.
Trouble:     stopped after two unsuccessful fixes to next-race simulation; readyPlayers cannot be used while coordinator phase is running, and transfer initially stalled race 3.
| Humans | Host leaves | Message table |
| 2 / 4 / 8 | no | unavailable: simulator failed before completing first Cup |
| 4 | race 2 | unavailable: host-leaves Cup has not completed |
