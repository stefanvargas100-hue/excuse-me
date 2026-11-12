# Status

## Combined update pushed; publication verification assigned - 2026-11-11

**Updated:** 2026-11-11, by Claude (lead). This checkpoint supersedes the "Now" and "Next action" of the handoff section below; the rest of that section still applies.
- Postmerge build on develop passed (93 modules, main.js 342.15 kB) and `git diff --check` passed, closing the gap left by the handoff. Suite stays 855/855 from the saved log; no source changed since.
- Develop pushed with this checkpoint. The published build ID is the commit that added `game/rounds/round-02/batch-17g-publication-check.md`; find it with `git log -1 -- <that file>`. Later documentation commits are not the served build.
- Batch 17g (Codex defaults, evidence only) verifies Tests, Pages and HTTP 200 with the matching build marker. **Do not claim the playtest is published until its report says so.** Last verified playtest is still 11c3fde.
- Cleanup done: cap-trial and cap-review were clean and merged; workspaces and branches removed. belt-check, visual-pass and art-styles workspaces preserved.
- **Next action:** when 17g reports, review it, merge its report/evidence into develop locally, remove its workspace, and tell the Director the playtest is ready (or what stage failed). Do not push the report merge on its own: a push changes the served build ID. Then the Director playtests; main still needs explicit approval and the queued visual pass first.

## Lead handoff: combined update integrated, publication pending - 2026-11-11

**Updated:** 2026-11-11, by Codex. This checkpoint supersedes all older sections below.
**Lead branch:** develop, gameplay/integration HEAD ab43d52; handoff commit follows it.
**Published playtest:** last verified 11c3fde at https://stefanvargas100-hue.github.io/excuse-me/playtest/. Local origin/develop also points there; no new remote verification in this handoff.
**Main:** local main 72f05e3; no main merge performed or authorized for this bundle.

### Now
- Round 02, integration validation before playtest publication. Independent combined review f966d84 PASS was merged into develop as ab43d52, including cap implementation 5a5551d/report 5f6a580 and prior review history. Candidate and reviewer work are preserved in Git; do not reimplement or re-review cleared findings without new evidence.
- Lead integration suite on ab43d52 finished 855/855, zero failed/skipped, 178.6 seconds. Saved log: game/rounds/round-02/batch-17-integration-evidence/tests.log. Integration diff check passed before the suite. **Postmerge build has not run yet.** No source edits after the suite; handoff changes are documentation/evidence only.
- Director paused project work to discuss subscriptions, then requested this handoff. No subscription decision or purchase authorization. No new workers dispatched during the pause. Cap builder/reviewer are finished; no active implementation owner is expected for this bundle.
- No additional Director decision needed to finish the already approved treatment-A trial and publish to playtest after checks. Main still requires explicit Director approval, and the queued visual follow-up must be included before any approved main update. Live database/migrations/load testing remain unauthorized.

### Next action
Run npm.cmd run build and git diff --check on develop. If successful, finish the integration record, write a new batch-17g-publication-check.md brief, commit the publication checkpoint, and push develop normally. Dispatch a Codex publication verifier using that exact final pushed SHA; end the turn after dispatch. **Do not reuse batch-10e unchanged:** it incorrectly excludes the cap update from the publication scope.

### Publication and cleanup
- Verifier must confirm the exact develop Tests run, its successful downstream Pages deployment, and HTTP 200 for playtest HTML and referenced main JS with the expected embedded short build ID. Pages workflow SHA can be main; distinguish it from the develop build marker. No claimed publication until matching HTTP evidence. Follow prior publication briefs; no local full-suite repetition or live service writes needed for evidence-only verification.
- cap-trial and cap-review sibling workspaces were clean at handoff; branches stefanvargas100-hue/cap-trial and stefanvargas100-hue/cap-review are included in ab43d52. Recheck clean status and ancestry, then remove merged workspaces/branches through Orca under standing cleanup instructions. Relevant completed dispatches: cap builder ctx_d5873c2e284a; reviewer ctx_88fb6eb67e7e. No follow-up implementation is currently required.
- **Preserve belt-check workspace.** Its merged branch contains untracked batch-10f-evidence/baseline/ and baseline.zip. Worker automatic approval review rejected temporary baseline cleanup; do not retry/bypass that rejection. Host/Cup worker and review workspaces were already removed after merging.

