# Area guide: online

Friend rooms, leaderboards and the database. **This is high-risk work: use a strong model and a second review.**

## Where things live
- `src/online/room.js`: the room connection, using Supabase Realtime Broadcast.
- `src/online/duel.js`: lobby, roster, race messages, rematch, shared pause. Shared by many batches.
- `src/online/start-sync.js`: Ready, clock sync and scheduled start. It has no game, browser or database code.
- `src/online/remote.js`: smooths other players' movement.
- `src/online/board.js`, `boards.js`, `online.js`: leaderboards, anonymous sign-in, score submission.
- `src/ui/friend.js`: lobby screens. `supabase/`: schema and migrations.

## Rules that must hold
- **Version every shared change.** Bump `PROTO` in `duel.js` or `START_PROTOCOL` in `start-sync.js` when shared layouts, rules or messages change, so mismatched phones get an update message instead of a broken race.
- **Validate all network input.** Check ranges and rebuild anything received from known options.
- **A start can be cancelled, but never half-run.** A late release is a missed start.
- **Workers never touch the live database.** Write the migration and a rollback, then hand them to the lead. Applying one needs Director approval.
- **Do not run `tools/loadtest.mjs`.** It contacts the real Supabase project.
- **Never ship a service-role key.** The publishable key in the code is only a public identifier.
- **Times are reported by the client,** so boards are friendly boards, not proof of legitimate play. Do not describe them as cheat-proof.

## Known limits
A shared seed does not guarantee identical crowds, because each phone simulates its own. There is no server authority, host transfer or physical 8-phone test yet. See `game/archive/INTERNET_MULTIPLAYER_PLAN.md` only if the plan names it.

## Checking your work
Tests use a simulated connection, and browser checks run on one computer. Neither proves real phone timing, so report which one you ran and leave phone checks for the Director.

## Useful tests
`room`, `duel`, `lobby`, `lobby8`, `ready-start`, `start-sync`, `rematch`, `interruptions`, `elimroom`, `board`, `boards`. Run one with `node --test test/<name>.test.js`.
