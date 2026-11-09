# Round 02, batch 02: matchmaking and player names spec

**Builder:** claude, Sonnet, medium effort. Why: reading and writing, with no code.
**Risk:** low: a document only. Second review: no, the lead and Director review it.

## Goal
A one-page spec the Director can approve for online matchmaking with player-chosen names, which Alpha requires. It should show the real options, costs and risks.

## Read first
- `game/areas/online.md`
- `game/decisions.md`: search for "Matchmaking" and "public online"
- `game/archive/INTERNET_MULTIPLAYER_PLAN.md`: search first
- `src/online/room.js`, `src/online/start-sync.js`, `src/online/board.js`: top comments and exports
- `src/online/duel.js`: `cleanName`, and how a room is joined
- `supabase/schema.sql`

Use official Supabase pages for current limits and prices. Give a link and the date for each number. If a number cannot be confirmed, say so.

## May edit
- `game/rounds/round-02/matchmaking-spec.md` (new)
- `game/rounds/round-02/reports/batch-02-matchmaking-spec.md`

## Already decided by the Director
- Matchmaking tries to fill the 8 racer lobby. It waits 30 seconds, then bots of mixed Medium and Hard levels fill the empty places.
- A lone searcher can start after the wait.
- Public matches are Cups of 4 races. Which Cups are offered is not decided: propose this.
- The Director's rule: results show measurements, never advice.
- Passing the host role is planned before public matchmaking.

## What the spec must answer
1. **Player's view:** from pressing Play to the first race, including the wait, what they see, and cancelling.
2. **Finding players:** compare at least 3 ways, including staying with Supabase Realtime only, adding a small server function, and a dedicated server. For each one give the monthly cost at 100, 1,000 and 10,000 players a day, effort in batches, and what can go wrong.
3. **Fairness and cheating:** phones report their own times and each simulates its own crowd. Say what this means with strangers, what can be done cheaply, and what the game should not claim.
4. **Host-run bots with strangers:** what happens when a stranger who is hosting leaves.
5. **Player names:** rules, filtering, reporting, what to do with a reported name, and who reviews reports, given this is a small studio. Cover other languages and lookalike characters. Say what is stored and why.
6. **Privacy and safety:** age, data kept, what a store review or the law may require. Mark anything needing a lawyer rather than giving legal advice.
7. **Batches:** ordered work, the builder for each, and what the Director must approve, such as money or a live database change.
8. **Decisions for the Director:** at most 5, each with a recommendation.

Keep it to one page where possible, and to two pages at most. Lead with the recommendation. Use plain language and explain any technical term in a few words.

## Must not change
All code and the live database. Do not contact the Supabase project or run `tools/loadtest.mjs`. Do not open an account or spend anything.

## Done when
Every question above is answered, every number has a source or is marked unconfirmed, and `git diff --check <base commit> HEAD` passes. There is no need to run `npm test`, because no code changes.

## Left for a person
All decisions, and anything marked for a lawyer.