### Bundle and evidence
- Treatment A applies the original build speed contribution after the non-build speed cap; acceleration/recovery rules stay unchanged. Stats blob matches 61b9edb. Native bot evidence already covers 210 ordinary races/630 finishers and six deliberate contact probes with 18 timeouts retained. No consistent crowded winner; do not claim human balance or rerun the matrix without cause.
- Compatibility separates standard r2, Classic cm3, Daily/Weekly mp3, Cup 4 and FriendCup 2 records/ghosts as applicable, preserves prior attempts/queues, uses PROTO 9, and preserves Challenge content recipe despite new competition identity. Race boards remain disabled. No deployed schema acceptance or live transport claim.
- Airport generation correction was integrated before this bundle and intentionally changes airport race crowd positions. Exact people.js blob matches reviewed ac1c301; Challenge recipe/seed/outfit remain preserved. Earlier airport suite failure was inherited, reproduced, fixed, and independently checked. Do not restore the rejected mk hook.
- Host/Cup changes already on develop are included in the pending publication: host Start without separate Ready, reachable lobby actions, distinct animated +round award and cumulative Cup totals with duplicate-animation protection. Scoring unchanged. Independent review 94329e3 passed; actual transport reconnect/reload and dropped-ack browser cancellation remain unverified.
- Read reports/batch-17f-combined-review.md and batch-17f-evidence/review.md only as needed: 405 focused checks, 156 invalid packet rejections, 55 frozen Challenge week comparisons, independent local browser captures at 320/390, build/diff PASS. Prior S2 Challenge reset and S3 identity/preview behavior findings are closed. Builder full suite was 855/855 and lead integration now independently matches it.

### Remaining studio work
- Inherited S3 narrow captions/headings and shared fit findings belong to the visual queue. Current world artwork is authoritative; do not wholesale replace it with the older visual-pass branch. Director requested a later Claude Fable visual pass; preserve that preference and the before-main requirement.
- Still open: expandable location track groups, group/custom-four-race Cups, selectable bot counts including zero, finish spectating, tutorial/scripted/stage movement parity. See playtest-followup intake and game/todo.md; these are not completed by this bundle.
- Real-phone feel, loaded human shortcut balance, installed service-worker updates, deployed schema acceptance and actual live transport/reconnect remain unverified. Browser emulation and bot evidence are distinct from those checks.
- Use saved batch briefs and Orca workers per playbook. Keep the fresh lead context narrow; no need to reload historical status sections or full past conversations.

## Combined cap candidate ready for independent review - 2026-11-11
- Cap-trial candidate 5a5551d/report 5f6a580 includes compatibility/stat-display work, unchanged approved treatment A and authorized develop/airport merge 2709bf0. Builder reports 855/855 full suite, focused 42/42, later expanded all-stage wire 5/5, build/diff and local browser at both widths. Not integrated or published.
- Lead inspected identity matrix/new source and representative max-stat, played-period and populated-airport screenshots. Race board underscore suffix matches inspected local SQL constraints; deployed acceptance remains unverified. Narrow item captions remain visual work. Batch-17f-combined-review.md returns candidate to independent cap-review owner for complete records/ghosts/queues/protocol/layout audit and prior-finding disposition.
- Publication stays held until combined review and coordinator integration checks. Latest verified playtest remains 11c3fde; main unapproved and queued visual pass still required. Belt workspace temporary baseline remains preserved following worker cleanup rejection.

## Airport generation fixed; bundle with cap compatibility - 2026-11-11
- Batch 10f reproduced inherited seed-35 belt failure on current and 394d12e: 35/999. Final genChunk-only correction 985b44b/report ac1c301 passes lead full suite 837/837 after worker's two intermediate failures; no mk hook remains. Integrated 3a23f0a has identical source/tests/tools to checked candidate and passes merged build/diff. Original worker partial outcome is retained; lead validation closes its missing final-suite check.
- Final seed rows 1-100 audited with zero generated reverse occupants/threshold failures. Airport race positions change, so publication remains held for batch 17d new competitive identities, not for a failing test. Addendum batch-17e-belt-companion.md directs active cap worker to checkpoint then merge develop, verify category/ghost/peer isolation and capture populated airport browser evidence. Challenge recipe/seed/outfit stay frozen; airport spawn correction is explicit. Independent combined review still required.
- Root evidence moved to round batch-10f-evidence/. Belt worker workspace/branch retained with untracked baseline source/ZIP because its automatic approval review rejected cleanup; no attempt to bypass that rejection. Main unapproved, queued visual pass required, latest verified playtest still 11c3fde.

## Host/Cup integrated; publication held on belt test - 2026-11-11
- Independent 10d review 94329e3 passes: 150 focused checks, expected pre-fix failures, local browser at both widths including secondary-control scrolling, build/diff and no introduced fit findings. Integrated builder/reviewer in 22e4c67. Clean merged workspaces/branches removed after ancestry checks.
- Lead combined suite: 828/829; airport crowd reverse-belt assertion failed (28/911 sampled positions, limit 3%). Build/diff pass. Batch-10f-belt-check.md assigns deterministic reproduction, baseline attribution and bounded fix; no publishing until resolved. Latest verified playtest remains 11c3fde. Batch-10e publication brief is prepared but not dispatched.
- Batch-17d-cap-compatibility.md authorizes the sequential compatibility/UI companion on preserved cap-trial, with reviewed host/Cup merged there first. Exact approved speed formula only; retain Challenge content and Daily/Weekly attempts while isolating records/ghosts/peers. Parallel belt work has disjoint ownership. Cap review remains required before integration; main approval and queued visual pass remain outstanding.

