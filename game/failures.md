# Failure log

One entry per problem. Add to its count when it happens again. The choice of permanent fix is explained in `studio/lead-playbook.md`.

| Problem | Cause | Seen | Batches | Permanent fix |
|---|---|---|---|---|
| Browser screenshots came out tiled at 320 x 568, so the layout could not be judged from them | Not investigated. The agent measured the layout instead | 1 | NYC Cup, before the studio | None needed so far: Playwright screenshots at 320 x 568 came out fine in the Round 1 pilot, so this may only affect Orca's browser. Reopen if it recurs |
