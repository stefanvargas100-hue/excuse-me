# Cups: one-page spec

**Status:** approved by the Director, 2026-11-08. **Risk:** high (online play, shared bots). **Delays:** nothing else is running. Round 2 starts after this.

## What the player gets
**NYC Cup (solo):** 8 racers instead of 4. Still 3 races until the subway stage exists, then 4.

**Friend Cup (online):**
1. The host chooses Format: **Cup**, then 4 of the 5 stages in any order, then bot difficulty (Easy, Medium or Hard).
2. At least 2 real players are needed. Bots fill the room to 8 racers.
3. After each race everyone sees the standings. The host starts the next race.
4. After race 4, everyone sees the final standings. No rewards, boards or records.

| Rule | Value |
|---|---|
| Points, 1st to 8th | 10, 8, 6, 5, 4, 3, 2, 1, in every Cup |
| Tie-break | Race wins, then better final-race place, then lower total time (unchanged) |
| Player leaves | A bot at the host's difficulty takes over, and the points stay. No rejoining at first |

## Director's decisions
1. **Host leaves mid-Cup:** everyone finishes the current race, then the Cup ends with the standings so far. Passing the host role comes later.
2. **NYC Cup XP with 8 places:** 60, 45, 35, 25, 20, 15, 10, 5.

## How it gets built
Each phone currently runs its own crowd and its own solo bots, so bots must become shared. The host runs them and sends all their positions in one combined message, at the rate friend positions use today. Guests draw them like remote players. `PROTO` goes from 3 to 4, so phones on different versions get the existing "update the game" message. `CUP_RULES` goes to 2, so old NYC Cup bests are kept but not compared with 8-racer ones.

| Batch | Work | Builder | Second review |
|---|---|---|---|
| 1 | NYC Cup at 8 racers: larger bot roster, shared points, XP, standings fitting a phone | Codex | No |
| 2 | Friend Cup rules with no networking: schedule, 8-racer fill, leaver to bot, standings, message checks, `friendcup` run category | Codex | No |
| 3 | Friend Cup online: host-run bots, host setup screen, between-race flow, protocol bump | Claude | Yes |
| 4 | **QA worker trial:** an independent worker tests batches 1-3 on the playtest link with 2-3 browsers and files bugs by severity. It does not fix them | Codex | n/a |

## Done when
- Rules are covered by tests that failed first, and `npm test`, `npm run build` and `npm run test:fit` pass.
- A full 4-race Cup finishes in 2 and 3 browser windows, including a player leaving mid-race.
- Message load is measured with 7 host-run bots. If the combined message hits a Realtime limit, stop and report.
- Classic, Daily, Weekly and their records are unchanged.

## Left for the Director
On the playtest link, using 2 real phones: does it stay smooth with 8 racers, do bots look natural, and is the host setup clear?

## Not in this spec
Tokyo and Airport Cups, the subway stage, side routes, public matchmaking and player-chosen names.
