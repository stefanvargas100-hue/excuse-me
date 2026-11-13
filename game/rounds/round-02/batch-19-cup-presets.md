# Round 02, batch 19: Preset Friend Cups by location group

**Builder:** Codex, defaults. Why: clearly defined build batch; Claude's shared limit goes to batch 20 and the lead.
**Risk:** high (online protocol). Second review: yes, by an independent worker before integration.

## Goal
Director decision 2026-11-12 (`game/decisions.md`, top entry): the host no longer picks four Friend Cup tracks. The host picks one **location preset**, and the Cup races every track of that city group once. Today that gives a New York Cup (4 races) and a Tokyo Cup (2 races). Airport has 1 track, so it has no Cup yet. When new stages are added to a city, its Cup grows on its own.

## Read first
- `game/areas/online.md`
- `src/ui/friend-groups.js`: whole file (`stageGroups`, `groupLabel`, `groupAvailable`, `cupPick`).
- `src/ui/friend.js`: `CUP_STAGE_MAX`, `CUP_RACES` (line 14), the Cup branch of the stage chips and status text (about line 64), `sendCup`.
- `src/online/duel.js`: `cupCfg`, `validCup`, `cupNote` text (about lines 175 and 235-241), the cup state message check (about line 260, `m.rounds.length > CUP_RACES`), roster receive (about line 472), `setRoomCup`, `roomCup`, `hostStart`, `PROTO` (10).
- `src/sim/friendcup.js`: `FRIEND_CUP_RULES`, `CUP_RACES`, `stagesOK`, `cleanSetup`, `newFriendCup`, `friendCupOver`, `currentStage`.
- `src/sim/game.js`: line 417 (`'race ' + race + ' of ' + CUP_RACES`) and line 506 (`makeRun` with `FRIEND_CUP_RULES`) only.
- `studio/skills/test-first/SKILL.md`.

## Rules
- **Presets:** build them from `stageGroups(LEVELS)`: one preset per city with 2 or more tracks; its stages are that group's indices in `LEVELS` order (New York: Fifth Avenue, Central Park, Brooklyn Bridge, Subway Platform; Tokyo: Shibuya Crossing, Takeshita Street). No custom picks, repeats or mixed cities.
- The index-5 cap on Cup stages goes away, so Takeshita Street (index 6) can be raced in a Cup. Show with a simulated Cup that bots finish Takeshita; if they cannot, stop and report rather than tuning bot AI.
- **Cup length** is the preset's track count everywhere `CUP_RACES` (4) is assumed today: setup validation, cup state message check, `friendCupOver`, `currentStage`, standings, the "race N of M" eyebrow, guest text and the end of Cup. Points per race are unchanged.
- **Validation:** a received Cup's stages must exactly equal one preset built locally from `LEVELS`; reject everything else. Never trust a received race count. Keep every check batch 18 added (racer count, bot ids, bot count).
- **Lobby:** in Cup format the host sees one button per preset, showing the city, its track names and race count, with the chosen preset clearly selected. A default preset is chosen (New York), so Start is never blocked for lack of picks. Race and Elimination formats keep the existing expandable track groups unchanged. Changing preset is a settings change and clears guests' Ready exactly as a stage change does today. Guests see the chosen city and its tracks.
- **Bot count** (batch 18) works unchanged with both presets.
- Bump `PROTO` to 11; update tests that hard-code it.
- **Fairness:** a 2-race Cup must never compare against a 4-race Cup, and a New York Cup in the new order must not compare against older free-pick Cups. If Friend Cup results are saved or compared anywhere (look at `FRIEND_CUP_RULES` and `makeRun` at game.js line 506), bump `FRIEND_CUP_RULES` and keep old saved data untouched; if they are not, say so in the report.

## May edit
- `src/ui/friend-groups.js`, `src/ui/friend.js`, `src/online/duel.js`, `src/sim/friendcup.js`
- `src/sim/game.js`: lines 417 and 506 only. Batch 20 edits the tutorial parts of this file at the same time, so touch nothing else.
- `index.html` and `style.css`: the Friend lobby (`#friendHost`, `#friendGuest`, `#friendStages`, `#friendCupLevel`) only
- `test/friendcup.test.js`, `test/friendcup-room.test.js`, `test/lobby.test.js`, `test/lobby8.test.js`, other tests only where they hard-code `PROTO`, four Cup races or the index-5 cap; new test files
- `game/rounds/round-02/reports/batch-19-cup-presets.md`, `game/rounds/round-02/batch-19-evidence/`

## Must not change
- Solo NYC Cup (`src/sim/cup.js`, `CUP_RULES`, `CUP_STAGES`) and its records; Classic, Daily, Weekly, Challenge.
- Plain friend races and Elimination selection, start sync, host handover, rematch, Ready rules, host Start without Ready, award animation, Cup totals, points values, bot AI and difficulty, `START_PROTOCOL`.
- Art worlds and styling outside the Friend lobby. Live database, `tools/loadtest.mjs`, dependencies.

## Done when
- New tests failed first and now pass: presets built from `LEVELS` (New York 4, Tokyo 2, no Airport); a one-track city gets no preset; a received non-preset, reordered, repeated or wrong-length stage list is rejected; full simulated Cups for New York and Tokyo with 0 bots and with fill, ending after the right number of races with correct standings; Takeshita finished by bots; preset change clears guest Ready; reconnect/cup state accepted for a 2-race Cup; `PROTO` mismatch message.
- Local browser screenshots at 320x568 and 390x844 of the host lobby in Cup format (each preset selected) and the guest lobby, plus a 2-race Cup's final standings. Use the batch 18 capture scripts as the starting point: `game/rounds/round-02/batch-18-evidence/capture.cjs` (host) and `18b-guest-check.mjs` (real joined guest page). Compare fit with `batch-10c-evidence/fit-comparison.json` and report introduced problems only.
- `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
- Real phones and real network: a Tokyo Cup between two phones, including a reconnect mid-Cup.
