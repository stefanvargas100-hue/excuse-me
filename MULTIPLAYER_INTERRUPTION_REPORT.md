# Multiplayer interruption hardening

The existing Supabase Realtime Broadcast transport is retained. The working private-room, cross-network race flow does not require a new server for this task. The earlier architecture proposal in `INTERNET_MULTIPLAYER_PLAN.md` is not an implementation prerequisite; the owner's real cross-network play supersedes its deployment uncertainty.

## Defined behavior

| Interruption | Behavior |
| --- | --- |
| Guest explicitly leaves lobby | Removed immediately; may rejoin with a new player identity. |
| Guest silently loses lobby connection | Identity retained during a 30-second silence grace period; local socket reconnection is attempted. After expiry, host removes the old identity. Rejoin explicitly. |
| Host leaves lobby | Guests leave that lobby with an explanation. No host migration. Silent host loss closes guest lobbies after the grace period, including loss immediately after the first roster. |
| Brief socket drop during race | Reconnect on the same room/player/race, without restarting the countdown. Local simulation continues while the phone remains foregrounded. Recovery must occur before peers expire the silence grace period. |
| Guest leaves race or is silent too long | Other racers continue. A DNF row is retained rather than silently deleting the player from results. |
| Host leaves race | Other racers may finish. Host's known results accompany the departure; no further rematch in that room. Create a new room. |
| Phone backgrounds during an unfinished race | Immediate local DNF, broadcast and repeated while still connected. Returning cannot restart that race. This deliberately prevents suspended simulation from being treated as a competitive resume. Finished racers keep their finish when backgrounded. |
| Phone backgrounds in lobby | Short absence can recover. Returning after 30 seconds closes the stale local lobby and asks the player to join/create again. |
| Start packet missed | Host's repeated roster carries the active race. Recover during its remaining countdown; if countdown has ended, show DNF rather than start a late race or stay stuck in the lobby. |
| Duplicate/late traffic | Race IDs scope race messages, roster/result revisions reject older snapshots, started seeds reject duplicate starts, and old socket/session callbacks cannot mutate replacement rooms. Explicitly retired player IDs cannot reappear through delayed hellos. |
| Missing finish/rematch packet | Repeat finishes and rematch requests on the room heartbeat. Host retains and repeats accepted results, including finishes from departed players. End screens refresh as late finishes arrive. |
| Host rejects an unconfirmed finish after grace | Its repeated result snapshot marks that returned player DNF too. A local finish that never reached the host does not override that terminal verdict. |
| Connected racer never finishes | Ten-minute race deadline prevents unlimited waiting, even if keepalives continue. |

Socket health uses Supabase's Phoenix heartbeat acknowledgements, rather than relying only on browser close events. Reconnection uses a fresh socket with the existing identity. Explicit leave invalidates old callbacks and pending join attempts. Public room codes and sender IDs retain their existing trust model; this is interruption recovery, not anti-cheat or authenticated private-channel authorization.

The lobby displays reconnecting players. Race interruption notices are visible above the game. Results label unfinished racers as pending or DNF and retain a deterministic order for equal times. Single-player physics, scoring, Supabase Auth/leaderboard requests, database schema and personal/friend/top-three ghost formats are unchanged.

## Automated verification

Regression failures were reproduced before the corresponding fixes. `test/interruptions.test.js` runs isolated game bundles as separate clients against an asynchronous in-memory channel with controlled drops, callbacks, clocks and visibility events. `test/room.test.js` checks the transport with fake WebSockets, including half-open sockets and callbacks arriving after leave/replacement.

Coverage includes 2- and 3-client interruption cases, departure, rejoin, stale rosters, duplicate starts/finishes, lost results/rematch/start packets, never-received first position, prolonged live keepalives, and pending-join cancellation. Existing tests additionally exercise lobbies/rematches with up to eight clients, leaderboard queues, and personal/friend/top-three ghosts.

The earlier five-simulation-second lobby regression was changed to the intentional 30-wall-clock-second recovery policy. Its isolation check remains: only the silent player is removed, and the responsive racer stays. No assertion was loosened to hide a failure.

