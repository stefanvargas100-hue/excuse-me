# First internet multiplayer milestone

Investigation: 2026-11-07. Proposal only; no deployment, account changes, live database access, or paid services authorized by this document.

## Findings from this checkout

The supplied deployment context remains unverified. The repository contains more online code than that context implies: `src/online/room.js` already opens an outbound secure WebSocket to Supabase Realtime Broadcast. It is not a LAN socket or direct phone-to-phone connection. If enabled in the project, this transport can connect phones on different networks without port forwarding. Source presence does not prove production configuration or availability.

`NEXT_STEPS.md` contains historical claims about live multiplayer and load tests, alongside outdated TODOs. Treat those as historical notes, not current deployment evidence. `.github/workflows/deploy.yml` describes static publishing; it does not provision a game server.

Reusable pieces:

- `src/online/duel.js`: host/join flow, roster, stage selection, seeded starts, eight-player slots, rematches, names/outfit validation, and local friend-ghost exchange. Its injectable `useRoomFactory` provides a useful transport seam, though server-owned membership requires changes above that seam too.
- `src/ui/friend.js`: phone lobby, room code and invite link UI. `src/input/input.js`, canvas rendering, and the installed browser experience remain usable.
- `src/online/remote.js`: sequence checking, smoothing and bounded extrapolation. Reports currently run at 10 Hz for two players, 5 Hz for larger rooms.
- `src/sim/game.js` and `race.js`: seeded race setup, start slots, remote racers, finish presentation, and local controls. Multiplayer already excludes bot power-ups and skips race-best unlock handling.
- Existing room, duel, lobby, rematch, ghost, and simulation tests provide regression coverage. `tools/loadtest.mjs` contacts the real Supabase project: do not run it as part of local verification.

Supabase persistence is separate: `src/online/board.js` handles anonymous Auth, token refresh, score submission/offline queues, and top-three ghosts through REST. `supabase/schema.sql` defines score/ghost tables, ownership policies, classic best-score rules, and ghost pruning. It contains no live-room membership policies. Local personal/friend ghosts also use browser storage. Preserve all of these paths and storage keys. The checked-in publishable key is a public client identifier, not proof of room authorization; never ship a service-role key.

Missing for a dependable private internet race:

- Four-character random codes have no collision reservation or server-owned room registry. Client-provided IDs and first-heard host selection do not authenticate senders. A person who finds a channel can impersonate messages.
- `hostStart()` broadcasts and starts immediately; guests start on receipt. There is no readiness barrier, clock-offset measurement, scheduled start, or protocol/build compatibility check.
- `S.time` advances using local simulation time. `src/main.js` applies local slow motion/hit-stop and caps long frame gaps. These cannot define a shared race clock.
- A shared seed is not a guarantee of identical evolving crowds: simulation timing, locally influenced crowd movement and streamed chunk generation can diverge. Current racer collisions are resolved independently too.
- Finish times are self-reported, sent twice without acknowledgement, and no server publishes a canonical result. Race messages have no race identifier, permitting delayed traffic to affect rematches.
- Disconnect policies conflict: race silence is five simulation seconds, lobby silence is thirty wall-clock seconds. No automatic recovery or room snapshot exists; an opponent who never sends a first position can evade the race silence check.

## Recommended architecture

Keep the static Vite/PWA frontend on its existing static host. Add one small Node.js HTTP/WebSocket service, initially one process and one region, using `ws`. Recommend Render as a straightforward hosting target after a separate deployment decision.

    Phone A -- HTTPS/WSS -- room service -- WSS -- Phone B
        |                                          |
        +------ existing Supabase REST/Auth --------+

The service owns in-memory room allocation, authenticated connection identities, roster, readiness, race ID/seed/stage, start deadline, last accepted snapshots, disconnect status and final results. The host is a lobby role, not the network server. Both phones connect outbound over port 443; separate Wi-Fi/cellular networks need no router changes or WebRTC/TURN infrastructure.

