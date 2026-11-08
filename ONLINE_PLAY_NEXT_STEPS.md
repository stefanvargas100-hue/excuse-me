# Online play: plan and implementation milestone

Base: origin/main `75f3cd4` (includes interruption recovery, scenery, offline updates, shared pause and collision fixes). Work in the separate `online-ready-start` checkout. Preserve the older checkout and live database. This plan does not authorize a new deployment, paid service, or schema change.

## Implement now: readiness, scheduled starts, connection feedback

1. Add a small, independently testable lobby coordinator over the existing Supabase Broadcast transport. The host remains the coordinator; keep gameplay local, with no new backend or persistent tables. Version the lobby protocol so mixed clients get an update message instead of a partially working start.
2. Everyone, including the host, explicitly presses Ready. Stage changes, roster changes, backgrounding, and connection loss clear readiness. Repeat readiness messages, scope them to the room/configuration and sequence them so duplicates and late packets cannot re-ready someone. Rematch votes remain the existing explicit agreement to another race.
3. Measure guest-to-host clock offset and round-trip time with matched probes using monotonic clocks. Keep recent low-RTT samples; reject unsolicited, stale, nonfinite and unreasonable samples. Describe connection quality as checking/good/slow/reconnecting, with RTT where available. Block starts if timing or membership is not confirmed.
4. On Start, schedule GO three seconds ahead on the host's clock. Prepare → acknowledge → commit → acknowledge → release; repeat control messages before the deadline. Only the host can issue plans, tied to a unique round and exact roster/stage revision. Cancel back to the lobby if acknowledgements are missing, someone un-readies/leaves, or the host disconnects before release. Once released, freeze movement until the shared deadline using real monotonic time, independently of frame rate and slow motion. A release arriving after its deadline is a missed start, never a free late start.
5. Keep normal race simulation, scoring, shared pause, finish replication, DNF behavior, and ghost exchange. Preserve the existing new-room recovery button. A shared pause may hold movement after the scheduled deadline; resuming catches the countdown up rather than restarting it. Arbitrary network partitions cannot provide atomic delivery without a server: document that limit rather than promise exact synchronization on every network.
6. Add phone-friendly Ready/Not ready actions and per-player readiness/connection labels. Show preparing, cancelled and reconnecting states, and an actionable update message for incompatible builds. Avoid overwriting useful race interruption messages with ordinary heartbeat text.

## Verification

Write and observe failing behavioral tests first. Cover no-start-until-ready, guest/host readiness, stage/roster reset, duplicate and reordered ready messages, clock offset and drift assumptions, delay/jitter, missing/duplicate prepare/commit/release, cancellation, stale rounds, 2/4/8 clients, late release, lost connection and backgrounding around Start. Existing lobby fixtures must explicitly ready players; simulated game steps must advance a controlled monotonic clock for the new deadline. Do not loosen assertions to bypass the new rules.

Run the complete suite and production build. Check actual browser UI controls and two browser clients using the existing relay where available. Keep database HTTP writes blocked during browser tests. Distinguish browser emulation/controlled-clock checks from real-phone verification. Acceptance on phones: Wi-Fi host and cellular guest both ready, start together, see matching results, rematch, pause/resume, and recover or cancel predictably if a phone leaves during preparation. No touch-device timing or latency target is considered verified until measured on devices.

## Following milestones (after this foundation)

1. Tune remote interpolation and collisions from measured latency, including larger 4–8-phone sessions and older-device performance.
2. Improve interrupted-race recovery and shared pause/resume coordination using this clock and connection telemetry; agree on fairness rules before changing background DNF behavior.
3. Add host transfer with a single elected authority and recovery snapshots.
4. Synchronize multiplayer power-up ownership and collection.
5. Design race history separately from current boards/ghosts; any persistence or database change needs its own decision.
6. Add public matchmaking after private rooms and capacity limits are validated. Consider a dedicated authority/server only when requirements justify it.

Completion means a tested, reviewable milestone in this branch. Publishing to main is a separate release step.

## Implemented and verified

The first milestone is implemented: explicit readiness, configuration-scoped confirmations, monotonic clock probes, a host-issued shared deadline, acknowledged/retried start preparation, bounded cancellation, version checks and visible readiness/connection labels. The full suite passed **343 tests**; the production build and whitespace check passed. The newer shared pause, room recovery, scenery, leaderboard and ghost behavior remain covered.

Two desktop Chromium clients used the actual Supabase relay to join, ready, start, finish with matching result rows, rematch, and pause/resume. Measured calculated deadline differences were approximately 2.2 ms initially, 5.25 ms on a rematch, and 1.45 ms after a cancelled preparation and retry. These are same-computer browser observations, not phone or internet-latency guarantees. Rendering of background tabs was throttled, so finish checks used controlled simulation steps and the existing finish-line hook. Dropping every commit acknowledgement in the guest's actual socket caused both clients to cancel to a usable lobby; re-readying and retrying succeeded. No captured JavaScript errors were observed.

