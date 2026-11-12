# Round 02, batch 18d: fix two S2 validation defects from independent review

Same builder, same branch (`stefanvargas100-hue/lobby-groups`). Independent review 89a841f on `stefanvargas100-hue/lobby-review` is HOLD with two S2 defects and two failing regression tests. Everything else in the review passed; do not rework it.

## First
Merge `stefanvargas100-hue/lobby-review` into your branch to get `test/batch18-review-input.test.js` and the review report. Run that test file and confirm exactly the two reported tests fail. Do not edit the reviewer's tests; if one looks wrong, stop and report.

## Fix
1. **S2, received bot count is kept unvalidated.** `src/online/duel.js`, roster receive (about line 463) stores `c.bots` as sent. A JSON object such as `{"toString":null}` then throws a TypeError in `cupSummary` (about line 237) while the roster is being received. Normalise on receive: keep only the string `fill` or an integer from 0 to 7; anything else makes the received Cup config invalid (not startable, shown as the host still choosing) and is never used in arithmetic or text. `cupSummary`, `roomCup` and `validCup` must not throw for any received value. Apply the same normalising to `setRoomCup` input.
2. **S2, guest accepts a Cup setup that disagrees with the agreed count.** The setup check (about line 258) validates the racer list on its own, so with 2 players and 0 bots agreed, a guest accepts a 3-racer Cup and diverges from the host. On receiving a setup, require its bot racers to equal the agreed count from the last valid received config, computed from the setup's own player count (`fill` means 8 minus the setup's players), and its players to be 2 to 8. Refuse otherwise through the existing refuse path, so the start is cancelled rather than half-run. A guest with no valid Cup config refuses every setup.

## Fairness and limits
- An honest host with any valid count, and a room where a player joins or leaves just before Start, must still start: add a test for a join and a leave between the last config and the setup.
- No change to points, PROTO (stays 10), `START_PROTOCOL`, UI or styling.

## May edit
- `src/online/duel.js`, `src/sim/friendcup.js`
- New tests or additions in `test/friendcup-room.test.js`
- `game/rounds/round-02/reports/batch-18-lobby-groups-bots.md`

## Done when
- Both reviewer regressions pass unchanged, plus your join/leave test.
- `npm test` once (expect 872 plus your additions, zero failing), `npm run build`, `git diff --check`.
- Report updated (10 lines) and committed.
