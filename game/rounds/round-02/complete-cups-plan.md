# Complete Cups: plan

**Director request, 2026-11-12:** plan and build the remaining stages so every Cup is complete. Alpha gate: New York, Tokyo and Airport Cups at 4 races each. Stages were chosen by the Director on 2026-11-08 (`stage-ideas.md`). Placeholder art is allowed at Alpha.

## Stages to build
New stages are appended to `LEVELS`; no existing index moves. With batch 19's presets, a city's Friend Cup grows automatically as its stages land.

| Index | Stage | City | Main challenge (from `stage-ideas.md`) | Batch |
|---|---|---|---|---|
| 7 | Tsukiji Outer Market | Tokyo | Delivery carts cut across the lanes; wet floor patches make you slide | 21 |
| 8 | Skytree Sky Walk | Tokyo | Wide and fast; tourist groups gather at the windows, seen far ahead, so lane choice is planned early | 21 |
| 9 | Security Lanes | Airport | Parallel queue lanes that open and close; pick a lane early | 23 |
| 10 | Baggage Claim | Airport | Carousels; bags and trolleys spill across your path | 23 |
| 11 | Gate Change Rush | Airport | A gate change announcement makes the whole crowd turn and surge together | 23 |

Result: Tokyo Cup = Shibuya, Takeshita, Tsukiji, Skytree. Airport Cup = Terminal B, Security Lanes, Baggage Claim, Gate Change Rush. New York is already complete.

## Looks
The Director does not like the art-worlds update and will redirect it later. New stages therefore reuse an existing recipe of their cup family (no new style recipes) and keep stage-specific drawing in one small painter file each, so the later restyle stays cheap.

## Order and owners
Each stage batch edits shared lists (`levels.js`, `medals.js`, `people.js`, `render.js`, `PROTO`), so stage batches run one at a time.
1. Batch 19 Cup presets (running) must merge first: it removes the old index-5 Cup cap and makes Cup length follow the city.
2. **Batch 21:** Tokyo stages 7 and 8. Claude Sonnet if no other Claude worker is running, otherwise Codex.
3. **Batch 23:** Airport stages 9 to 11, planned after batch 21 is reviewed, using what it teaches.
4. **Batch 25:** solo Tokyo and Airport Cups next to the solo NYC Cup (`src/sim/cup.js`), with their own record identities.
Spectating, friend-race bots and the reconnect investigation run alongside where files allow (status.md).

## Kept the same
Daily and Weekly rotation stays capped at the first 5 stages (`dailyLevel`, `weeklyLevel`), so published periods do not change. Weekly Challenge keeps its list. Existing stages' crowds, records and ghosts are untouched.

## Left for the Director
Whether each stage is fun on a phone, medal fairness, and the look once the visual direction is decided.