For this milestone, each phone still simulates its own runner and crowd immediately, and sends positions at 10 Hz. The service validates and relays them, stamping the sender from the connection instead of trusting a payload ID. It owns coordination and the race timeline, **not authoritative physics**. Private friends can race with responsive controls, but cheating, perfectly identical crowd interactions, and globally exact collision resolution remain outside this milestone. Do not present results as ranked or submit them to existing boards.

Use wall-clock elapsed time mapped to the server timeline for online countdowns and finish display; keep visual slow motion separate. Preserve single-player timing. A common seed and start do not make the whole simulation deterministic. If identical shared crowd/physics is required, extract a DOM-free fixed-step simulation and run it on the server with input prediction/reconciliation; do not promise that as a small transport change.

Supabase continues its existing leaderboard, ghost and Auth work. The new service needs no Supabase credentials, tables, policies, database writes, or per-frame persistence. Issue its own short-lived opaque player/rejoin tokens for invite sessions. Existing anonymous Auth could identify accounts later, with server-side JWT validation, but is not required for this two-person milestone.

### Alternatives and costs

Planning estimates in USD, checked against provider documentation on 2026-11-07; recheck before purchase. Existing Supabase charges are unchanged and unknown.

| Option | Incremental budget | Assessment |
| --- | --- | --- |
| Existing Supabase Broadcast | Potentially $0 within existing quota | Fewest transport changes; possible cross-network prototype. Still needs synchronization, identity/membership security and lifecycle work. Secure private channels require Auth/RLS configuration, a separate live-project decision. |
| Render free web service | $0 within free limits | Suitable for an explicitly approved experiment; sleeps after 15 idle minutes, creating cold-start delays. |
| Render Starter, one service | About $7/month compute, plus applicable usage/tax | Recommended small beta target; budget roughly $7–10/month at light traffic, not a guaranteed all-inclusive cap. No Redis/database/custom domain needed. |

Render supports public WebSockets and recommends WSS. Connections can close during maintenance/deployments. Single-process rooms disappear on restart; show an explicit session-ended message and create a new room. Do not horizontally scale an in-memory registry without room routing/shared coordination.

Supabase Free currently lists 200 peak Realtime connections and 2 million monthly messages; limits include 100 messages/second. At two players sending 10 positions/second each, budget roughly 40 billed message events/second including recipient delivery, or 12,000 per five-minute race before control/ghost traffic. Multiple rooms and fan-out matter; old brief load-test notes are not capacity evidence. Its Pro plan starts at $25/month; upgrading only for this race relay is unnecessary under the recommended architecture.

