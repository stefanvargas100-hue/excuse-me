# Round 1 proposal

**Status:** waiting for Director approval. Nothing here has been built.

| # | Idea | Why it fits the vision | Builder | Risk |
|---|---|---|---|---|
| 1 | **Automatic screen-fit check** (pilot) | Protects every mode on every phone size, and closes the checks NYC Cup still lacks | Codex | Low |
| 2 | **Race skill report** on the results screen | Shows where time was lost, so players can improve | Codex | Low |
| 3 | **Medal times for each stage** | Gives solo players clear skill targets to beat | Codex | Medium |
| 4 | **Friend-room series** with points across rematches | Turns one-off races into a real multiplayer contest | Claude Opus | Medium |
| 5 | **Race time boards for each stage** | Lets players compete on race times worldwide | Claude Opus | High |

## 1. Automatic screen-fit check
Today this is checked by hand, and clipped menus have come back more than once. Add a separate `npm run test:fit` that opens the built game in a headless browser at 320 x 568, 390 x 844 and desktop, then fails if a menu overflows or a button is off-screen.
- **Needs:** one new development dependency (Playwright), kept out of the normal `npm test`.
- **Also proves:** that Codex works through the whole studio process.

## 2. Race skill report
Add a short breakdown to race results using numbers the game already tracks, such as bumps, clean segments and drafting, plus a best-versus-now time and one suggestion. The report never changes scoring.
- **Open point:** the worker confirms which numbers are tracked, and any new ones must not change the simulation.

## 3. Medal times
Bronze, Silver and Gold race times per stage, shown on the stage card and results, with the best medal saved. Medals pay nothing at first. Existing race bests award their medal automatically.
- **Open point:** the times are a guess until tuned. The Director's real best times on Hard would give a much better starting point.

## 4. Friend-room series
A room keeps a running points table across rematches, using NYC Cup's scoring (10, 7, 5, 3). It resets when the room closes and saves nothing.
- **Risk to manage:** each phone must end up with the same table. It may need a protocol version bump, which older builds handle with an update message.

## 5. Race time boards
Add a Race tab to the Leaderboards screen, with a best time for each stage.
- **Needs from the Director:** a live database migration, like the Weekly Challenge one. Workers write it, and it is applied only with your approval.
- **Known limit:** times are reported by the client, so these are friendly boards rather than proof of legitimate play. The Weekly Challenge board has the same limit.

## Suggested order
1. Idea 1 alone, as the pilot. Review how it went before starting anything else.
2. Ideas 2 and 3 next. They both touch the results screen, so one after the other.
3. Idea 4, then idea 5. I would split idea 5 off if the round runs long, because it needs the most from you.

## What the Director can test now
Play a full NYC Cup on a phone (Race vs bots > NYC Cup). Real phone layout, calm mode and performance are still unchecked. Any problems found become fixes in the pilot.