Initial verification: `npm.cmd test` passed **296/296 tests**, including 19 new multi-client interruption tests and two new socket regressions. `npm.cmd run build` passed, and `git diff --check` passed. Tests are simulated, not actual Supabase traffic or physical phone tests. No live load test, deployment, SQL migration, paid service, or account change was performed.

## Remaining limits

- All players should use the same build. Older cached builds do not implement the new race/result envelopes; mixed-version rooms are not validated here.
- Rooms remain ephemeral browser-coordinated sessions. Refreshing/killing a page loses its player identity; a new identity cannot join a race already in progress.
- The host settles outcomes while present. After host departure there is no durable coordinator to recover results lost by every remaining phone. A long partition combined with host departure can still prevent a common final result; create a new room rather than treating those outcomes as ranked results.
- Browser visibility and suspension behavior varies by device. OS termination may prevent the immediate DNF broadcast; peers then use the silence timeout. Half-open socket detection and retry time reduce the effective recovery window; it is not a promise that every 29-second outage recovers.
- No change was made to frame timing, crowd determinism, collision authority, or client-reported finish times. This preserves existing game feel but does not provide server-authoritative fairness.

## User-reported phone verification — 2026-11-07

Stefan and a friend accessed the updated build through the temporary public Cloudflare test link. After receiving the normal-race/rematch, lobby leave/rejoin, host departure, background/return, brief-drop and prolonged-disconnection checklist in chat, Stefan reported: "I tested everything and it all works well."

This is user-reported successful real-device testing, distinct from the automated simulations above. Device models, browsers, interruption durations and individual observations were not recorded; do not infer verification of every variant below, including three-phone cases. The main live site remains unchanged.

Subsequent phone feedback found a missed recovery path: after host departure, the result screen instructed the player to create a new room but did not provide a working action. A UI regression reproduced the failure before the fix. The enabled new-room button now leaves the old session and opens the room creation/join screen; the regression clicks through actual handlers and creates a new room for both the departed host and remaining guest. The temporary test build was updated for another phone check; this does not update the main live site.

Follow-up verification: the full suite passed **297/297 tests**; the focused interruption/rematch/screen suite passed **29/29**, and the production build and whitespace check passed. The public temporary link's JavaScript was fetched and its hash matched the rebuilt local bundle. The corrected phone interaction still needs user confirmation.

## Detailed phone checklist for repeat testing

When the updated build is available through an approved test URL, use that same build on both phones; preferably one on Wi-Fi and the other on cellular. The existing live URL has not been updated by this task. Repeat in Safari/Chrome and installed home-screen mode where used.

1. **Baseline:** create/join by code, race and finish, then both ask for rematch. Expect the same roster, seed/stage, final ordering/times, and one new race.
2. **Lobby loss:** guest disables connectivity for about 5 seconds while keeping the page foregrounded, then restores it. Expect recovery with one roster entry. Repeat for over 30 seconds: expect removal and explicit rejoin. Host leaving the lobby should return guests to room choices with a host-left notice.
3. **Race loss:** interrupt a guest's connection briefly without switching apps (toggle Wi-Fi at the router or use browser offline controls). Expect the same race on recovery and late results to converge. Repeat beyond the grace period: expect DNF and no runner resurrection. Repeat for the host.
4. **Background/lock:** background an unfinished racer and return. Expect local DNF and peers able to finish; no countdown restart. Background in the lobby briefly, then for over 30 seconds: expect recovery, then stale-lobby exit respectively. If the OS suppresses delivery, peers may need the timeout.
5. **Host departure:** with three phones, host leaves during the race. Expect remaining racers to finish, host shown as finish/DNF as appropriate, and rematch disabled with a new-room instruction. Also have a racer finish and leave while another phone is briefly offline: on recovery, expect the host's retained result.
6. **Rejoin and repeats:** guest leaves/rejoins the lobby; tap Start/Rematch repeatedly; disconnect around the finish line. Expect no duplicate roster entry, one new race, stable accepted times, and explicit DNF if the host could not confirm a finish within grace. Finally check a solo leaderboard score and existing ghost playback for regressions.
