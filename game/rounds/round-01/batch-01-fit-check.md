# Round 1, batch 1: automatic screen-fit check (pilot)

**Builder:** Codex, default model, medium effort. Why: a clearly defined tool with no game logic, and the first test of Codex in this process.
**Risk:** low. Second review: no

## Goal
Clipped menus have come back several times because fit is only checked by hand. Add a command that opens the built game in a headless browser at three screen sizes and reports anything that does not fit.

## Read first
- `game/areas/visuals.md`
- `studio/skills/test-first/SKILL.md`
- `src/ui/screens.js`: the `SCREENS` list near the top
- `src/ui/menus.js`: only as needed to find which buttons open each screen
- `package.json`

## Build
1. **`tools/fit-rules.mjs`:** a pure function with no browser code. It takes measurements of a screen and the viewport size, and returns a list of problems. Problems are: content overflowing horizontally, a screen that scrolls vertically when it should fit, and a visible button or link that is partly or fully off-screen.
2. **`test/fit-rules.test.js`:** tests for those rules, written first. It must run under the normal `npm test` with no browser or Playwright.
3. **`tools/fit-check.mjs`:** uses Playwright to run `vite preview` on the existing build, visit each screen at each size, measure it and apply the rules.
4. **`package.json`:** add `playwright` as a dev dependency and a script `"test:fit": "vite build && node tools/fit-check.mjs"`. Installing the Chromium browser for it is allowed.

## Requirements
- **Sizes:** 320 x 568 and 390 x 844 with touch emulation, and 1280 x 800 desktop.
- **Screens:** at least `start`, `play`, `practice`, `challenge`, `stages`, `friend`, `boards`, `howto`, `settings`, `look`, `chal` and `profile`, plus the NYC Cup card on the race picker. Reach them through real clicks where practical, because some screens lay out their content as they open. Try `pause` and `end` too, and list anything you could not reach.
- **No live services:** block requests to `*.supabase.co` in the browser. Leave other requests alone, because blocking web fonts would change text widths.
- **Saves:** use a fresh browser profile each run.
- **Output:** one line per problem (`size | screen | element | problem`), then a one-line summary. Exit 1 if there are problems or a screen could not be checked, otherwise 0.
- **Prove it works:** add a `--self-test` flag that injects a deliberately overflowing element and exits 0 only if the tool catches it.

## May edit
- `tools/fit-rules.mjs`, `tools/fit-check.mjs`, `test/fit-rules.test.js` (new)
- `package.json`, `package-lock.json`
- `.gitignore`, only if the tool writes output files
- `game/areas/visuals.md`, to add one line on how to run the check

## Must not change
- Anything in `src/`, `index.html` or `style.css`. **If the tool finds real layout problems, do not fix them.** List them in your report, and a follow-up batch will handle them.
- The `test` script: `npm test` must not need Playwright or a browser.
- `.github/workflows/`.

## Done when
- `test/fit-rules.test.js` failed first and now passes.
- `npm run test:fit -- --self-test` exits 0, and you state the output of a real `npm run test:fit` run in your report. A non-zero result from real layout problems does not fail this batch.
- `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
- Real-phone fit and feel. This tool uses emulation and does not replace a phone check.

## Also report
Add one extra line to your report: which skills and instruction files loaded at startup, and whether you found this plan and `AGENTS.md` sufficient. This helps the lead tune the process.
