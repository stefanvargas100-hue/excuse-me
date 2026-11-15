# Round 02, batch 27: lead notes for the round report

Written 2026-11-15 by the lead after the merge (644c1e2).

## What it took
- **Briefs:** 27 (build), 27b (hash ruling), 27c (wet patches), 27d (porter notch ruling), 27e (independent review), 27f (cart avoidance), 27f reply (second slip-through). All in this folder.
- **Stop-and-ask cycles: 3.** Two before 27f, as recorded by the previous lead in `game/status.md` (27b, crowd hashes not listed as editable, is one; this lead did not trace the other). The third is 27f's slip-through cap (lead mistake, logged in `game/failures.md`).
- **Follow-ups to the same builder: 3** (27c, 27d, 27f). One independent review (27e), PASS, 3 gap tests, no fix cycle from it.

## Token use, from the Claude session logs
| Worker | Model | Model calls | Output | Cache read | Largest context |
|---|---|---|---|---|---|
| Builder (27, 27c, 27d, 27f) | Opus 5.5 | 204 | 201K | 60.0M | 448K |
| Reviewer (27e) | Sonnet 5.5 | 69 | 73K | 9.7M | 198K |

- The builder averaged about 295K of context per call. Each follow-up went to the same session, so every later call resent everything before it. The playbook's "send fixes back to the same worker" saves a cold start, but by 27f the session was more than four times the lead's own 100K handover limit.
- **Question for the Director (changes how workers operate, so not decided here):** give workers the lead's rule, so a follow-up goes to a fresh worker once the builder's context passes a set size (for example 200K), with the report as its brief.

## Lead checks on merged develop
- Full suite 1064 tests: 1062 pass, 0 fail, 2 todo. Build and diff check pass.
- `porter-overlap.js` rerun by the lead: 0 of 112 porters touched, smallest open side 2.16 m, 2 jumps.
- Diff read in full for 27f (`src/sim/crowd.js`, `src/sim/people.js`): every new branch needs a porter, nothing reads the racer, the reviewer's tests and `test/security.test.js` are unedited since f07db0b.
- Screens, emulated 390x844, not a phone: `tsukiji-porter.jpg` and `tsukiji-wetpatch.jpg` re-taken after the merge. The wet patch now draws under the player and walkers.
- Reported by the builder, not rerun by the lead: the 20-seed bot sweep (all finish, 2 slip-throughs) and the medians.

## Left open
`game/todo.md`: the bump-and-kerb jam (S3), and three S4 items (patch looks like a mat, two kerb nudges, tight Tsukiji gold target).