Sources: [Render pricing](https://render.com/pricing), [free service limits](https://render.com/docs/free), [WebSockets and restart behavior](https://render.com/docs/websocket), [Supabase pricing](https://supabase.com/pricing), [Realtime billing](https://supabase.com/docs/guides/realtime/pricing), [Realtime limits](https://supabase.com/docs/guides/realtime/limits), [private channel authorization](https://supabase.com/docs/guides/realtime/authorization).

## Small implementation milestone

Scope: exactly two players, private invite only, one stage initially, no accounts UI, public matchmaking, bots, ranked results, shared pickups, or mid-race rejoin. Preserve existing offline and single-player features.

1. **Service and protocol.** Add `server/` with health endpoint and room state machine: lobby → preparing → racing → finished/aborted. Generate cryptographically random six-character readable codes, reserve atomically, retry collisions, expire idle rooms after 15 minutes. Create/join over HTTPS or the socket; return opaque connection tokens. Cap rooms at two and reject absent/full/started/expired rooms. Version the protocol and game rules/build.
2. **Client integration.** Add an environment-configured endpoint and dedicated transport adapter. Adapt `duel.js` to server-owned rosters and typed lifecycle events; update code cleaning, input limits, labels and invite parsing for six characters. Keep legacy Supabase transport isolated for regression purposes, not as an automatic fallback to an unsecured room. Exchange existing friend ghosts only between admitted members, with bounded payloads; preserve formats and local saving.
3. **Synchronized start.** Both clients load the same stage/seed/roster and acknowledge ready. Estimate server clock offset with several ping round trips using monotonic client time. Server announces a start at least three seconds ahead; both acknowledge it before a cutoff. Cancel/reprepare if either cannot meet the deadline. Display countdown against that deadline and unlock controls at zero. Refuse stale race IDs and incompatible builds.
4. **Race and result.** Keep input local; relay validated sequenced snapshots with race ID and elapsed time. Acknowledge and deduplicate finish reports; compute elapsed from the shared start mapping and sanity-check against progress/receipt timing. Publish one retained results snapshot to both phones; retry until acknowledged. These remain client-trusted times, not anti-cheat proof. Resolve ties consistently (e.g. within 50 ms, joint place). Apply a five-minute race timeout and mark unfinished racers DNF.
5. **Failure behavior.** Show degraded connection promptly. Stop extrapolating after a short bound; never let a disconnected remote runner remain a solid invisible obstacle. Heartbeats use wall time. Allow token-based lobby reconnection for 30 seconds. For the first milestone, socket loss or backgrounding during the race marks that racer DNF; the other may finish. On return, fetch the result rather than resume simulation. Host leaving the lobby ends the room; during a race the service continues for the remaining player. Service restart aborts the session. Defer seamless racing reconnect and host migration.

Security: HTTPS/WSS only in production; allowlist frontend origins, but treat tokens as the authority. Room codes are limited invite secrets, not accounts or strong privacy guarantees. Rate-limit create/join attempts per source and connection, limit total rooms and payload sizes, validate finite values/bounds/sequences, reject clients attempting roster/start/result impersonation, and limit outbound buffering for slow consumers. Never log tokens. Expire tokens with the room. No service-role credential is needed.

Latency: choose the region nearest the first testers and measure rather than promise a ping. Target RTT below 150 ms and common-start skew below 100 ms on ordinary Wi-Fi/cellular. Start with current smoothing, then tune a 100–150 ms remote interpolation buffer; local controls must never wait for network responses. TCP loss can cause stalls, and distant players will see delayed racers. At 200–300 ms RTT test graceful degradation and collision jitter. This beta cannot guarantee fair close-contact collisions at high latency.

Phone compatibility: retain current touch controls, portrait layout, Safari/Chrome and home-screen PWA use. Use a publicly reachable HTTPS game URL, never a host's LAN URL in invites. Service-worker offline assets can still support solo play; room creation requires internet. Reject mismatched cached builds with an update prompt at the menu. Test backgrounding, screen lock and network switching explicitly; phone browsers may suspend timers/sockets.

## Verification and completion gate

Implementation estimate: roughly 4–7 focused developer days including phone testing, assuming coordination with client simulation is acceptable. This is a planning estimate, not a commitment to full authoritative gameplay.

Before behavioral implementation, add failing tests using the existing Node test approach. Cover code collisions/expiry, connection-bound identity, room capacity, host permissions, race IDs, readiness/deadline failures, clock offset, duplicate finishes, result convergence, never-received snapshots, disconnect/background policies and incompatible builds. Run server integration tests with two real local WebSocket clients plus controlled delay/drop/reconnect. Run existing tests and production build; preserve leaderboard requests/queues and local/top-three/friend ghosts. No live load test is needed for those checks.

After separate staging deployment approval, acceptance is: one real phone on Wi-Fi creates a room, another on cellular joins by code, both see the roster and matching stage, both start within the target skew, both finish, and both receive identical results. Repeat at least ten races, then test invalid/full codes, guest loss, host loss, screen lock, stale build and server restart. Capture RTT, start skew, disconnect reason, dropped snapshot counts and result acknowledgements without personal data or secrets. Existing solo scores and ghosts must still behave as before.

Decisions needed later: approve this client-simulated private-beta scope; select hosting region and free experiment versus paid always-on service; authorize staging/deployment and any spend. Supabase live changes are neither required nor proposed for this architecture. This investigation changed documentation only and did not verify the live Supabase configuration or run tests that contact it.
