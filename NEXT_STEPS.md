# Excuse Me: Next Steps

Written 2026-11-05 at the end of a long build session. Start here next time.
Live game: https://stefanvargas100-hue.github.io/excuse-me/

## Where things stand
Built and live: endless Classic, one-try Daily and Weekly, Race vs bots, race stats, 39 unlockable items earned through challenges, Fit Check, slipstream, fast strips, the skill pack, ghost, no-scroll menus, hand-drawn Candy pop look.
Nobody has played most of this on a real phone yet. All balance numbers are first guesses.

## Status 2026-11-06 (end of the multiplayer session)
Live on main: live 1v1 racing with rematch (tested by Stefan with a friend: no lag), interface that scales with the screen, Leaderboards screen (daily, weekly, classic per stage), slipstream 25% with 3 s cooldown, airport moving walkway with glass railings (forward belt +1.2 m/s, reverse belt -0.8 m/s, people stand right and pass left), speed in mph under the combo box, small stamina bar above your head, radar removed. 166 automatic tests pass. Stefan's feedback: all of it works well.
Lobby for 2-4 players is now built (see below). Not done yet: bigger lobbies, bumping/cut-offs between live racers, handling a phone that sleeps mid-race, race results on the leaderboards, tuning the belt speeds from real play. Details of every choice are in DECISIONS.md.

## Live lobby, 2-4 players (built 2026-11-06, branch multiplayer-lobby, needs a real multi-phone test)
- [ ] Stefan + up to 3 friends: Play > Race friends. Host makes a room, others join by code or link, host presses Start when 2-4 are in. Report: does everyone see everyone smoothly, is it OK with 4, do rematch and someone leaving mid-race behave?
- [ ] Watch the message limit with 4 real phones (5 position reports a second each). If it stutters, lower the rate or move to a bigger Supabase plan.
- [ ] Later: ready button, bots to fill slots (host switch), quick public matches.

## Bigger lobbies, 2-8 players (built 2026-11-07, branch lobby-8-cutoffs, NOT merged to main yet, needs a real phone test)
- [ ] Stefan + friends: Play > Race friends, up to 8 phones. Report: smooth with 5+ people? Does everyone start in a neat line? Does passing through someone feel right (both of you go see-through, nobody slows)? Does the room list and the results list fit your phone?
- Decision (Stefan): no cut-off penalty between live racers. They phase through each other.
- Measured: 8 fake players sending 5 and even 15 reports a second lost nothing on Supabase (tools/loadtest.mjs). Not yet tried with several rooms at once.

## Live 1v1 (built earlier, now part of the lobby)
- [ ] Stefan + a friend: Play > Race a friend. One makes a room, the other joins with the code or the link, host presses Start. Report: do you see each other smoothly, do the countdowns line up, does the finish work?
- [ ] Rematch button is in (both press it). Then: handle a phone that sleeps mid-race, 4-8 players, cut-offs between racers.

## Next steps, in order

### 1. Stefan: play it and report (no code needed)
- [ ] Play a few races and classic runs on your phone.
- [ ] Do the sounds work? Is the drafting whistle pleasant or annoying?
- [ ] Do the wind lines look right in motion? I have only seen still frames.
- [ ] Is the tiny freeze on a bump good, or too much?
- [ ] Do the menus fit your phone without scrolling?
- [ ] How do the clothes look in the game and on the customize screen?
- [ ] Note your best race times on Hard. Bot tuning needs them.
- [ ] Share the link with friends again for fresh feedback.

### 2. Decision needed from Stefan
- [ ] **Leaderboard service: Supabase (recommended) or Firebase.** Either needs you to create a free account and share a key.
- [ ] **Character art:** keep improving the current figures, or commission or generate hand-painted art? This sets how far the clothes can go.

### 3. Tune from that feedback
- [ ] Hard bot speed, using your real times.
- [ ] Challenge targets. Are any impossible, or too quick?
- [ ] Stat strength, Fit Check size, slipstream and fast strip boosts.
- [ ] Clothes that look wrong on small, medium or large, male or female.

### 4. Leaderboards and online (roadmap Phase 6)
- [ ] Anonymous accounts with generated names.
- [ ] Boards for the daily run, weekly run and each stage.
- [ ] Server checks on scores, and a real one-try rule. It is only enforced on the phone today.
- [ ] Live 1v1 and 4-8 player races by invite link, then cut-offs between players.

### 5. Getting ready to launch
- [ ] Bundle the fonts so a first launch works offline.
- [ ] Real app icon and splash screen. The icon is a placeholder.
- [ ] Measure frame rate on an older Android phone.
- [ ] Wrap as a phone app (roadmap Phase 3). Android needs Android Studio; iPhone needs a Mac. **Does Stefan have a Mac?** Still unanswered.
- [ ] Move saves to phone storage. Browser storage can be wiped, which would lose all progress.
- [ ] Privacy policy, store listing, beta testers.

