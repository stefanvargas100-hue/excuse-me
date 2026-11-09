# Round 1 proposal

**Status:** ideas 1, 2, 3 and 4 approved by the Director. Idea 5 moved to Round 2. Idea 1 (the pilot) is in progress; the others have not been built.

| # | Idea | Status | Builder | Risk |
|---|---|---|---|---|
| 1 | **Automatic screen-fit check** (pilot) | Approved | Codex | Low |
| 2 | **Live splits against your best** | Approved, replaces the rejected race skill report | Codex | Low |
| 3 | **Medal times for each stage** | Approved | Codex | Medium |
| 4 | **Cups: friend rooms and NYC Cup** | Approved | Claude Opus | High |
| 5 | **Race time boards for each stage** | Moved to Round 2 | Claude Opus | High |

## 1. Automatic screen-fit check
Add a separate `npm run test:fit` that opens the built game in a headless browser at 320 x 568, 390 x 844 and desktop, then fails if a menu overflows or a button is off-screen.
- **Needs:** one new development dependency (Playwright), kept out of the normal `npm test`.
- **Also proves:** that Codex works through the whole studio process.

## 2. Live splits against your best
At fixed points in a race against bots, briefly show how far ahead or behind your best run you are, such as `-0.4` or `+1.2`. It gives a measurement and no advice, so working out why is left to the player.
- **Source:** your saved best-run ghost already records position over time, so old saves can get splits without a data change.
- **Limits:** only appears when a ghost exists for that course. Does not change scoring or the simulation.

## 3. Medal times
Bronze, Silver and Gold race times per stage, shown on the stage card and results, with the best medal saved. Medals pay nothing at first. Existing race bests award their medal automatically.
- **Open point:** the times are a guess until tuned. The Director's real best times on Hard would give a better start.

## 4. Cups
**Director's rules:**
- **Every Cup is 4 races,** including NYC Cup.
- **Friend-room Cups** have at least 8 racers and need at least 2 real players. Bots fill empty places, and the host chooses their difficulty.
- **Future public online Cups** try to fill the lobby before starting, with a minimum of 6 real players. This is out of scope for this round.

**Agreed details:**
- **Stages:** the host chooses 4 of the 5 stages and their order.
- **Points:** 10, 8, 6, 5, 4, 3, 2, 1 for 1st to 8th, then round wins and the final race as tie-breaks.
- **Players who leave:** a bot takes their place, and the points they earned stay on the table.
- **Rewards:** none at first. Nothing goes on boards or records.

**NYC Cup:** goes from 3 races to 4. Bump `CUP_RULES` so old 3-race records are never compared with new ones. Its fourth race and racer count are waiting for the Director.

**Technical risks:**
- **Bots have to be run by the host.** Each phone simulates its own crowd, so bots simulated on each phone would drift apart. The host simulates them and sends their positions.
- **Bot roster:** `src/sim/race.js` has 5 bots and caps a race at that number. A room with one or two friends needs 6-7, so the roster has to grow.
- **Host leaving:** there is no host transfer yet, so the Cup ends if the host leaves.
- **Load:** a full room has 8 racers on every phone. Older-phone performance and message limits need checking on real devices.
- **Protocol:** needs a version bump, and older builds get an update message.

**Suggested batches:** NYC Cup format and shared Cup model, then host-run bots, then lobby and results screens.

## 5. Race time boards
Add a Race tab to the Leaderboards screen, with a best time for each stage.
- **Needs from the Director:** a live database migration, like the Weekly Challenge one. Workers write it, and it is applied only with approval.
- **Known limit:** times are reported by the client, so these are friendly boards rather than proof of legitimate play.

## Order
1. Idea 1 alone, as the pilot. Review how it went before starting anything else.
2. Ideas 2 and 3, one after the other. They both touch race screens.
3. Idea 4, the largest piece of work. It may need more than this round.

## Rejected
- **Race skill report (2026-11-08):** the Director felt that analysis and tips on results defeat the human side of improvement.
