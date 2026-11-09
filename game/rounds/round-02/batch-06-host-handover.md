# Round 02, batch 06: a new host takes over, and a simulated room

**Builder:** codex, defaults. Why: the Director chose Codex for Round 2. Online work is high risk, so a second review by Claude follows.
**Risk:** high. Second review: yes, by Claude, before merging.

## Goal
1. **Host handover.** When the host leaves a Friend Cup, a remaining player becomes host, so the Cup and its bots carry on. Today the bots stop and the Cup ends. Public play with strangers waits for this.
2. **A simulated room.** The Director has no group for a public playtest, so we measure a full room in a simulation instead of on phones. This replaces "measure message rates" in `matchmaking-spec.md`.

## Read first
- `game/areas/online.md`, all of it
- `src/online/duel.js`: the Friend Cup section from line 56, `cupHostGone` (about line 285), and roster and heartbeat handling
- `src/sim/friendcup.js`: `hostLeft`, `playerLeft`
- `game/rounds/round-02/matchmaking-spec.md`, section 4
- The simulated-connection tests: `test/friendcup-room.test.js`, `test/lobby8.test.js`

## Host handover rules
- **New host:** the first remaining human player in roster order. Every phone works this out the same way, from the same roster, so two hosts can never exist. A host who left and comes back does not take the role back.
- **When:** at the moment the host is seen to have left, using the existing departure detection. Use no new timers unless the plan's rules cannot hold without one.
- **Bots:** the new host runs them from their last reported positions. A small jump is acceptable. A bot never finishes twice, and its finished times stay.
- **The Cup:** standings, finished races and who has left all carry over unchanged. If no humans are left, the Cup ends as today.
- **Mid-race and between races** both work. If the host leaves during the countdown, that start is cancelled, never half-run, and the new host starts it again.
- Validate every message about the new host: an unexpected sender claiming to be host is ignored.
- Plain friend races and elimination keep today's behaviour unless the change falls out for free. Say which you did.
- Raise `PROTO` from 5 to 6. Tests hard-code it: `test/friendcup-room.test.js`, `test/interruptions.test.js`, `test/lobby.test.js`, and possibly others, so search for them. Another batch may also raise `PROTO`; the lead reconciles that at merge.

## Simulated room
- New `tools/room-sim.mjs`: N simulated phones in one process, on the same simulated connection the tests use. **No Supabase.** Each plays a full 4-race Friend Cup of 8 racers (N humans, the rest bots).
- Count messages sent and received per phone per second, and in total: average and peak, and for the host and a guest separately.
- Run it with 2, 4 and 8 humans, plus one run where the host leaves mid-race 2. Put a table in the report. In that run, the Cup must finish.
- Add one test that runs a short version of the host-leaves case.

## May edit
- `src/online/duel.js`, `src/online/remote.js`, `src/online/start-sync.js` (only if the start must be redone), `src/sim/friendcup.js`
- `src/sim/race.js`: only code that adds, hands over or restores bots. Not `think()` and not `DRAFT_*`: another batch is changing those.
- `src/ui/friend.js`: messages shown when the host changes, such as "Sam is now hosting"
- `tools/room-sim.mjs` (new), `test/host-handover.test.js` (new), and existing tests only where they hard-code `PROTO` or assume the Cup ends when the host leaves
- `game/rounds/round-02/reports/batch-06-host-handover.md`

## Must not change
Do not run `tools/loadtest.mjs` and do not contact Supabase. Keep the live database, the race rules, and how a player races.

## Done when
- Tests that failed first now pass: a new host is chosen identically on every phone; the old host returning stays a guest; bots carry on; the Cup finishes; a fake host claim is ignored; a countdown is cancelled then restarted.
- Focused online tests (`room`, `duel`, `lobby`, `lobby8`, `ready-start`, `start-sync`, `interruptions`, `friendcup-room`), then `npm test`, `npm run build` and `git diff --check` pass.
- The message table is in the report.

## Left for a person
Two or more real phones on the playtest link, where the host closes the app mid-race.
