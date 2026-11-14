# Round 02, batch 26: mid-Cup reconnect, bounded investigation

**Builder:** Claude Sonnet 5.5, high. Why: under the Claude-only rule; online code, but the work starts as an investigation with a capped fix.
**Risk:** high if a fix lands (online). Second review: yes, by a fresh Claude Opus worker, only if source changes.

## Problem (S3, inherited)
After a guest briefly loses the connection in the middle of a Friend Cup and rejoins, the host's request for the next race leaves that guest's game in `'won'` instead of `'play'`. The same happens on `develop` before batch 18, so it is old. It may be a real defect, or only a limit of the test fixture: the fixture's clock may not resync after the rejoin.

Evidence: `game/rounds/round-02/batch-18e-evidence/reconnect.cjs` (lines 70-78) and `reconnect-develop.txt`. That fixture uses the old free-pick stages `[2, 0, 4, 1]`, which the current preset Cups reject. Use a city preset instead, for example Tokyo `[2, 6, 7, 8]`.

## Read first
- `game/rounds/round-02/batch-18e-evidence/reconnect.cjs`
- `test/friendcup-room.test.js` and `test/interruptions.test.js` (how they model a dropped socket and a clock)
- `src/online/duel.js`: `bindRoom`, `heartbeat`, `receiveCup`, `cupNextRace`, `beginRace`, and the guest start-following code (`followStart`, `cancelStart`)
- `src/online/start-sync.js`: how a guest that rejoins gets its clock and start schedule back

## Steps (stop after 2 failed attempts at any one step, as AGENTS.md says)
1. **Reproduce** on current `develop` with a committed test in a new `test/cup-reconnect.test.js`: host plus 1 guest, Tokyo Cup, brief guest drop and rejoin, finish race 1, host asks for race 2. Mark it `todo` if it fails.
2. **Find the cause.** Trace why the guest stays `'won'`: the start never reaches it, it reaches it and is refused, or it is accepted but the race never begins. Decide and justify one of:
   - **(a) Fixture limit:** the real game would recover, but the fixture does not model something, for example the clock resync. Prove it by modelling that piece; the test then passes with no source change.
   - **(b) Real defect:** a phone would also get stuck.
3. **If (b) and the fix is small**, meaning `duel.js` and/or `start-sync.js` only and about 40 changed source lines or fewer:
   - Fix it, keeping `PROTO` 14 unless the wire format must change.
   - The test must fail before and pass after.
   - Existing room, Cup, Elimination, room-bots and spectate tests pass unedited.
4. **If (b) and the fix is larger**, do not build it. Report the cause, the files involved and a proposed fix for the lead to plan.

## May edit
- New `test/cup-reconnect.test.js`
- `src/online/duel.js` and `src/online/start-sync.js`, only under step 3
- Report: `game/rounds/round-02/reports/batch-26-reconnect.md`

## Must not change
- Cup rules, points, bots and host handover behaviour.
- Plain and Elimination rooms, including the new room bots.
- No change to `test/` files other than the new one.

## Done when
- The report states which case it is, (a) or (b), with the evidence: the message trace, or the exact line where the guest stops.
- Under (a) or a small (b), the new test passes. Under a large (b), the test stays `todo` with the cause in its message.
- `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
A real two-phone Cup with one phone briefly offline (for example airplane mode for 3 seconds) during race 1.
