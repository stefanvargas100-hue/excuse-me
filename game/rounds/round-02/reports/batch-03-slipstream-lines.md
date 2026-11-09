| Rules | Lines first third | Middle third | Last third | Median Hard finish (s) | Boosted bot-time |
|---|---:|---:|---:|---:|---:|
| today | 70.47% | 57.40% | 55.26% | 133.65 | 16.81% |
| B 3 | 50.59% | 24.56% | 25.62% | 138.97 | 11.45% |
| B 6 | 59.79% | 32.19% | 26.93% | 139.20 | 9.88% |
| B 9 | 48.26% | 36.63% | 33.47% | 138.48 | 8.83% |

Outcome: partial; Branch: stefanvargas100-hue/slipstream-lines 799b586 (implementation); Changed: prescribed B lane penalty, 6 s cooldown, regression, and medal targets.
Medal times, Bronze/Silver/Gold seconds (old ? new; raw medians): airport 165/125/118 ? 153/137/120 (152.35/136.35/119.20); nyc 211/181/134 ? 215/176/154 (214.52/175.45/153.27); shibuya 107/92/75 ? 103/94/82 (102.17/93.57/81.18); park 178/143/115 ? 171/148/117 (170.85/147.72/116.80); bridge 208/176/136 ? 202/166/144 (201.58/166.00/143.27); subway 159/119/97 ? 159/124/99 (158.93/123.35/98.68). All orders valid.
Checks: baseline regression failed at 70.47%; B/6 focused 4 pass, 1 fail at 59.79%; full suite 593 pass, 1 fail (same regression); medal tests 55/55 after recalibration; build passed; git diff --check bee02db HEAD passed (full suite preceded final medal-only update). Not checked: browser, phone, race feel and medal fairness. Off plan: none. Trouble: specified fix fails <40%; differs substantially from earlier 63/31/10 and B 30/9/13 trials. Method: harness, 60 Hz, seeds 1?5, Hard Fifth Avenue, 7 bots + player; active adjacent forward chains of >=3, gaps >0 and <7 m, sideways <0.6 m; thirds of GO-to-last-bot finish, pooled frame counts; boosted fraction uses active bot-frames. Player follows 20 m behind last active bot to allow all finishes and crowd cleanup (initial stationary-player run interrupted for slowness). Medals use 3 seeds (1?3), 3 bots, all stages/difficulties, pooled median (9 finishes); round up ignoring <1e-7 s clock error.
