# Round 02, batch 09: visual pass over the whole game

**Builder:** Claude Fable 5.1 (`--agent claude --model claude-fable-5-1`), the Director's choice for visual work. Effort: default.
**Risk:** medium: it is broad, and it touches files that other batches share. Second review: the lead reviews screenshots of every changed screen.
**Start when:** both conditions hold (Director, 2026-11-09): the Claude host-takeover worker (06b) has reported, so only one Claude worker runs at a time; and batch 07 (side routes and Takeshita Street) has merged into `develop`, so part 1 sees those stages and part 2 does not clash in `src/render/`.

## Goal
The Director wants every visual in the game improved: fix what looks wrong or inconsistent, enhance what is there, and add new visuals where they make the game look better. The game's identity stays the same: it is the Director's game, so new directions are proposed first and built after approval.

## Read first
- `game/vision.md`
- `game/areas/visuals.md`, all of it: its rules hold throughout
- `src/render/`: search, do not read every file. `figures.js` is about 1000 lines.

## Part 1: look and propose (no code changes)
1. Capture every screen and every stage with Playwright at 390 x 844, plus menus at 320 x 568. Stages: Terminal B, Fifth Avenue, Shibuya Crossing, Central Park, Brooklyn Bridge, Subway Platform (with its side route), Takeshita Street. Include start, mid-race with a crowd, the finish, results, podium, and the Cup standings. Use `src/dev/lineup.js` for characters.
2. Write `game/rounds/round-02/visual-pass-proposal.md`, at most 2 pages. Group items as:
   - **Fix:** wrong, broken or inconsistent (clipping, mismatched styles, unreadable text, scenery that does not match collisions)
   - **Enhance:** existing art made better (lighting, depth, detail, animation, character variety)
   - **New:** visuals that do not exist yet (stage landmarks, finish moments, weather, effects)

   For each item, give the screen, what changes, the files, the cost (S/M/L) and any risk to frame rate or collisions. Rank everything, and mark the 10 you would do first.
3. Commit the proposal and a few key screenshots in `game/rounds/round-02/visual-pass/`, PNG, at most 20. Then `ask` the lead and **stop**. The Director picks what gets built.

## Part 2: build what the Director approved
The lead sends the approved list as a follow-up file. Build it in that order, committing after each item.

## May edit (part 2)
- `src/render/*` (new files allowed), `src/ui/menus.js`, `src/ui/screens.js`, `style.css`, `index.html` (markup for screens only), `src/dev/lineup.js`
- `src/config/colour.js`
- Tests for drawing-only helpers, and the visual tests named in the area guide where an assertion is about looks
- `game/rounds/round-02/reports/batch-09-visual-pass.md`

## Must not change
Simulation, collisions, timings, seeded randomness, `PROTO`, or anything in `src/sim/` or `src/online/`. If a visual change would need a collision change, propose it instead of doing it. Calm mode must still turn off movement and flashing.

## Done when (part 2)
- `npm run test:fit` passes at all three sizes, and `npm test`, `npm run build` and `git diff --check` pass.
- Frame cost measured with `tools/perf-check.mjs` before and after, on the busiest stage, and not more than 10% worse.
- The report lists each item done, with before and after screenshots.

## Left for a person
How it looks and runs on a real phone, on the playtest link.
