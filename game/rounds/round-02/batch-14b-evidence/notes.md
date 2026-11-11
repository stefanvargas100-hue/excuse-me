# Recovery validation

- The original failed full-suite log is preserved in batch-14-evidence/full-tests.txt; it remains failed historical evidence.
- label-red.txt records actual boundary results missing the new readable label before the copy fix.
- sentinel-mutation-red.txt records 40/40 direct-call tests failing after an intentional extra shared-R draw; that temporary mutation was removed. focused.txt passes the restored fixtures.
- Direct-call pairs use identical local date (2026-11-10 noon), mode, stage, modifier, pz=10000, time=42, seed=918273 and no movement tick. They compare full newly generated people JSON plus surrounding RNG outputs, without removing fields or reducing comparison to chunk checksums.
- Actual local midnight and Sunday/Monday boundary tests advance the harness Date constructor and preserve captured score/results keys, old marker values and once-only rewards. Legacy and mp2 queued identities survive offline/reload/retry as four separate boards.
- Browser evidence runs Vite at /playtest/ with every non-loopback request aborted. Daily/Weekly pickup, boost and results screenshots plus both leaderboard labels were captured at 320/390; representative screenshots were inspected. At 320 the existing leaderboard heading extends beyond the panel; updated rules labels wrap legibly. No unrelated layout change was made.
- Browser tests inject safe crowd/pickup state, so these are emulated rendering and interaction checks, not phone feel, naturally occurring pickups or deployed validation.
- Checked-in schema inspection: score board strings permit lengths 3-40; mp2 identities fit. No deployed schema was queried and no migration was applied.
- Enforcement remains the existing per-device unversioned period marker plus first accepted score per board. No account-wide or cross-version attempt guarantee is introduced; legacy queues are not rewritten.