## Host/Cup acceptance complete; independent review next - 2026-11-11
- Batch 10c implementation/evidence 17fb564 and report d025d88 preserve scoring and PROTO 8 while preventing duplicate award animations on fresh equivalent state. Builder reports 829/829 full tests, focused 120/120 and presentation 62/62, build/diff pass; local eight-page browser checks exercise enabled controls and completed animations at both widths.
- Lead inspected semantic-key diff and narrow host/standings plus 390px local results screenshots. Comparable fit evidence reports 32 baseline failures versus 31 candidate, zero introduced. Independent batch-10d-review.md audits complete host/Cup delta, start guards, award lifecycle, screenshots and evidence before integration. Actual transport reconnect, browser dropped-ack cancellation and real phones remain unverified; simulated checks are separate.
- Cap trial/review remain ready for the sequential compatibility/UI companion after host/Cup review and integration. No publication or main merge in this checkpoint; latest verified playtest remains 11c3fde. Queued visual pass remains required before approved main update.

## Host/Cup recovered; acceptance gaps assigned - 2026-11-10
- Batch 10b preserved WIP 12ef711, merged develop 0cb02c8 and implemented 422ad69/report 3c2b9f4. Reported 822/822 suite before final wording, focused/build/diff pass. Lead inspected diff and 320px full-lobby/standings images; scoring defect not found, +round points presentation added, host separate Ready removed using existing protocol.
- Batch-10c-acceptance.md returns missing zero/motion/redraw/reconnect tests and enabled-control evidence to same worker; investigates inconsistent current/next race labels in captured fixture. Broad fit 31 failures require comparable baseline evidence before calling them inherited. Not integrated. Cap compatibility remains sequenced after shared-file completion; main unapproved.

## Delayed shortcut verification archived; current work unchanged - 2026-11-10
- Integrated evidence-only e075ce9: original shortcut Tests/Pages succeeded for 2d712c0; resumed HTTP capture instead found newer 11c3fde (200). Worker outcome stays partial for its historical matching-ID requirement, not a current publication failure. Earlier direct lead verification and later independently verified 11c3fde remain separate evidence; no rollback/redeploy or new gameplay testing warranted.
- Host/Cup recovery restarted successfully as ctx_3b1bdc547b4a on original task task_c71dafd399d4 and preserved playtest-fixes workspace; required batch-10b recovery brief delivered. Cap/evidence review passed; compatibility/UI companion waits for shared files. Main remains unchanged and unapproved.

## Cap review passed; shared-file recovery precedes companion - 2026-11-10
- Independent cap review 2d9a79c passes approved stats/native-bot evidence: 24 focused checks, six exact full-race reproductions, all 72 historical rows, independent aggregation, build/diff pass. Full 825/825 accepted from builder. No integration or publication yet.
- Companion must resolve S2 proposed Challenge content reset by separating competition identity from existing content seed; S3 menu old/new score reads, captured mp2 identity suffix preservation and preview +/-13 normalization are required. Preserve weekly content, reset clocks, attempts, legacy saves/queues; no extra tuning or database work.
- Batch 10 worker was proven exited but dispatch remained unsettled; retry was safely refused. Guarded worker-stop confirmed stopped for ctx_65467018af79, preserving workspace/WIP. Retry same task in playtest-fixes with batch-10b-recovery.md before shared compatibility edits. This replaces the ineffective earlier resume message, not the original task or its preserved work.

## Cap trial implemented; independent review assigned - 2026-11-10
- Builder 61b9edb/db0f0b4 reports approved A formula, 522,720 loadout checks, 825/825 full tests/build passing, 630/630 bots finishing 210 normal races and six deliberate 20s contact trials (18 timeouts retained). Lead inspected formula/helper/evidence: large speed-kit mean finish deltas Fifth +1.10s, Subway -0.70s, Takeshita -0.02s; no consistent crowded winner. Not published.
- Batch-17c-cap-review.md assigns independent code/measurement audit and representative reproductions. Batch-17b remains a proposed compatibility/UI companion, not implementation authorization; preserve existing deterministic Challenge content while deciding minimal identity isolation. Main still requires approval.
- Batch 10 remains unresolved: worker-show reports exited and retained; prior resume message has not established completion. Its preserved WIP/shared-file ownership must be recovered or explicitly released before companion edits. Do not assume a sent message means active work.

## Approved cap trial: bot validation requested - 2026-11-10
- Director explicitly requested testing with bots. Active cap-trial worker receives batch-17a-bot-validation.md: paired legacy/A populated races with native bot AI, fixed seeds, balanced positions, all builds and plain/capped gear, plus real collision evidence and reproducible results. No additional tuning authorized.
- Compatibility companion and independent review still precede integration/publication; bot results must be distinguished from phone handling checks. Main remains unapproved. Batch 10 retains shared-file ownership.

