# Round 02, batch 05: race time boards and player-name rules

**Builder:** codex, defaults. Why: a clear feature that follows existing board code. It touches the database, so the lead reviews it twice.
**Risk:** medium. Second review: the lead checks the migration before the Director approves it.

## Goal
1. **Race time boards:** a Race tab on the Leaderboards screen, with the best Race-mode finish time on each stage. These are friendly boards.
2. **Name rules:** one place that decides whether a player name is allowed. It is used when a name is set, and again when any name is received or shown. This is needed for public play later.

## Read first
- `game/areas/online.md`
- `src/online/boards.js` (`BOARD_TABS`, `boardIdFor`, `boardTitle`), `src/online/online.js` (`submitRun`, `submitBestRun`, `showTop`, `myName`), `src/online/board.js` (`createBoard`, `playerName`)
- `src/online/duel.js`: `cleanName` only
- `supabase/schema.sql`, and `supabase/migrations/0002_weekly_challenge.sql` as the pattern

## Time boards
- One board per stage, for every stage in `src/config/levels.js`. A stage added later gets its board automatically.
- Submit when a Race-mode run finishes, in any difficulty: the finish time, with the lower time better. Keep only each player's best. Shown as m:ss.cc, top 20 plus your own place.
- First, check whether the existing `scores` table and its policies already accept a new board id with lower-is-better times. If they do, reuse them and write no migration. If not, write `supabase/migrations/0003_race_times.sql` and `0003_race_times_rollback.sql`. **Do not apply them.** The lead hands them to the Director.
- Until the database accepts the times, the tab shows a short "coming soon" line instead of an error.
- The playtest build must stay off the live boards, as it is today. Check that rule still holds for the new tab.

## Name rules
- New `src/online/names.js` with `cleanPlayerName(raw)`: 3-16 characters after trimming; letters (any language), digits, spaces, `-` and `_`; no runs of spaces. It returns a cleaned name, or `null` when the name is not allowed.
- A small built-in word list blocks offensive names, including simple letter swaps (0 for o, 1 for i, 3 for e, @ for a, $ for s). Keep the list in its own file, `src/online/name-filter.js`, and make it easy to extend. No network calls.
- A blocked or empty name falls back to the existing default name. On the name-setting screen, say why the name was refused in under 8 words.
- `cleanName` in `duel.js` calls it, and so does wherever boards show names.
- Reports and auto-hiding come later with matchmaking. Do not build them now.

## May edit
- `src/online/boards.js`, `online.js`, `board.js`, `names.js` (new), `name-filter.js` (new)
- `src/online/duel.js`: `cleanName` only. Another batch is changing this file, so keep the change to that function.
- `src/ui/menus.js` and `style.css`: the Leaderboards screen and the name screen only
- `src/sim/game.js`: only the call that submits a finished Race-mode run, if one is needed
- `supabase/migrations/0003_*` (new), if needed
- `test/boards.test.js`, `test/board.test.js`, `test/names.test.js` (new), `test/race-boards.test.js` (new)
- `game/rounds/round-02/reports/batch-05-time-boards-names.md`

## Must not change
`PROTO`, the live database, any other board's scoring, and the playtest build's separation from live boards.

## Done when
- Tests that failed first now pass. They cover: allowed and blocked names, letter swaps, the fallback name, a received bad name being replaced, the board id for each stage, lower-is-better times, and the "coming soon" state.
- Focused tests, then `npm test`, `npm run build` and `git diff --check` pass.
- The report says whether a migration is needed, and quotes its first lines if so.

## Left for a person
Look of the Race tab on a phone. Applying any migration (Director).
