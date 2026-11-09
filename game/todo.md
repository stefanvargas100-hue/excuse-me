# To-do

**Written:** 2026-11-08, at the end of the session. Start from `game/status.md` for the current state.

## Stefan (Director)
1. **Playtest on your phone:** https://stefanvargas100-hue.github.io/excuse-me/playtest/
   - Does the red build tag show, and is all gear, every title and every picture unlocked?
   - Do splits sit too low or overlap the stamina bars?
   - Do the medal times feel fair on each stage?
   - On a short screen, do race results look right without the podium?
   - NYC Cup with 8 racers, once merged: does it stay smooth, and does the start look right?
2. **Later, with a second phone:** Friend Cup on the playtest link, once it is built.
3. **Approve the next merge to `main`** after those checks. It also brings the deploy queue fix.

## Lead (Claude)
1. **Review the NYC Cup worker's result** (`game/rounds/round-01/batch-04-nyc-cup-8-racers.md`), merge it into `develop`, record its token use in `studio/model-routing.md`, and delete its folder only with Director approval.
2. **Check the batch-plan checklist:** report whether its 4 checks caught anything, as promised to the Director.
3. **Confirm the playtest updates by itself** from a `develop` push, by checking the red tag's commit.
4. **Friend Cup rules:** plan and send (Codex, no networking).
5. **Friend Cup online:** plan and send (Claude, second review, measure messages with 7 host-run bots).
6. **QA worker trial:** an independent worker tests the Cups on the playtest link and files bugs by severity without fixing them.
7. **End of Round 1:** write the round report, then hand over to a fresh lead session.
8. **After that:** passing the host role, then Round 2 (race time boards, the Subway stage and the side-route system), then the other new stages and matchmaking.
