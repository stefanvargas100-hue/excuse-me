# Round 1, hotfix: unreachable results buttons (S1)

**Builder:** Codex, defaults. Why: a very small CSS fix, and the first test of the new token rules.
**Risk:** low. Second review: no. This ships to `main` alone, so keep it to one commit.

## Problem
At 320 x 568, ordinary race results overflow the card, and nothing can scroll. Race again, Customize, Share and Menu end at 575 and 621 pixels on a 568-pixel screen, so a player can get stuck. This happens on a first win with an "Unlocked" message showing.

## Director's decision
Hide the podium on short screens.

## Read first
Only these, and only the relevant lines:
- `index.html`: the `#podium` canvas, near line 308
- `style.css`: `@media (max-height: 650px)`, where stage descriptions are already hidden
- `src/render/podium.js`: only enough to confirm that a hidden canvas causes no errors

## Build
In `style.css`, hide `#podium` on screens up to 650 pixels tall. The game sets the canvas's `hidden` attribute itself, so the rule must still win when that attribute is removed.

## May edit
- `style.css`
- `game/rounds/round-01/reports/hotfix-results-buttons.md` (your report, in a second commit)

## Must not change
Any game code, wording, or the look of screens taller than 650 pixels. Do not touch the tool files, because another worker is editing them.

## Done when
Use a throwaway Playwright script, not committed. Reach results as `test/medals.test.js` does on the medals branch, or as `tools/fit-check.mjs` forces a finish: start a race, set `E.S.race.countT = 0`, `E.S.time = 120`, `E.S.pz = E.LV.goal + 1`, then tick.
- At 320 x 568 with the "Unlocked" message showing, every button on results is fully on screen, with **at least 45 pixels spare**. Medals will add about 40 pixels later.
- The same holds for the end of a NYC Cup at 320 x 568.
- At 390 x 844 the podium still shows.
- No page errors.
- `npm test`, `npm run build` and `git diff --check` against your base commit pass. State the measured button positions in your report.

This is CSS, so no new test is required. The tool improvement that guards this comes from another batch.

## Left for a person
Whether results still feel good without the podium on a small phone.
