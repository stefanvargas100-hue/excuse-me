<!-- Lead checks before sending, each from a real past mistake:
  1. Rules: does anything here conflict with AGENTS.md, this plan's other lines, or Orca's worker instructions?
  2. Numbers: did I measure each target against what it really has to fit, not just the first limit I thought of?
  3. Claims: did I check every file, flag and fact I name, instead of assuming it?
  4. Scope: can the worker finish using only the files listed?
  5. Fairness: for each game rule, did I say what it must keep fair for players, not just its limits?
  Delete this comment in the real plan. -->
# Round NN, batch NN: <title>

**Builder:** <claude|codex>, model, effort. Why: <one line>
**Risk:** low | medium | high. Second review: yes | no

## Goal
<What the player or the studio gets, in one or two sentences.>

## Read first
- `game/areas/<area>.md`
- `<file>`: <function or section>

## May edit
- `<file>`

## Must not change
- <Behaviour, data or files that must stay as they are.>

## Done when
- <Observable result.>
- A new test failed first and now passes, or: <why this cannot be tested automatically>.
- `npm test`, `npm run build` and `git diff --check` pass.

## Left for a person
- <Anything only a browser, phone or player can confirm.>
