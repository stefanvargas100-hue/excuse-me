# Release checkpoint — 2026-11-07

Published main e0c849c: GitHub Tests and GitHub Pages deployment both succeeded. Published game loaded with Central Park and gameplay modes present.

## Verified
- 60 focused automated checks pass: lobby-8, interruptions, elimination rooms, weekly challenge. These use simulated room transport, not several physical phones.
- Published 320 x 568 race picker reproduced clipped labels/descriptions after the four-stage and race-format changes were combined.
- Fixed layout locally: difficulty and format stay on one row each; stage descriptions hide only on screens at most 650 px tall, retaining city/name/distance. 320 x 568 and 390 x 844 screenshots inspected. Production build passed.
- Full merged release suite already passed 430 tests; CI also passed on e0c849c. This follow-up changes CSS and documentation only.

## Physical-phone checklist
1. Reload both phones after the deployment; confirm Central Park and matching room protocol.
2. Race Central Park in day/autumn/golden hour. Check bridge approaches, rail containment, carriage clearance, visibility and touch steering.
3. On an older Android, compare start/crowded promenade/bridge/finish for frame drops and heat. Test calm mode.
4. With 2 phones, then up to 8: host/join, readiness, start, pause by multiple people, resume, sleep/reconnect, host exit, finish/rematch. Repeat in elimination.
5. Reload the published game and confirm outfit, unlocks and bests survived the service-worker update.

## Weekly challenge leaderboard — gated
CHALLENGE_SUBMIT_ENABLED remains false. No connected Supabase admin tool or local PostgreSQL/Docker/Supabase CLI was available in this session. The migration has been reviewed as text, not executed or proven against the database.

Concrete verification before enabling:
- In an isolated/staging database with the current schema, apply 0002_weekly_challenge.sql twice to check repeatability.
- Using two authenticated test users: insert a plausible current-week result; improve it; submit a slower result and confirm keep_best retains the faster time.
- Reject another user's update; reject malformed boards, closed weeks and 5-second/601-second times.
- At Monday UTC rollover, accept the previous week only during the 6-hour grace period.
- Confirm classic updates and daily/weekly one-try boards retain their existing policies; verify rollback in staging.
- Apply the verified migration to production, repeat a bounded test with designated test accounts, then enable the submission flag and run the challenge suite/build before publication.

A user-supplied finish time is not proof of a legitimate run; this remains a friendly leaderboard.
