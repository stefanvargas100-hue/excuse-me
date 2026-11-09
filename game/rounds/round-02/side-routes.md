# Side routes: stairs, lower passages and locked corridors

**Status:** Director's idea, 2026-11-08. Design to be approved before the first stage plan.

## Director's rule
Side routes rejoin the main path. **A hard route must reward the player. An easy route must be no better than equal to the main path.**

## What exists today
Stages are one street. Route zones (`src/config/routes.js`) are barriers with a tight direct gap and a wide detour gap, both returning straight to the street, in bot and friend races only. Racers have a sideways and a forward position, but no height. So stairs, a second level and separate corridors do not exist yet.

## What is needed
A reusable side-route system, built once and used by every new stage:
- Data per stage: entrance, exit, level (up, down or same) and difficulty.
- Racers gain a "which route" value, used by collisions, crowd, drawing, radar and remote players.
- Bots choose routes, so routes also feel alive and contested.
- Ghosts and records stay fair, using the existing course tag.
- A measuring test that drives each route with a scripted racer, enforcing the reward rule. First targets: easy routes within 1% of the main path, hard routes 3-8% faster, tuned after playtests.

**Proof first:** build it on the subway stage, then reuse it. Classic, Daily and Weekly keep their seeded crowds unchanged unless the Director decides otherwise.

## Proposed routes
| Stage | Route | Challenge |
|---|---|---|
| Subway Platform | Stairs up to the mezzanine and back down | Hard: stairs cost speed, then a clear, fast stretch |
| Takeshita Street | Back alley | Easy: quieter but longer, roughly equal |
| Tsukiji Outer Market | Delivery lane | Hard: carts cross it, big gain if you dodge them |
| Skytree Sky Walk | Lower deck via stairs | Hard: narrow and fast, with a tight exit |
| Security Lanes | Staff corridor with a timed door | Hard: miss the door and you lose time |
| Baggage Claim | Behind the carousels | Easy: fewer people, longer way round |
| Gate Change Rush | Upper walkway via escalator | Hard: get on before the surge for a big gain |

## Open question
**How locked corridors open.** Recommended: doors on a visible, shared timer, purely a skill of timing and route planning. It works identically for every racer and online. Alternatives are a key pickup, which adds an item to chase, or unlocking after clean walking, which makes corridors easier for those already ahead.

## Cost
About one extra batch for the system, and more work per stage. It does not delay Cups, but Alpha takes longer.
