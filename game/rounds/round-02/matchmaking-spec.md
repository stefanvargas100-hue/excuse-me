# Spec: public matchmaking and player names (for Director approval)

Written 2026-11-09. Nothing here has been built, measured or tested; the live database and Supabase project were not touched. The lead rechecked the Supabase prices and limits the same day, and corrected the message sums to include host-run bots.

## Recommendation
1. **Launch in two steps.** First a small public test on Supabase Realtime only (Pro plan, $25/month), capped at about 100 players a day. Move race traffic to our own small server only if play grows past that, because Realtime's per-message bill grows with every player (see section 2).
2. **Players pick a name** with simple rules, a built-in word filter, a Report button and a weekly review by the lead. No free-text chat, ever.
3. **Pass the host role first.** Public play with strangers should not ship before it (already planned).
4. **Say "friendly boards", never "fair" or "cheat-proof".**

## 1. What the player sees
1. Press **Play online**. First time only: pick a name (screen 5 below), then continue.
2. **"Finding racers… 0:30"** with a count of players found and a **Cancel** button. Cancel at any point returns to the menu and removes them from the queue; nothing is charged or saved.
3. Players found join a lobby (the 8-racer lobby). After 30 seconds the empty places fill with Medium and Hard bots. A lone searcher can start. Lobby shows names and "+ N bots".
4. A short "Cup starts in 3, 2, 1", then race 1 of 4. Between races: results and points (measurements only, no advice). Leaving mid-Cup replaces you with a bot; your points stay (same as the friend Cup).
5. Which Cups: **propose one rotating public Cup, changing daily** (New York, Tokyo, Airports in turn), so searchers share a Cup and queues are not split three ways. Choice per player is a later option.

## 2. Finding players: three ways
Numbers are my estimates unless a link is given. Assumptions: each player plays one 4-race Cup a day (about 10 minutes online, race length **unconfirmed**); about 2 real players per room; positions sent 10 a second each, plus the host's one combined bot message at the same rate. Sent and received both count, so about 60 billed messages a second per room. That is about 18,000 messages per player per Cup, so **about 54M, 540M and 5.4 billion messages a month** at 100, 1,000 and 10,000 players a day. Lone searchers against bots send almost nothing, so these sums are on the high side. Real rates are not measured; a measuring batch is already planned and should replace these.

| | A. Supabase Realtime only | B. Realtime + small server function | C. Dedicated server |
|---|---|---|---|
| How | Players join a shared "queue" channel; the first phone to hear a full group becomes host | A Supabase Edge Function (a small piece of code Supabase runs for us) puts searchers in groups and hands out a room code; races still use Realtime | Our own program on a rented machine does queueing and relays races |
| Cost at 100 / day | About $150/month (Pro $25 + overage) | About $150 | About $7–10 (Render Starter, per our plan, unrechecked) |
| At 1,000 / day | About $1,400/month | About $1,400 | **Unconfirmed**, probably a few machines |
| At 10,000 / day | About $13,500/month | About $13,500 | **Unconfirmed**; needs load testing |
| Effort | 3 batches | 4 batches | 6+ batches |
| Can go wrong | Two phones both think they are host; anyone can fake queue messages; limits below | Needs a live database change; function limits | Server down = nobody plays; we run it; restarts end rooms |

Sources, all read 2026-11-09: [Realtime limits](https://supabase.com/docs/guides/realtime/limits) (Free: 200 connections, 100 messages/s; Pro: 500 connections, 500 messages/s; Pro with no spend cap: 10,000 connections, 2,500 messages/s), [Supabase pricing](https://supabase.com/pricing) (Pro from $25/month; Realtime 5M messages included, then $2.50 per million; 500 connections, then $10 per 1,000; Edge Functions 2M calls included, then $2 per million). Cost sums are mine: (messages − 5M) × $2.50 per million + $25. Render's $7 comes from the archived plan (checked 2026-11-07, not rechecked); its traffic and machine limits are **unconfirmed**.

**What the limits mean:** on Free, 100 messages a second allows about 1 busy room at once. On Pro, about 8, or about 40 with no spend cap. So option A is a test, not a launch. Cheap fix before any money: send positions less often (5 a second halves the bill); this changes feel and needs a phone test.
B's function calls (searchers asking every 2 s for 30 s) are about 15 per search, roughly 45,000, 450,000 and 4.5M a month: inside Pro's 2M except at 10,000/day (about $5 extra).
**Recommendation:** A for the test; build the queue logic so it can move behind B or C later without changing the screens.

## 3. Fairness and cheating
Each phone reports its own finish time and simulates its own crowd, so with strangers: a modified phone can report any time or position; nobody can prove a result; two phones may see slightly different crowds (known limit in `game/areas/online.md`).
**Cheap steps:** reject times faster than a minimum possible time per stage (needs measurement first); reject impossible position jumps; compare each phone's reported time against what others saw it finish (the phone's own claim wins only if close); no ranks, rewards or leaderboard tied to public Cups at first.
**Do not claim** fair, ranked, verified or cheat-proof. Say "friendly Cup". Real fairness needs a server that runs the race, which is a large change and not proposed.

