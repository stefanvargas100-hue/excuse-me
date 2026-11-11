# Combined competition identity matrix (17d + reviewed 17e airport correction)

`L` is the stage id, `C` its exact courseTag (`:rt1`, `:sr2`, or empty), and `P` the raw daily date / weekly period. Everything below is local code/schema inspection and local mocked/browser evidence; no live acceptance is claimed.

| Mode/path | Legacy retained | Current reads/writes | Menu / remote paths |
|---|---|---|---|
| Standard run helper | explicit standard r1 -> unsuffixed base | omitted/current standard r2 -> `base:standard:r2` | `recordKey` pins r1 independently of RULES_VERSION; policies unchanged |
| Classic numeric best | `excuseme_best_L` and `excuseme_best_L:cm2` | `excuseme_best_L:cm3` | state.bestOf -> game result + buildStages; old scores never promoted |
| Classic own ghost | `excuseme_ghost_L:cm2` | `excuseme_ghost_L:cm3:standard:r2` | replay ghostStart/ghostSave and duel sender share ghostKeyFor |
| Classic friend ghost | untagged/cm2 friend entries | `excuseme_fg_classic_L:cm3:standard:r2` | shared friendGhostKey; room kind `classic:cm3`, rules `cm3`, stage L, course empty required |
| Classic score/top ghost | `classic:L:cm2` rows untouched | `classic:L:cm3` | online boardId/submitBestRun/fetchTopGhosts, boardIdFor selector; top ghosts scoped by exact board query, payload cleanGhost validation; no persisted top cache |
| Daily / Weekly | raw legacy and `P:mp2` scores/queues retained | `excuseme_<mode>_P:mp3`, `<mode>:P:mp3` boards | seededIdentity captured at start; result writes its captured scoreKey and submits its key; explicit `P:mp2` remains mp2 even after rollover/update |
| Period eligibility / menus | `excuseme_played_<mode>=P` | same period-wide marker | old played period without current score displays `Played`, remains used; current card reads only mp3; clock, level selection, raw RNG seed and modifiers unchanged |
| Race numeric best | `excuseme_race_best_LC` | `excuseme_race_best_LC:standard:r2` | finishRace/raceBest; omitted-run buildStages read uses r2 |
| Race own ghost | `excuseme_ghost_race_LC` | `excuseme_ghost_race_LC:standard:r2` | replay and room sender use same helper, including route-only tags formerly omitted by sender |
| Race friend ghost | untagged and old sr2 entries retained | `excuseme_fg_race_LC:standard:r2` | current room kind `race`, rules 2, stage L, exact course C required before persistence; current room stage must match |
| Race boards | `race:L` retained | `race:L_<course>_r2` (omit course segment for empty tag) | selectors and submit helper share raceBoardId; **submission and board fetching stay disabled**, no race-top fetching added |
| NYC Cup | `excuseme_cup_nyc:r3` | `excuseme_cup_nyc:r4` | cupBest/startCup/result use CUP_RULES 4; category suppresses ordinary records/ghosts/scores; current fixed stages contain no airport |
| Friend Cup | category/rules 1 and protocol 8 | category/rules 2 and protocol 9 | no persistent personal Cup best or ordinary record/ghost/score; host results/awards unchanged; airport is selectable |
| Challenge | `excuseme_wchal_P:challenge:r1`, `wchal:P:r1` | `excuseme_wchal_P:challenge:r2`, `wchal:P:r2` | challengeBest/menu/start/finish/submit use competitive rules 2; content seed stays `wchal:P:r1`, exact stage/outfit fixtures unchanged; weekly boundary and unlimited retries unchanged |
| Practice / elimination | old category data retained | category suffixes use rules 2 when needed | ordinary records/scores/ghosts suppressed; elimination XP/progress unchanged; airport layouts use reviewed race generation |

Race board examples: airport/nyc/shibuya/bridge use `_rt1_r2`; subway/takeshita `_sr2_r2`; park `_r2`. Local record and ghost keys retain literal course tags and `:standard:r2`. Different encodings are intentional: supabase/migrations/0003_race_times.sql requires `^race:[a-z][a-z0-9_-]{0,34}$`, while schema.sql limits the full board to 40 characters. Extra-colon board names from the earlier plan would fail that local constraint. No schema/migration was edited or applied. Challenge's existing r-number and Classic cm3 board names fit their inspected local constraints; this is not deployed-server verification.

All room packets are stamped PROTO 9 at bindRoom's send boundary (including reconnect transports and handover traffic). Non-handshake incoming packets require current proto and current roster membership before heartbeat, lobby, ghost, rematch, position, Cup or result mutation. Hello/roster apply their strict version checks; incompatible joins show update messaging. START_PROTOCOL remains 2; synchronized/cancellable Start and the reviewed host button/award behavior remain intact. Positive existing rematch/reconnect/late-join/handover tests and new old/missing/wrong-protocol join/packet tests exercise actual callers.

Queues: online/board.js is unchanged. Existing entries already contain final board names; retries preserve those strings. Tests submit captured mp2 through actual online.submitRun, retain old queue objects on flush failure, and submit new mp3 independently using an offline fetch stub only. Legacy/current saves coexist in actual best/ghost/Challenge/Cup reads and race writes. The browser uses actual menu events for old/current cards and omitted-run race bests. Race start still never calls the Classic top fetcher; disabled race submit/load produces no fetch request.
