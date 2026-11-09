# Round 01: fix two Friend Cup departure bugs from the review

**Builder:** codex, defaults. Why: two small, well-described fixes.
**Risk:** medium: online. Second review: the lead reads the diff.

## Read first
- Findings: `git show 3ebcc6c:game/rounds/round-01/reports/review-friend-cup-online.md`
- `src/online/duel.js`: `cupRacerGone`, `syncDuelPause`, and the heartbeat roster pruning near lines 500-530
- `test/friendcup-room.test.js`: how its tests set up a host and guests

## May edit
- `src/online/duel.js`, `test/friendcup-room.test.js`
- `game/rounds/round-01/reports/hotfix-friend-cup-departures.md` (your report)

## Fix
1. **Must fix:** when a Cup racer leaves or times out while its pause vote is active, remove the vote and resync the pause, so the Cup resumes.
2. **Should fix:** when the heartbeat prunes a Cup racer, mark it as gone whether or not it has finished, so the next race starts with a takeover bot and every guest sees the same left status.

For each one, write a failing test first that reproduces the case the review describes, then fix it.

## Must not change
Normal friend races and Elimination, `PROTO`, and anything outside the files above.

## Done when
`node --test test/friendcup-room.test.js test/lobby.test.js test/interruptions.test.js`, then `npm test`, `npm run build` and `git diff --check <base commit> HEAD` all pass.
