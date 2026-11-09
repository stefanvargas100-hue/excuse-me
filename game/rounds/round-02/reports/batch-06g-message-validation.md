Outcome:     done
Branch:      stefanvargas100-hue/countdown-recovery; implementation 2c4cc38, preserving prior integration.
Changed:     Follow decisions only after accepted Cup updates; reject unrelated attempts before consuming awaitingStart; PROTO 7 and courseTag retained.
Checks:      Three new regressions failed first on valid cancellation unable to heal pending start: stale revision/unrelated seed, wrong PROTO/carry-on, accepted unrelated attempt; now pass with duplicate and same-seed restart/finish checks.
Checks:      Focused host-handover/friendcup-room/start-sync 71/71; final full suite 682/682; build and git diff --check passed.
Simulation:  tools/room-sim.mjs completed 2/4/8-human Cups and 4-human host departure during race 2; each completed all four races without live networking.
Not checked: browser, real phones, live network; independent re-review required before merge.
Off plan:    none in changed files; full suite repeated to validate corrected regression input after first run loaded its earlier version.
Trouble:     Initial regression injected a fabricated revision 100 ahead, blocking legitimate future results (first suite 679/682); removed that unrelated input while retaining duplicate, same-seed restart and finish assertions, then focused and full suites passed.
