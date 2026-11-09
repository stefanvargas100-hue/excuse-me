# To-do

**Written:** 2026-11-09, at a lead handover. Start from `game/status.md` for the current state.

## Stefan (Director)
1. **Playtest on your phone:** https://stefanvargas100-hue.github.io/excuse-me/playtest/
   - Does the red build tag show, and is all gear, every title and every picture unlocked?
   - Do splits sit too low or overlap the stamina bars?
   - Do the medal times feel fair on each stage?
   - On a short screen, do race results look right without the podium?
   - NYC Cup with 8 racers: does it stay smooth, and does the start look right?
   - Once the slipstream fix lands: do bots still line up, does a 6 second cooldown feel right, and are the new medal times fair?
2. **Later, with a second phone:** Friend Cup on the playtest link, once it is built.
3. **Decide the 5 matchmaking questions** in `game/rounds/round-02/matchmaking-spec.md`.
4. **Try Subway Platform and the clothing fixes** on the playtest link. Check whether a hip still looks wrong on female bodies in trousers.
5. **Approve the next merge to `main`** after those checks. It also brings the deploy queue fix.

## Lead (Claude)
1. After the Director tries Subway: allow stage 5 in Friend Cups, and add Subway to NYC Cup (`CUP_STAGES`, `CUP_RULES` 3, 4 races) after the Director tries it.
2. **Merge** Friend Cup online after the Codex review (set `PROTO` to 5), and **review** and the slipstream-lines result (bot-line table, medal times old and new).
3. **QA worker trial:** an independent worker tests the Cups on the playtest link and files bugs by severity without fixing them.
4. **End of Round 1:** write the round report.
5. **After that:** passing the host role, then Round 2 (race time boards, the Subway stage and the side-route system), then the other new stages and matchmaking.
