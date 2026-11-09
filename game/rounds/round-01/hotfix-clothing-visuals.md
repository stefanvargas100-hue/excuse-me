# Round 01, hotfix: clothing visual bugs

**Builder:** codex, defaults. Why: a defined list of drawing fixes, checked by screenshots.
**Risk:** low: drawing only. Second review: no, the lead reviews the before and after screenshots.

## Goal
Clothing looks correct from the back (the in-race view), side and front, on male and female bodies, while walking.

## Read first
- `game/areas/visuals.md`
- `src/dev/lineup.js`: the review screen. Open the game with `?lineup`
- `src/render/figures.js`: search, do not read it all. Start at the lines below

## May edit
- `src/render/figures.js`
- `tools/lineup-shots.mjs` (new)
- `game/rounds/round-01/reports/hotfix-clothing-visuals.md`

## First: a screenshot tool
Write `tools/lineup-shots.mjs`, modelled on how `tools/fit-check.mjs` uses Playwright. It opens `?lineup` from a Vite dev server, chooses Big, and saves the Tops, Bottoms, Shoes and Backs sections for Back, Side and Front on both Male and Female, to a folder given as an argument. The Big layout is 5192 px tall, so use a tall viewport and clip into sections. Run it on the base commit and save those images to `$TEMP/lineup-before`.

## Bugs to fix
Seen by the lead in the lineup. Confirm each one before fixing it.

| # | Item | View | What is wrong | Where to start |
|---|---|---|---|---|
| 1 | Pleated and pencil skirts | Side | The near leg is drawn on top of the skirt, right up to the hip | `:195`, `:429-430`, draw order |
| 2 | Pencil skirt | Front, walking | The skirt sits off-centre, and a leg sticks out beside it | `:430`, `skirtOf` |
| 3 | Sundress | All | The skirt is a flat shape that does not join the top: hard corners at the waist, no shading. From the side it is a huge triangle | `:426-431` |
| 4 | Y2K baby tee | Back, front, side | The bare midriff is a hard-edged rectangle, wider than the torso and without the body outline | `:416` |
| 5 | 80s windbreaker | Side | The white band becomes separate floating dashes, and it runs past the outline in other views | `:417` |
| 6 | Puffer jacket | Side | The bands stick out past the torso | `:418` |
| 7 | 80s power blazer | Side | The shoulder pad is a loose ball sitting on the arm | `:312` |
| 8 | Y2K platforms and Chunky trainers | All | The white sole looks detached and blocky, and sits off the foot | `:241-244` |
| 9 | Y2K flares | Side, front | The flare looks like a separate flap, not part of the leg | `:207` |
| 10 | Female body with trousers | Back | A dark lump juts out at one hip while walking | Find the hip and pelvis drawing |

If you find another clear clothing bug while checking, fix it only if it takes a line or two, and name it in the report. List anything bigger instead of fixing it.

## Must not change
- Hitboxes, collisions, stats or speed. This is drawing only, so `p.circles` and everything in `src/sim/` stay as they are.
- A dress stays wearable over any bottoms. This is intended (see the comment at `:425`).
- Item names, what they unlock, and saved outfits.
- The art style: same outlines and shading approach.
- Drawing cost: no per-frame image or path caching, and no large increase in draw calls.
- `drawFar`: distant people need no detail.

## Done when
- After images are saved to `$TEMP/lineup-after`. You looked at both sets, side by side, for every item above, and the report says for each number: fixed, not reproduced, or left, with why.
- No visible regression on other items, checked in the same images.
- Also check game size at least once, by clicking `Game size` in the lineup, because that is what players mostly see.
- This is drawing only, so no new failing-first test is needed. `npm test`, `npm run build` and `git diff --check <base commit> HEAD` pass.

## Left for a person
Whether the clothes look good on a real phone during a race.
