Outcome:     done (review only; two findings)
Branch:      stefanvargas100-hue/review-friend-cup; reviewed 8300da7
Changed:     This report only; implementation unchanged.
Checks:      Requested test run: 80/80 pass; two additional in-memory simulated-connection reproductions confirmed below; diff --check clean.
Not checked: Full suite/build (review plan excludes full suite); browser and real phones.
Off plan:    none
Trouble:     none
- **must fix** `src/online/duel.js:278`: A guest pauses, then leaves (or times out). `cupRacerGone` sets `P.ai` without removing its pause vote or calling `syncDuelPause`; the Cup bye path bypasses the normal cleanup and later messages from the retired identity are ignored. Reproduced: host stays `paused` with the departed ID in `pausers`, although its runner is now AI. The Cup cannot resume.
- **should fix** `src/online/duel.js:528` (also line 507): A guest finishes, then loses connection between races without a bye. The heartbeat removes/retire-marks it from the roster but skips `cupRacerGone` because `p.fin` is set, so the host's Cup still says `bot:false,left:false`. Reproduced: starting the next race creates an absent human remote (`ai:false`) rather than the required takeover bot; takeover waits for another heartbeat, and surviving guests can receive inconsistent left status until then. Mark departed Cup racers when pruning the roster regardless of their finish status.
