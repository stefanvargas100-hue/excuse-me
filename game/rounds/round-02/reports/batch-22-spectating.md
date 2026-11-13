Outcome:     partial
Branch:      stefanvargas100-hue/spectating; implementation ab523cf (report commit follows)
Changed:     Auto-watch running friends/bots after finish or elimination; cycle, auto-switch, one-way stop, cut camera; solo/DNF unchanged.
Checks:      Primary regression failed first; final spectate 7/7, room 60/60, medals 79/79; build and diff check pass. Bot times and host/guest message logs identical watching/stopped.
Checks:      Full suite ran once before final fixes: 942 pass, 4 fail, 2 skipped; 3 failures fixed and focused reruns pass; Skytree calibration terminated after 293s. No final full-suite pass.
Not checked: Required host/guest browser screenshots incomplete (capture fixture failures; invalid captures removed), real phones, smoothness, handover/reconnect browser flows; independent review required.
Not checked: Fit ran: 71 checks/37 problems versus lead's 36; attribution of the extra problem unverified, spectate screen not covered by checker. Existing crowd simulation retained; no extra crowd generated for camera.
Off plan:    Coordinator approved stepRemotes sampleOnly argument to prevent additional traffic; initRace initializes per-race presentation state.
Trouble:     Browser relay fixture failed readiness twice and finished both humans before guest capture; capture script corrected but not rerun; full-suite Skytree calibration slow. Evidence logs retain earlier failures.
