# Round 02, batch 18: Friend lobby track groups and Cup bot count

**Builder:** Codex, defaults. Why: clearly defined build batch; Claude limit is shared with the lead.
**Risk:** high (online protocol). Second review: yes, by an independent worker before integration.

## Goal
From the Director's phone playtest (`game/rounds/round-02/playtest-followup.md`, package 1, remaining parts only): the host picks tracks from expandable location groups instead of one long chip list, and chooses how many bots join a Friend Cup, from zero up to the free seats. Host Start/Ready and Cup points are already done; do not redo them.

## Read first
- `game/areas/online.md`
- `src/ui/friend.js`: `initFriend` (stage chips built from `LEVELS`), `showStages`, `showRoster`, `sendCup`.
- `src/online/duel.js`: `cupCfg`, `validCup`, `setRoomCup`, `roomCup`, the roster receive path near `cupCfg = c ? {...}` (about line 460), `hostStart`, `PROTO`.
- `src/sim/friendcup.js`: `cleanSetup`, `newFriendCup`, `CUP_RACERS`, `FRIEND_CUP_RULES`.
- `src/config/levels.js`: each level's `city` field (read only).
- `studio/skills/test-first/SKILL.md`.

## Part 1: track groups
- Group the stage chips in `#friendStages` by `LEVELS[i].city`, in first-appearance order. Each group is one expandable button (`aria-expanded`), with its tracks inside. A city with a single track still gets its own group.
- The selected track (or, for a Cup, the numbered picks) stays visible when its group is collapsed, for example on the group button. The group holding the current selection opens by default; opening one group may close the others.
- Race, Elimination and Cup formats keep their current selection rules: one stage for a race; four different stages in race order for a Cup, stages above index 5 still disabled for Cups. No group presets, repeats or custom Cup slots: those are not approved.
- Start, Ready, the invite button and the roster stay reachable at 320x568 and 390x844 with eight players and 24-character names, using the existing secondary-control scrolling. Guests see the same information as now.

## Part 2: Cup bot count
- The host picks the number of bots for a Friend Cup: 0 to `8 - players`. Default is "fill to 8", which is today's behaviour, so an untouched lobby plays exactly as before.
- The choice is part of the Cup config sent to guests. When players join or leave, clamp it to the free seats and resend; a guest joining never gets refused because of bots. A "fill" choice keeps following the player count; an explicit number stays until it must be clamped.
- A change to the bot count is a settings change: it clears guests' Ready the same way a stage or difficulty change does today. If those do not clear Ready today, keep that as it is and say so in the report.
- `cleanSetup`/`newFriendCup` accept 2 to 8 racers in total with at least 2 players, and still reject everything else (duplicate ids, bots before players, unknown bot names, wrong bot id order, over 8). Rebuild the count from validated input; never trust a received number.
- Points, standings, awards and placing work for any racer count from 2 to 8, using the existing points table for the places that exist. Do not change points values.
- Status lines and guest text show the real bot count ("3 players, 2 bots", "3 players, no bots"). With zero bots the difficulty chips may be hidden or disabled; the stored difficulty stays valid.
- Bump `PROTO` (currently 9) because the shared Cup config changes; update tests that hard-code it. Mismatched phones must get the existing update message.
- Fairness: any saved Friend Cup best, record or ghost must not compare a Cup with fewer than 8 racers against 8-racer results. Keep the 8-racer identity and its saved data untouched; give other racer counts a separate identity or do not save them, and state which in the report.
- Bots stay Cup-only. Do not add bots to plain friend races or Elimination.

## May edit
- `src/ui/friend.js`, `src/online/duel.js`, `src/sim/friendcup.js`
- `index.html` and `style.css`: the Friend lobby (`#friendHost`, `#friendGuest`, `#friendStages`, `#friendCupLevel`) only
- `src/sim/game.js`, `src/sim/race.js`: only the code that creates or counts Friend Cup racers, if the count is fixed there
- `test/friendcup.test.js`, `test/friendcup-room.test.js`, other existing tests only where they hard-code `PROTO`, eight Cup racers or the flat stage chip list; new test files
- `game/rounds/round-02/reports/batch-18-lobby-groups-bots.md`, `game/rounds/round-02/batch-18-evidence/`

## Must not change
- Solo NYC Cup, Classic, Daily, Weekly, Challenge, and their records, ghosts and identities.
- Start sync, host handover, rematch, the Ready rules for guests, host Start without Ready, award animation and Cup totals.
- Stage content, bot AI and difficulty values, points values, `START_PROTOCOL`.
- Art worlds and any styling outside the Friend lobby. The live database, `tools/loadtest.mjs`, dependencies.

## Done when
- New tests failed first and now pass, covering: grouping from `city`; selection visible when collapsed; Cup pick order across groups; bot count 0, a middle value and fill; clamping on join and leave; guest receiving and validating the count; invalid counts and setups rejected; standings and points with 2, 5 and 8 racers; a full four-race simulated Cup with zero bots and with a middle count; `PROTO` mismatch message.
- Local browser screenshots at 320x568 and 390x844 of the host lobby (race and Cup, a group open and collapsed, eight long names) and the guest lobby, saved in the evidence folder and described in the report. Compare fit results with `batch-10c-evidence/fit-comparison.json` and report introduced problems only.
- `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
- Real phones, real network joins and leaves, reconnect and host transfer during a Cup with a custom bot count.
