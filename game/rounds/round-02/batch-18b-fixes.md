# Round 02, batch 18b: lead review fixes for lobby groups and Cup bots

Same worker, same branch (`stefanvargas100-hue/lobby-groups`), same allowed files as batch 18, plus one optional new pure helper `src/ui/friend-groups.js` if item 5 needs it. Lead read the source diff of c913da2 and the 320px Cup-open and race-collapsed screenshots. Protocol, validation, clamping and scoring changes look right; do not rework them.

## Fix
1. **S3, wrong character.** `src/online/duel.js` `cupSummary`: `const detail = ' ? ' + ...` has a literal question mark where the middle dot separator ` · ` was meant, so guests read "Medium bots ? 3 players, 2 bots". Fix it and add a test on the guest summary text for zero bots and for a non-zero count.
2. **S3, select rebuilt on every refresh.** `showStages` in `src/ui/friend.js` empties and refills `#friendBotCount` on every roster update, which can reset an open picker on a phone whenever a heartbeat arrives. Rebuild only when the option list changes, and otherwise only set the value. Take the player count from the roster data, not from counting DOM list items.
3. **S3, empty group in a Cup.** In Cup format, tracks not allowed in Cups are hidden, so a city whose tracks are all disallowed shows an expandable button with nothing inside. Hide or disable such a group while the format is Cup. Add a test.
4. **S4, unexplained removal.** `style.css` dropped `#friendHost.cup.full #friendShare { display: none; }`. Restore it, or say in the report why a full Cup room needs the invite button.
5. **Missing test.** Grouping has no automated test. Add one that fails first where practical: groups built from `city` in first-appearance order, the collapsed label for a race pick and for numbered Cup picks, and Cup pick order across groups. A small pure helper is fine if the DOM gets in the way.
6. **Guest Ready evidence (lead's gap: the plan did not name a method).** Batch 10c captured real host and guest pages in one local room; reuse that method from `game/rounds/round-02/batch-10c-evidence/` instead of a DOM fixture with the host role. One attempt. Capture the guest lobby at 320x568 and 390x844 in a Cup with a custom bot count and confirm Ready is reachable. If it fails again, stop and say so; the independent reviewer will take it.

## Done when
- Items 1 to 5 fixed with tests; item 6 done or reported as not done.
- Focused tests while working; `npm test` once, `npm run build`, `git diff --check`.
- Update `game/rounds/round-02/reports/batch-18-lobby-groups-bots.md` (10 lines) and commit.