A simulated eight-player roster was visually inspected at 390 × 640 and 390 × 844. The short-screen check initially reproduced clipped controls; compact labels and sizing now keep Ready, Start and status visible without clipping. The 390 × 640 card's scrollHeight and clientHeight both measured 600 px. The eight-player network tests remain simulated; physical eight-phone capacity/performance testing is still a later milestone.

Existing test fixtures now explicitly ready their players and advance the scheduled countdown with a controlled monotonic clock. The background-before-start assertion intentionally changed from forfeiting an already-started race to preventing that race from starting. Other interruption, results, shared-pause, rematch and ghost assertions were retained. No Supabase schema, leaderboard/ghost client, dependency, or production hosting workflow was changed.

## Phone acceptance checklist for this milestone

Use the same updated test build on both phones. An older main build is intentionally incompatible with this new lobby protocol.

1. Join from Wi-Fi and cellular. Start must stay disabled until both players press Ready and connection checks finish. Both lists should show the same ready states and a connection/latency label.
2. Change stage or add/remove a player. Confirm readiness resets and nobody starts until the current roster readies again. Switching apps in the lobby must also clear readiness.
3. Start together and compare the 3–2–1–GO countdown, then finish and compare results. Record both screens if measuring actual start skew; desktop measurements above do not establish phone timing.
4. Interrupt a connection while the lobby says Preparing race. Expect a cancellation/update message or a clean room exit, with an actionable way to ready/rejoin; no permanently disabled controls. Once the race/countdown screen has been released, the existing background-DNF rule applies.
5. Pause/resume a race, request a rematch, then have the host leave. Confirm shared pause and the enabled new-room recovery action still work.

The milestone is complete as a development candidate. Main has not been published with these changes; physical-phone verification is pending.

## Continued integration and interruption review

Integrated origin/main `1f41ac9`, preserving the newer character, weather, crowd, podium, Customize and narrow-phone HUD updates. No main push or live database change was made.

The review reproduced a new failure before fixing it: after a silent packet gap, the host cleared a guest's acknowledged readiness but the guest kept its earlier local ready request and remained stuck on Confirming. A host acknowledgement now settles that matching request; an older acknowledgement still cannot overwrite a newer local Not ready request. Coordinator and actual-button regression tests cover recovery without a socket close event.

The updated combined suite passed **353/353 tests**, the production build passed, and the whitespace check passed. The actual-relay browser check blocked all guest broadcasts while allowing the socket heartbeat to continue: the host cleared readiness, the same still-open socket recovered, Ready became usable, and a new confirmation allowed Start. Both clients then started again and received identical final results with the latest visuals. Calculated deadlines differed by about 1.35 ms on this computer. Browser checks used the same controlled simulation/finish hooks described above and do not substitute for physical-phone timing or performance verification.

## iPhone dash viewport report

Phone testing reported a guest's canvas shifting upward after repeated left/right dashes, leaving blank space below while the fixed HUD stayed at the bottom. The exact native iOS failure has not been reproduced locally. Two relevant weaknesses were reproduced with failing tests: race touch events did not explicitly cancel browser gestures, and room-code/menu inputs were not explicitly blurred before being hidden. WebKit has documented gesture handling failures on positioned elements (https://bugs.webkit.org/show_bug.cgi?id=218015) and viewport shifts after input focus (https://bugs.webkit.org/show_bug.cgi?id=271829); these support the diagnosis as a possibility, not proof for this device.

Race-canvas touch start/move/end events now explicitly cancel native gestures using non-passive listeners. Pointer events still exclusively drive gameplay. Joining dismisses the room-code keyboard, hiding menus releases focus, and the canvas is fixed to the viewport. Menu gestures and noncancelable events are left alone. No multiplayer protocol, leaderboard or ghost changes were made.

All three added regressions failed before the fix, then passed. The full suite passed **356/356**, production build and whitespace checks passed. A desktop Chromium browser at 390 by 844 used synthetic pointer/touch events for six alternating double-tap dashes: all six spent stamina, all 36 cancelable touch events were prevented, canvas bounds remained at (0,0,390,844), focus was released, and no JavaScript errors occurred. This is simulated event/viewport verification, not native iOS gesture or keyboard verification.

Phone retest: both players open the fresh temporary test URL. The iPhone guest joins by typing a room code, checks the keyboard disappears, readies and starts. Dash left three times, then right three times, then alternate ten times, allowing stamina to recover. The scene must continue filling the screen without vertical jumps or a blank lower area, and each valid dash must still work. Repeat after a rematch, then swap host/guest roles; verify pause/resume and two-thumb burst/shout controls. If it recurs, capture a screen recording and note iOS version and whether opened in Safari, an in-app browser or from the home screen. Main remains unchanged pending this retest.