## Treatment A trial approved - 2026-11-10
- Director approved implementing/testing treatment A for playtest. Batch-17a-approved-cap-trial.md assigns stats-only implementation plus exhaustive and real-tick checks, original build rows unchanged. No additional tuning approval needed for that exact formula.
- Batch 10 recovery owns shared UI/game/network files, so 17a cannot edit those concurrently. Required sequential compatibility companion will isolate records/ghosts/boards and mixed-version races and address any stat-display assumptions before trial integration/publication. Main remains unapproved; phone/crowded balance remains human validation.

## Build-cap trial proposal awaiting Director approval - 2026-11-10
- Integrated measurement-only study f315020 from build-balance-study; no production tuning. Lead reran 3/3 tool tests and diff check; full gameplay/build exempt for study-only scope. Original 36 cases preserved, 72 comparison rows and exhaustive 174,240 same-gear/body tuples per build recorded.
- Recommend treatment A for controlled playtest trial: cap non-build speed contributions at +/-10, then add original build speed points; acceleration/recovery unchanged. This removes all measured same-gear speed ties, but lowers small speed in 2.76% of enumerated tuples. Example male speed kit: large 3.180 -> 3.234 m/s, small 3.144 -> 3.126, medium unchanged. Plain kit unchanged. This does not prove competitive balance.
- Director approval pending before implementation; see batch-16-build-proposal.md. Earlier +4/-3/-1 proposal withdrawn. Any implementation needs explicit score/ghost/multiplayer compatibility planning and phone trial. Main unchanged; host/Cup batch 10 recovery remains assigned separately.

## Build balance study needs cap disposition - 2026-11-10
- Batch 16 study ef9bfbb/report c52656c reports 36 deterministic actual-tick cases, 2 focused tests and exact repeatability; no production changes. Large has modest clear-cruise benefit but speed gear can cap medium/large equally while retaining large acceleration cost.
- Proposed +4/-3/-1 does not resolve capped gear weakness and reduces plain repeated-burst average. Lead assigned bounded batch-16b-cap-study.md to compare two in-memory speed-cap treatments before recommending values for Director approval. Not integrated or approved tuning; human crowded/shortcut balance remains unproved.

## Continued playtest follow-ups - 2026-11-10
- Director requested continued work. Resuming interrupted batch 10 in its preserved playtest-fixes workspace via batch-10b-recovery.md: checkpoint inherited WIP, merge current develop into worker branch only, finish host Start/Cup-points evidence, independent review before integration. Lead confirmed prior agent exited; no duplicate implementation worker.
- Parallel batch-16-build-balance-study.md produces mechanics measurements and proposed large/small/medium tuning, without production changes. Proposed values still need Director approval. Shared-screen visual follow-up and tutorial/stage parity remain queued; main remains unchanged.

## Daily/Weekly playtest publication verified - 2026-11-10
- Verified playtest build 11c3fde: Tests 42895513510 and downstream Pages 42896427872 succeeded; page and referenced main.js HTTP 200 with matching embedded ID at 2026-11-10T20:34:12Z. Worker report/evidence 02f326e integrated; evidence lives under reports/batch-14d-evidence/. Documentation HEAD is not the served build ID.
- Classic, Daily and Weekly shared build stats/speed bonuses/existing pickups are available for phone playtest, with combo slowdown/zoom/tint removed. Prior integrated suite passed 816/816. Main unchanged and still requires explicit approval.
- Open: phone feel and crowded shortcut balance, deployed schema acceptance, installed live service-worker behavior, tutorial/stage parity, inherited S3 heading clipping/later visual review, interrupted batch 10 and remaining playtest feedback. Publication verification does not resolve those checks.

## Seeded movement integrated for playtest - 2026-11-10
- Independent review f777ca4 cleared batch 14 with 112 focused tests and 40 baseline crowd comparisons; no blocking regression. Integrated builder 55ca35b/report a6e2f6e and reviewer evidence/tests as b3941d8. Lead combined suite 816/816, build and diff checks pass.
- Daily/Weekly now share Classic build stats, pace bonuses and endless pickups, with captured mp2 score/board identities, unchanged reset clocks/attempt markers and isolated legacy queues. Lead inspected 320 Daily results and 390 Weekly boost screenshots. Browser emulation only; phones/deployed schema remain unverified.
- Publishing through develop; batch-14d-publication-check.md verifies exact served SHA before claiming live. Main remains unchanged. Merged builder/reviewer workspaces and branches removed after clean/ancestry checks.
- Existing S3 narrow leaderboard heading clipping is a queued shared-UI visual follow-up in game/todo.md. Tutorial/stage parity, later visual review, interrupted batch 10 and remaining playtest feedback remain open.

