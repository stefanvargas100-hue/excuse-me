# Failure log

One entry per problem. Add to its count when it happens again. The choice of permanent fix is explained in `studio/lead-playbook.md`.

| Problem | Cause | Seen | Batches | Permanent fix |
|---|---|---|---|---|
| Browser screenshots came out tiled at 320 x 568, so the layout could not be judged from them | Not investigated. The agent measured the layout instead | 1 | NYC Cup, before the studio | None needed so far: Playwright screenshots at 320 x 568 came out fine in the Round 1 pilot, so this may only affect Orca's browser. Reopen if it recurs |
| The fit tool reported zero problems while a screenshot showed mid-word breaks and a box past the card edge | The tool only checked for overflow and side edges, and the fix's `overflow-wrap:anywhere` hid the overflow | 1 | Round 1 batch 1 | New rules in the tool. Until proven, the lead keeps checking screenshots of changed screens |
