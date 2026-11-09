# Round 02, batch 04: QA trial of the Cups

**Builder:** codex, defaults. Why: testing only, no code changes.
**Risk:** low. Second review: no.

## Goal
An independent tester plays the Cups the way a player would and files bugs. It finds problems; it does not fix them. This also tests whether a QA worker earns its cost.

## Read first
- `game/areas/online.md`, section "Checking your work"
- `tools/fit-check.mjs`: how the project already drives Playwright, which is installed

## Where to test
The playtest link: `https://stefanvargas100-hue.github.io/excuse-me/playtest/`. The red tag shows the build's commit; record it. Playtest rooms are separate from live rooms, so friend rooms there are allowed. If the link is down, use `npm run build` and a local preview, and say so.

## What to test
Use Playwright with phone-sized pages: 390 x 844 and 320 x 568.
1. **NYC Cup** against bots, all races through to the final standings, on each difficulty at least once.
2. **Friend Cup online** with two or three browser pages in one room: setup, every race, standings, rematch. Then the awkward cases:
   - a guest leaves mid-race
   - the host leaves mid-race and between races
   - a page is hidden for 10 seconds (pause) and comes back
   - someone joins late
3. **Screens:** results, standings, the podium on short screens, and splits against the stamina bars.

## Must not change
Any file outside the three listed under Output. No code changes. Do not run `tools/loadtest.mjs`.

## Output
- `game/rounds/round-02/qa/cups-bugs.md`: one row per bug, with severity (S1 crash or lost progress, S2 broken feature, S3 wrong but playable, S4 cosmetic), steps to reproduce, expected result, actual result, page size, and a screenshot path.
- Screenshots in `game/rounds/round-02/qa/shots/`, only for the bugs filed, PNG, at most 15.
- `game/rounds/round-02/reports/batch-04-qa-trial.md`: your report. "Checks" lists what you ran in the browser.
- At the end of the bug file: what you could not test (real phones, real networks), and how long each part took.

## Done when
The bug file and screenshots are committed, and every bug has steps a person could follow.