## Seeded movement recovered; independent review pending - 2026-11-10
- Builder implementation 55ca35b/report a6e2f6e on seeded-movement reports 814/814 full tests, 93 focused, build/diff pass and actual /playtest/ browser captures at 320/390. Direct pickup calls now compare matching-state full crowd objects and RNG sentinels; mutation caused 40/40 intended failures before removal. Original failures retained as historical evidence.
- Batch-14c-review.md assigns independent review of movement, frozen mp2 IDs/clock boundaries, preserved attempts/queues/crowds and test harness validity. Not integrated. Inherited 320 leaderboard heading clipping needs disposition; phone/deployed-schema checks remain unverified. Published Classic 1f9faec and main unchanged.

## Seeded movement partial; validation recovery assigned - 2026-11-10
- Batch 14 worker stopped as instructed with uncommitted implementation in seeded-movement and committed partial report. Full suite 766/772; six failures (five newly added crowd comparisons and one obsolete legacy board expectation). Build/diff passed; browser/boundary/acceptance coverage unfinished. No integration.
- Lead inspected preserved diff/logs: crowd test advances different movement states before comparing entire objects including player-relative prevDz. Recovery brief batch-14b-recovery.md directs isolated pickup-generation and explicit RNG-sentinel tests, keeps meaningful generation comparisons, updates intentional mp2 expectations and completes missing acceptance/browser evidence. Existing Classic playtest 1f9faec remains unchanged.

## Classic playtest publication verified - 2026-11-10
- Publication worker report/evidence 950a996 verified exact develop build 1f9faec: Tests 42891258496 and downstream Pages 42892681554 succeeded; playtest HTML and referenced main.js HTTP 200, embedded ID matches. Evidence checked at 2026-11-10T20:12:12Z and retained in batch-12e-evidence/. Report integrated; documentation HEAD is not the published build ID.
- Classic build stats, speed bonuses, existing endless pickups and constant combo view are available for phone playtest. Phone feel, installed live service-worker behavior and deployed server acceptance remain unverified. Main remains unchanged.
- Daily/Weekly movement parity is assigned to Codex in seeded-movement under batch-14-seeded-movement.md (dispatch ctx_bcdab82cef19); implementation and independent review pending. Later visual review, tutorial/stage parity and interrupted batch 10 remain open.

## Remaining parity plan disposition - 2026-11-10
- Batch 13 planning branch 04341ed integrated (source inspection only). Lead adopts shared Daily/Weekly stats/pace/pickups and competition-key audit, but defers the proposed server attempt ledger/UTC or scheduled activation changes as broader than movement parity.
- Batch 14 brief implements new seeded mp2 score/board identities with frozen period/rules, unchanged reset clock and played markers, deterministic crowds and existing enforcement limits. Old-client scores remain isolated on legacy boards; no database work or stronger account-wide enforcement claim. Independent review required. Tutorial learning and race-only stage features remain later follow-ups.
- Classic playtest publication 1f9faec still awaits its verification worker report; do not substitute documentation HEAD for expected build. Main remains unchanged.

## Scoped Classic integrated for playtest - 2026-11-10
- Independent re-review 59e4b30 cleared S2 and both S3 findings. Integrated review branch (preserving all evidence and implementation 0cbb2d7) as 87c5111. Lead combined checks: 751/751 tests, build and diff pass. Lead inspected 320-small pickup and 390-large boost captures; browser evidence only.
- Classic now has shared build stats/pace, endless existing pickups, constant combo view and cm2 record/ghost isolation. Original race drafting preserved. Merged builder/review workspaces and branches removed after clean status/ancestry checks.
- Publication to playtest proceeds through develop; batch-12e-publication-check.md verifies exact served build. Main remains unchanged and requires approval. Phone feel, deployed-server acceptance and installed live service-worker behavior remain unverified.
- Remaining all-mode movement request stays open: batch-13-parity-plan.md scopes Daily/Weekly/scripted movement and stage features with fair competition identities. Later visual review and interrupted batch 10 remain outstanding. Do not label Classic completion as complete all-mode parity.

## Classic review fixes awaiting re-review - 2026-11-10
- Batch 12c implementation 0cbb2d7/report 9ca46c5 restores original player/bot pedestrian drafting, isolates pickup lifecycle, tests current-kind wrong rules, and captures actual /playtest/ channel evidence. Builder reports final 751/751, focused 22+2, pickup repeats 20/20, build/diff pass.
- Original independent reviewer assigned batch-12d-rereview.md. No integration yet; prior S2/S3 findings require clearance. Daily/Weekly and stage-feature parity, real phones and deployed server acceptance remain outstanding. Main unchanged.

## Classic review HOLD and targeted fixes - 2026-11-10
- Independent review a6e23fa on classic-review found S2 ordinary-race pedestrian drafting regression with unchanged identities; restore pre-batch behavior, not widen migrations. Lead brief wording was overbroad: no invented Classic drafting did not justify changing existing races.
- S3 gaps: browser query did not select actual playtest channel; endless pickup test intermittently fails with crowd generation. Reviewer full 749/749, focused 45/46, recheck 11/11, browser six cases/build/diff pass. cm2 compatibility passed inspection; live schema/phones unverified.
- Fix brief batch-12c-review-fixes.md assigned to original builder; independent re-review required before integration. Daily/Weekly and race-only stage-feature parity remain outstanding, not complete. Main unchanged.

