# Round 02, batch 10: host Start access and Cup points

**Builder:** Codex, default model/effort, Director requested. One worker handles these related fixes sequentially.
**Risk:** high (online start and scoring). Independent review required before integration; builder does not approve itself.
**Owner:** builder for provisional S2 host start usability and Cup scoring report; lead for review.

## Goal
Implement the Director-confirmed fixes from the phone playtest of 35f4f72. Host must not manually Ready before Start. The phone screenshot shows bottom controls clipped. Cup round points and cumulative points must be correct and clearly distinguishable, with a small +points animation.

## Read first
- AGENTS.md and studio/skills/test-first/SKILL.md.
- game/areas/online.md and game/areas/visuals.md. Online guide's statement that host transfer is absent is historical: preserve existing host transfer.
- Search src/ui/friend.js (refresh and event handlers), src/online/duel.js (readiness/start/host transfer), src/online/start-sync.js (start gating), index.html friend panel, and style.css relevant panel layout.
- Search src/sim/cup.js, src/sim/friendcup.js, src/sim/game.js and src/ui for Cup awards/standings presentation; read only relevant sections.
- Related existing tests: lobby, ready-start, start-sync, friendcup, friendcup-room, cup-model and cup-flow. Search before reading.

## May edit
- src/ui/friend.js, src/ui/menus.js, src/ui/screens.js; new Cup-only presentation helper in src/ui if needed.
- src/online/duel.js, src/online/start-sync.js, src/sim/cup.js, src/sim/friendcup.js, src/sim/game.js: only readiness/start or Cup point correctness/presentation plumbing.
- index.html, style.css: friend lobby and Cup results/standings only.
- Related test files under test/, tools/fit-check.mjs and tools/fit-rules.mjs only for checks of these screens.
- game/rounds/round-02/reports/batch-10-playtest-fixes.md and screenshots under game/rounds/round-02/batch-10-evidence/.

## Must not change
- Track grouping, Cup format rules, bot counts, spectating, body balance, Subway routes, other visual polish, or save schema. Those are separate work.
- No live database, deployment, loadtest, new dependencies, main merge/push, or subagents.
- Preserve synchronized/cancellable starts, readiness reset after settings changes, host migration, input validation and protocol compatibility. Version shared semantic changes as required by online guide; update affected compatibility tests.

## Done when
1. Reproduce host's two-step flow and clipped controls before fixing. Host sees Start, not a separate Ready action. Guests still Ready; Start cannot bypass unready guests, compatibility, valid settings or required synchronization. Auto-readiness must not create a countdown just from joining. Test changed settings, guest ready/unready, promoted host, and cancelled start.
2. At 390x844 and 320x568 with eight roster slots, long names and Cup settings, host Start and guest Ready are reachable and usable. Scrollable content is acceptable; no trapped/clipped controls. Capture before/after screenshots.
3. Reproduce/trace Cup points for multiple rounds and human finishers. Fix an actual scoring defect if found; otherwise report scoring correctness separately from unclear presentation. Show per-round `+N points` and cumulative total, including zero-point results, without a second award on redraw/reconnect. Animation is brief, does not block progression, respects calm/reduced-motion, and leaves readable numeric evidence. Cover local and Friend Cup where applicable; preserve ties/DNF rules.
4. Behaviour tests fail first then pass. Run focused tests while working, npm.cmd run test:fit, npm.cmd test once at end, npm.cmd run build and git diff --check. Report exact results, including any failures. Screenshots and simulated rooms are not real-phone evidence.
5. Commit only on worker branch; report <=10 lines with required fields and evidence paths. Use Orca worker_done with committed report path. List real-phone validation as outstanding.

## Sequencing
Fix readiness/layout first, then Cup scoring/presentation. This delays resuming visual polish in overlapping screens until reviewed. Visual batch 09 remains required before main, and main still needs Director approval.
