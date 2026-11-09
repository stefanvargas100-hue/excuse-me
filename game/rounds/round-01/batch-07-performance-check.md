# Round 01, batch 07: performance measurement

**Builder:** codex, defaults. Why: a small, separate measuring tool.
**Risk:** low: it adds a tool and changes no game code. Second review: no

## Goal
Numbers on what 8 racers cost compared with 4, before the Director can try it on a phone. This does not replace the phone test.

## Read first
- `tools/fit-check.mjs`: how a tool starts the built game and drives it with Playwright
- `window.__excuse` in `src/main.js`: `startCup`, `setLevel`, `start`, `tick`, `S`

## May edit
- `tools/perf-check.mjs` (new)
- `package.json`: add the script `test:perf` only, and no dependency
- `game/rounds/round-01/reports/batch-07-performance-check.md`

## What to build
`npm run test:perf` builds the game and runs it in Chromium at 390x844, as `test:fit` does. It compares two cases on the same stage, Fifth Avenue (index 1):
- **4 racers:** Race vs bots
- **8 racers:** NYC Cup

For each case, at CPU throttling of none, 4x and 6x (Chrome's `Emulation.setCPUThrottlingRate`), run 3 times for 20 seconds of real racing after the countdown. Skip the countdown by setting `S.race.countT = 0`. Record times between `requestAnimationFrame` calls: the median, the 95th percentile, and the share of frames over 33 ms. Also record the time spent in the game's frame work, if it can be measured without changing game code.

Print one table. Add `--self-test`, which adds an artificial 40 ms delay to each frame and confirms the tool reports it.

## Must not change
All game code. Do not fix anything you find, and report it instead.

## Done when
- `npm run test:perf` and its `--self-test` both run, and the table is copied into the report.
- `npm test`, `npm run build` and `git diff --check <base commit> HEAD` pass.
- The report states plainly that headless desktop Chromium with throttling is a comparison, and that it does not prove how a real phone will behave.

## Left for a person
The real phone test.