## Classic implementation review and verified shortcut publication - 2026-11-10
- Lead verified shortcut playtest 2d712c0: Tests run 42837699444 and Pages run 42839254144 succeeded; page and assets/main.js HTTP 200, served bundle contains expected build ID. Publication worker previously hit usage limit; this is direct lead verification, not its report. Human loaded balance/phone checks remain.
- Classic batch 12 reported implementation 5c91068/report d7913b1, 748 full tests and 62 final focused checks, build/diff and Chromium evidence. Not integrated. Independent batch-12b-review.md covers cm2 compatibility, final safety fixes, race drafting regression risk, and remaining Daily/Weekly/stage movement exceptions. Main approval and later visual review remain required.

## Approved shortcut publication and Classic parity - 2026-11-10
- Director approved shortcut integration/publication to playtest, retaining loaded-human balance and real-phone checks. Integrated builder cad626c and independent review/tool 81f8c59 as 8e5d123. Lead integrated checks: 734/734 tests, build and diff check pass. Merged builder/reviewer workspaces and branches removed; evidence retained in develop.
- Push to develop authorized; publication verification assigned in batch-11e-publication-check.md. Do not claim served build until that report verifies it. Main merge remains unapproved.
- Director requests constant visuals without combo slow motion, and Classic speed increases/build stats/existing power-ups matching movement in other modes. Codex brief batch-12-classic-movement.md; review required before integration. New art worlds remain authoritative, later Fable visual review remains queued. This work takes priority over remaining lobby/spectating/custom-Cup proposals.
- Batch 10 host/points WIP remains preserved in playtest-fixes, not integrated or claimed complete. No live migration authorized.

## Shortcut re-review cleared - 2026-11-10
- Independent review 81f8c59 on shortcuts-review (review merge f6497e8) clears both S3 findings in worlds-shortcuts a30ed99/cad626c: neon signs readable across six actual-size captures; Cup pressure and stale costs respect floors. Reviewer reports 78/78 focused regressions, baseline reproduction 10 failures/5 positive passes, build/diff pass. Full 730-test pass remains builder evidence.
- Implementation fixes are cleared, but batch 11 remains partial on loaded human route balance and real phones. No integration/deployment/main merge performed. Next Director decision: approve publishing this reviewed candidate to playtest for targeted main-versus-shortcut timing, retaining balance hold and main approval gate. Avoid more automated tuning against collision-heavy controllers.

## Shortcut review fixes checkpoint - 2026-11-10
- Batch 11c reported complete at cad626c on worlds-shortcuts; code a30ed99. Signs now render after world effects; Cup pressure/stale lane costs filter floors. Reported 15 pressure regressions, 78 related checks, 730 full tests, fit 70/0, build/diff pass.
- Independent re-review assigned under batch-11d-rereview.md. Not integrated; loaded human balance and real-phone evidence remain outstanding. No balance constants changed.

## Shortcut independent review checkpoint - 2026-11-10
- Review/tool committed on stefanvargas100-hue/shortcuts-review at 748c434 (tool/evidence 2fe73fd). All 48 runs completed; reviewer reports 32 focused checks/build passing, production unchanged. No S1/S2 implementation regression found by inspection.
- HOLD integration: loaded balance unproved with 9-30 collisions per controller run. Clean controls: Subway ~4.7% faster, alley ~0.7% slower. Loaded alley -7.5%..+10.32% gain; not proof of skilled-human dominance. Director human timing/design disposition needed.
- Two S3 findings assigned to original builder under batch-11c-review-fixes.md: faint neon route strips and existing cross-floor Friend Cup bot pressure. No balance tuning authorized. Main approval remains required.

## Shortcut implementation checkpoint - 2026-11-10
- Batch 11 partial on stefanvargas100-hue/worlds-shortcuts at f1eb59e (polish 2797a9c, gameplay a7840d2). Reported final checks: 715 full tests, 25 focused, 32 related, fit 70/0, build/diff pass. Not integrated.
- Lead inspected 390px screenshot sheet: route pedestrians/barriers and new worlds present. Easy-alley balance unresolved: fixed-x collision-heavy controller shows 6-11% gain and is not adequate fairness proof. Independent review/physical-input measurement brief: batch-11b-review.md. Real phones remain unchecked.

## Visual reconciliation and shortcuts - 2026-11-10
- Director confirmed new art worlds are authoritative: retain/adapt beneficial earlier polish, then improve shortcuts. Batch 11 brief: `game/rounds/round-02/batch-11-worlds-shortcuts.md`; Codex worker requested from current develop, separate from interrupted batch 10.
- Do not wholesale merge batch 09's classic-look polish. Later Fable visual review remains planned. Main requires Director approval.