## 4. Host-run bots with strangers
Today, if the host leaves, everyone finishes the race and the Cup ends. With friends that is acceptable; with strangers it would end public Cups at random (a host can also leave on purpose). Proposal: **before public launch, pass the host role** to the next player in the roster; bots then keep running from the new host's phone, restarting from their last reported positions, so a small jump is possible. If nobody is left, the Cup ends. How often the host leaves is not yet known; the Cups QA trial's disconnect results will show it. A stranger who is host also decides when to start: allow Start only after 30 s, and keep the 30 s fixed (not host-controlled).

## 5. Player names
- **Rules:** 3–16 characters; letters, digits, space, dot, dash, underscore (as `cleanName` in `src/online/duel.js` already allows, limit 24 today); no leading or double spaces.
- **Other languages:** keep all scripts (the current filter allows every letter), but normalise text first (NFKC: turns look-alike full-width forms into plain ones) and allow only one script per name apart from digits. This blocks mixing Latin with Cyrillic or Greek look-alikes (an "а" that is not an "a"). Names are compared with look-alikes folded together (a "skeleton") so "Admin", "Adm1n" and "Аdmin" count as one.
- **Filtering:** a short built-in blocklist of slurs and sexual words in the top languages, checked on the skeleton. Blocked name: refuse it and ask for another. Wordlists are never complete; the report path covers the rest. List source and languages: Director to choose; I have not picked one.
- **Receivers also check.** Today names arrive over the room unverified; a modified phone could send anything. Every phone should run the same check on names it receives, and show "Player" for failures.
- **Reporting:** Report beside each name on results (and a Block to hide that name for me). Reasons: offensive name, other.
- **Reported names:** 3 reports from different players hide that name for everyone (shows "Player"), pending review. Rows record reporter, reported player, name, time. Reviewer: **the lead, weekly, 5 minutes**, with the Director deciding edge cases; at a small studio, no 24-hour service can be promised. Repeat offenders: bar the player's anonymous id from public queues.
- **Stored (proposal, needs a live database change):** anonymous player id, chosen name, time it was set, and report rows. Why: the id ties a name to one phone for blocking and bans; reports need the name as it was seen. Name changes: once a day. Nothing else, no email, no location, no chat.

## 6. Privacy and safety
- **Age:** the game is for anyone who likes skill games (`game/vision.md`), so children will play. Rules on children's data (for example COPPA in the US, GDPR age limits in Europe) may apply once we store names online. **Needs a lawyer.**
- **Data kept:** as in section 5; proposal is delete report rows after 90 days and unused names after 12 months. **Retention periods need a lawyer.**
- **Stores:** Apple and Google both have rules for apps with user-made content (usually: filtering, report, block, contact route), which a name counts as. I have not read the current text; **unconfirmed, check before any store submission**.
- Also **needs a lawyer:** privacy policy wording, terms of use, and whether strangers' names shown to children changes anything.
- Safe by design: no chat, no pictures, no links, no location, names only.

## 7. Batches (order)
1. **Measure message rates** of a real room (already planned; Director must run phones). Builder: Sonnet. Replaces the guesses in section 2.
2. **Pass the host role.** Builder: strong model (Opus), second review. High risk.
3. **Name rules and filter, client side**, receivers re-check. Sonnet, tests first.
4. **Queue and lobby (option A)** with 30 s fill and cancel. Opus, second review.
5. **Reports and review list.** Needs a migration and rollback written by a worker; **Director approves applying it to the live database**. Sonnet.
6. **Public test**: Director must approve the **$25/month Pro plan** and the phone test.
7. Later, if play grows: option B or C. **Director approves spending and hosting.**

## 8. Decisions for the Director
1. **Approve the two-step plan** (A for a small test, move later), and the **$25/month Pro plan** for the test. Recommend yes.
2. **One rotating daily public Cup** rather than choice. Recommend yes.
3. **Name review by the lead weekly**, three-report auto-hide. Recommend yes.
4. **Block public launch until host passing is built.** Recommend yes.
5. **Get legal advice** on age and data before any public name storage (cost unknown). Recommend yes, before batch 5 goes live.