### Housekeeping
- [ ] Remove leftovers from the old modes: the finish and timeout code in classic, level timer text, star targets, the unused Next level button.
- [ ] Add a screen-fit check to the automatic tests. It is only done by hand today.

## New recommendations from the final review

### Teaching (highest value, players will miss what is already built)
1. **Teach the new skills.** The tutorial stops at the basic controls. Perfect dash, perfect "Excuse me" and near-miss stamina are the heart of the skill game, and only How to play mentions them.
2. **Race tutorial: DONE 2026-11-06 (race coach tips on the first race vs bots).** Still open: a practice stage, and teaching near-miss stamina.
3. **Practice stage.** A short course with repeatable setups for perfect dashes and threading gaps.

### Gameplay
4. **Bots use "Excuse me".** They are the only racers who never do, and it is now a key skill.
5. **Reward clean streaks.** A growing bonus for each 100 m without a bump in races, so clean driving and aggression both pay.
6. **Comeback pressure with no rubber-banding.** Last place gets stronger slipstreams from the pack, which is earned, not handed out.
7. **Daily modifiers: DONE 2026-11-06 (3 so far; more ideas welcome).** Rush hour only, no stamina regen, everyone on phones. This keeps dailies fresh with no new art.
8. **Race types.** Elimination (last place out every 100 m) and time attack use the same stages.
9. **More stages.** Subway platform, music festival, Black Friday mall and train station from the roadmap, each with its own crowd behaviour.
10. **Crowd personalities per stage.** Festival crowds that surge, commuters who hold their lane.

### Progress
11. **Rotating daily and weekly challenges** on top of the long ones, so there is always something close to finishing.
12. **Show progress during play.** "12 more Razors to Shades" on the results screen makes the next goal feel near.
13. **Saved outfits.** Three loadouts to swap between, for different stages.
14. **Named sets.** "Full Y2K" shown with a set icon once all five pieces are unlocked.
15. **Lifetime stats screen.** Distance walked, people passed, wins, favourite stage.

### Look and feel
16. **Stage-specific menu art,** so the menu backdrop feels like a place.
17. **Bump and near-miss reactions from the crowd,** more voices and animations for life and humour.
18. **Music that reacts to race position,** not only to combo.
19. **Show your stats before a race,** on the stage screen, so builds feel like a choice.

### Functional
20. **Save backup and restore,** at least a code to copy, until accounts exist.
21. **Left-handed and swipe sensitivity options.**
22. **Pause when an update is ready rather than waiting for the menu,** with a small "new version" note.
23. **Privacy-friendly analytics:** where runs end, which challenges get finished. This feeds all the tuning above.

## My top three if you only pick a few
1. Teach the new skills (1, 2), because the depth you asked for is invisible without it.
2. Rotating challenges plus progress on the results screen (11, 12), which gives a reason to play one more run.
3. Daily modifiers (7), the cheapest way to keep the daily fresh.

## Gameplay plan (Stefan, 2026-11-06)
Done: hold-both-thumbs Excuse Me, near-miss streak, airport rebuild (scenery, weave, baggage cart). Next: check airport feel on phone, then copy the approach to New York (cars crossing side to side, street trash cans, more scenery) and Tokyo; then ghosts only when near your/friend's record; then rare race power-ups.

## When Stefan starts again (written 2026-11-06, end of day)
**Needs Stefan**
1. Run the last section of supabase/schema.sql (Ghosts of the top 3) in the Supabase SQL Editor. Until then top-3 ghosts do not appear. The SQL was never run against a real Supabase.
2. Phone test (iPhone 14 Pro Max, home-screen app): the pale bottom strip fix (plain 100vh in standalone, WebKit bug 254868); hold both thumbs for Excuse Me (0.25 s, does it feel right?); weave markers (too easy?); crossing vehicles (enough time to react?); bottom HUD.
3. If the strip is still there: stop, do not try a third height trick. Options: revert, different approach, drop.

**Next in the gameplay plan**
- Race power-ups (rare pickups: short boost, stamina refill, clear path), placed on the new stage layouts.
- Cars crossing the street side to side on New York (more than the van), more scenery out of the windows in Tokyo/NYC (skyline, signs).
- Check ghost feel: label colours, 60 m distance, friends' ghosts in a real room.
- Tune: Excuse Me bar and stamina bar size; plane colours through the airport windows look washed out.

**Older ideas still open**: practice stage, weekly modifiers for races, 4-8 player lobbies, race boards.