## Art worlds checkpoint - 2026-11-10, Claude (design lead for the visual update)
- Director ordered a visual update: every stage its own world, in three cup families. Built on `stefanvargas100-hue/art-styles` (35177ff) and merged into develop at 3c5e7c6 with Director approval to publish to the playtest link. 699/699 tests, build and diff check passed on the branch; the merged tree is identical.
- Worlds: Fifth Avenue superhero comic, Central Park Sunday funnies, Brooklyn Bridge sunset pulp, Subway ink noir, Shibuya neo-noir, Takeshita neon pop, Terminal B space station. How it works and how to review: newest entry in `game/decisions.md`.
- Not checked: real phones, phone performance of glow and rain, Japanese sign lettering on devices without those fonts. Menus, customise preview and podium still use the classic look.
- Batch 09 visual pass has reported (`stefanvargas100-hue/visual-pass`, 243fd51) and is NOT merged. It polishes the classic look in files the art worlds also touch (`figures.js`, `render.js`, stage scenery), so review it against the art worlds before merging; some of it may be superseded.
- Batch 10 playtest fixes: the Codex worker stopped on its usage limit with ten uncommitted files in the `playtest-fixes` workspace and no report. Still open; Director has not yet chosen who finishes it.
- Lead work for this update was done from the Claude desktop app, which Orca cannot wake. Check workers by hand (`orca orchestration worker-list`).
- Main merge still requires Director approval. Live migration 0003 remains unapplied.

## Director playtest feedback checkpoint - 2026-11-09
- Clarified: host uses Start without separate Ready; fix clipped control. Totals concern Cup points: verify accumulation and show a clear animated +points award with a persistent numeric value. See intake clarification for acceptance criteria.
- Director finished phone playtest of 35f4f72 and reported Subway shortcut emptiness, Friend lobby readiness/layout trouble, race totals trouble, and weak large-build balance; requested grouped tracks, group/custom-four Cups, zero-or-more bots, and finish spectating.
- Intake and five scoped proposals: `game/rounds/round-02/playtest-followup.md`. Lead owns triage; host readiness wording and which totals fail await clarification. Bugs not yet independently reproduced.
- Resolve this feedback before release; visual pass remains required and its Claude assignment remains capacity-blocked. Main merge still requires Director approval.

## Visual pass dispatch checkpoint - 2026-11-09
- Combined playtest checkpoint below remains authoritative for completed features and verification.
- Batch 09 dispatched from develop at e6b7ef4 to Claude Fable 5.1 in `visual-pass`; immediately interrupted by Claude's five-hour session limit (reported reset: 5pm America/Denver). No completed visual work reported.
- Assignment retained: task `task_4fe912dc57fc`, dispatch `ctx_df6a6bfe6536`. Resume this worker after capacity returns; do not duplicate the assignment or silently change the Director-selected model.
- Visual pass and lead screenshot review remain required before the next main update. Main merge still requires Director approval. Live migration remains unapplied.

## Combined playtest checkpoint ? 2026-11-09
- All feature branches for this playtest integrated: 03, 05, 06, 07, 08. Host handover S1 cleared by independent re-review 1b4d7c5.
- Director accepted current slipstream improvement: test limit explicitly revised to under 65% (measured 59.79%; old baseline 70.47%). Newer Subway/Takeshita medal targets retained; fairness needs phone playtest.
- Final combined full suite 683/683, focused slipstream 5/5, build and diff check pass. GitHub CI also passed 683/683. Playtest build 35f4f72 published; HTTP 200 and matching served bundle marker verified.
- Director-requested cleanup complete: all six remaining worker worktrees removed; only main and Studio Lead (develop) remain. Unmerged review/QA/old countdown branches retained.
- Loose slipstream measurement edits and host-handover logs backed up and hash-verified at C:/Users/stefa/orca/worktree-backups/Excuse-Me-2026-11-09 (manifest.json). Merged host-handover and slipstream branches deleted; original saved session transcript unchanged.
- Visual pass AFTER feature playtest build, included in next main update; main merge still requires Director approval.
- Live race leaderboard migration/activation not performed. QA trial remains partial; real phones/live networking not verified.
- This checkpoint supersedes the historical checkpoints below.


