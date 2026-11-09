Outcome:     done
Branch:      stefanvargas100-hue/r1-medal-times; implementation 37eaaea
Changed:     Fixed medal targets, existing-best stage badges, ordinary bot-race medals and next targets; no storage or reward changes.
Checks:      47 focused tests passed after red checks against placeholders; full suite 551/551; build passed; test:fit 46 checks/0 problems; diff check against ca7c1fe passed.
Measured:    Median seconds Easy/Medium/Hard -> rounded Bronze/Silver/Gold: airport 151.9/133.2/106.9 -> 152/134/107; nyc 217.7/169.1/130.7 -> 218/170/131; shibuya 108.7/81.3/75.4 -> 109/82/76; park 172.9/141.0/111.1 -> 173/141/112; bridge 184.0/153.5/123.5 -> 184/154/124.
Method:      Throwaway harness script (removed), seeds 11/22/33, 0.1-second steps, default idle player, three bots/run; nine completed bot times per cell except Park Easy and Bridge Easy (seven before player finished); all orders strict.
Not checked: Real phone play, perceived target fairness, manual visual review; fit checks use browser automation.
Off plan:    none
Trouble:     Slow initial 30 Hz measurements; restarted at 10 Hz, so targets need Director play tuning.