## Recovery checkpoint ? 2026-11-09, Codex
- Workspace authority: develop at c33c8cd, clean before this documentation update, eight commits ahead of origin/develop. Local main is 72f05e3; deployment not verified.
- Previous lead merged 05 (253bd46) and 07 (c33c8cd). Its saved transcript records 663/663 tests, build, diff check and UTF-8 check passing after 07; not rerun during recovery.
- 06d stopped at Claude usage limit, with three uncommitted files in host-handover-2. Preserved as batch-06e-inherited.patch. Codex recovery brief: batch-06e-countdown-recovery.md; independent review required before merge. Original checkout and provider session preserved.
- Director moved 09 visual pass until AFTER the combined feature playtest. Do not start it beforehand.
- 03 is failed/exited in Orca, not running; its report still needs inspection. 04 QA remains partial. Migration 0003 remains unapplied pending approval.
- 06e recovery reported complete at f7f7999: 679/679 tests, build and room simulations reported passing. Independent review brief 06f prepared; not yet merged.
- 06f review f650650 reproduced an S1 rejected-message countdown split. 06g assigns the focused validation fix to the recovery builder; do not merge before re-review.
- Director clarified: features go to playtest first; visual pass follows and MUST be included in the next main update, after approval.
- 06g implementation 2c4cc38 reports 682/682, build and simulations passing; 06h independent re-review requested. No merge until S1 is cleared.
- Older checkpoint below is historical and superseded where noted.


**Updated:** 2026-11-09, by Claude Opus 5.5, at a lead handover (context past 100K)
**Lead branch:** `develop` at `4b7d08b`, pushed, so the playtest link updates
**Live version:** `main` at `30d0cd4`

## Now
- **Round:** 2, at step 7 of the playbook (reviewing results). Plan: `game/rounds/round-02/proposal.md`. Merge order: 03, 08 (done), 05, 06, 07.
- **Merged:** batch 08, Subway in the Cups (NYC Cup is 4 races, `CUP_RULES` 3; Friend Cups allow stage 5). 632 tests and the build pass. Branch and workspace deleted.
- **Done, waiting for lead review:**
  - 05 `time-boards` (`6c43f74`): Race tab and name rules. Name cap is 24 for all names; there is no name form. Migration `0003` is written but **not applied**: it needs Director approval. Review it and the playtest separation.
  - 04 `cups-qa` (`193d974`): partial, no confirmed bugs. Forced finishes, not full player-driven Cups. Judge whether a QA worker earned its cost.
- **Running:**
  - 03 `slipstream-lines` (Codex): second cycle under a brief from an earlier lead that is lost. "Within 10 points of the floor" means an upper bound.
  - 06b `host-handover-2` (Claude Opus): **done**, `2b11a96`, report `4061d45`. 642/642 tests, and the simulated Cup completes with the message table. Codex second review `review-host-handover` running (plan `batch-06c`). The builder flagged a small race-1 countdown display glitch whose fix is in `game.js`. Merge after the review.
  - 07 `side-routes` (Codex): Subway routes done in `1cf85eb` (partial). It stopped on a build error that looks local; real cause found by the lead: `src/render/side-routes.js` saved in the Windows code page. Follow-up `batch-07c` sent: merge develop (new `test/utf8.test.js`), re-save as UTF-8, then Subway medals and Takeshita Street. Part 1 now builds; Subway measured in `9020d04`. Ruling sent: it may also tag the race ghost key in `duel.js` `shareGhosts` with `courseTag` (that line only), which touches the same file as 06b.
- **Queued:** 09 visual pass (`batch-09-visual-pass.md`), Claude Fable 5.1, approved by the Director. Start it once 06b has reported **and** 07 has merged. Part 1 proposes, then part 2 builds the worker's own top 10 with no approval stop. It is exempt from the 2-failure stop rule (Director).
- **Waiting on the Director:** playtest Subway in the Cups and the checks in `game/todo.md`; approval to apply migration 0003 once reviewed.

## Risks
| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Alpha's 7 new stages plus side routes are the largest work ahead | High | High | Reusable side-route system proven on the subway stage first. Placeholder art allowed | Lead |
| Host-run bots may hit Realtime message limits | Medium | High | One combined message, measured with 7 bots in the Friend Cup online batch | Lead |
| Matchmaking may need a server and has cost and security decisions | High | High | Revisit `archive/INTERNET_MULTIPLAYER_PLAN.md` in a spec | Lead |
| Player-chosen names need moderation | Medium | Medium | Filter and reporting in the spec | Lead |
| Real-phone checks are still open | Medium | High | Director playtest each round, using the playtest link | Director |

## Next action
Review batch 05 with `studio/skills/process-review/SKILL.md`, then merge it. Then handle the other workers as they report.

## Worth knowing
- Playtest link: `https://stefanvargas100-hue.github.io/excuse-me/playtest/`. It keeps its own save, seeded once from the live save, with all gear, titles and pictures open. It stays off the live boards, separate from live rooms and outside the offline cache. A refresh can take up to 10 minutes to show a new build; the red tag shows the build's commit.
- A push to `develop` also redeploys the live site from unchanged `main`. A failed playtest build cannot stop a live deploy.
- Only `main` may deploy to GitHub Pages, so `develop` deploys through `workflow_run`, which runs from `main`.
- `cancel-in-progress: false` in `deploy.yml` is on `develop` and reaches `main` with the next approved merge. Until then, a `develop` deploy can still cancel a running `main` deploy; the replacement still publishes `main`, but skips `npm test`.
- Passing the host role is planned after the Cups QA trial and before public matchmaking.
