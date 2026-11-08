# Visuals plan (branch Visuals)

Pattern for every batch: **plan → build → check (lineup / in-game screenshots, phone-size, 4x CPU throttle) → tests → commit → short review note.**
Rules for all batches: render only (no sim state, no seeded RNG, no collision or movement change), `calm` setting respected, determinism tests stay green, phone performance checked.

## Batch 1 — Character detail (A1–A4)
- A1 Hands: smaller, thumb shape, grip on phone / case handle / dog lead.
- A2 Hair: ponytail, bun, curly, braid; sway follows the walk. (Adds options to `LOOK_OPTS`; this is the one place a save-visible list grows. Existing saves keep working because the default is unchanged.)
- A3 Torso detail: collars, hems, pockets, cuffs; clearer female waist and hips.
- A4 Walk polish: head bob, shoulder roll, landing squash, clearer sidestep lean.
- Check: `?lineup` front/back/side/spin, male and female, every top/bottom/shoe/hat.

## Batch 2 — Crowd and racers (B6–B8)
- B6 Crowd variety: more build/height/outfit mixing, idle behaviours (phone, chatting pairs, suitcase).
- B7 Racer identity: trail streak, tint, finish celebration pose.
- B8 Reactions: emotes and bubbles on bumps and near-misses.
- Check: busy-crowd in-game shots on all three maps; draw-call count versus baseline.

## Batch 3 — Weather and time of day (C9)
- Per-map variants as a tint, puddle/reflection and light particle layer: golden-hour NYC, rain Shibuya, sunrise or night apron.
- Built so a "cup" can pick a variant per round (a single `variant` value on the level, render-only).

## Batch 4 — Effects and results (D12–D14)
- D12 Dust and footstep puffs, multiplier glow.
- D13 Impact shake (off in `calm`), clearer chain-break.
- D14 Finish and results: confetti, podium, character poses.

## Batch 5 — Menus and HUD (E15–E16)
- E15 Customise preview matches new bodies, turntable.
- E16 HUD icon consistency, contrast on bright maps, notch-safe layout.
- First step is an audit of these screens; the list may change after it.

## Next update (not started): C10 landmark set-pieces, C11 new maps

### Cup idea: New York, several famous locations, 4–5 maps in a row, tallied total
Design notes so new maps fit it later:
- A map is a self-contained module (level config + `paintX` + `xDetail`) like the three existing ones, so a cup is just an ordered list of level ids.
- Each map should have a different feel (surface, crowd density, obstacle mix) so a cup is varied.
- Scoring needs a per-round result plus a running cup total; that is sim/save work and needs its own plan before building.
- First new map: **Central Park** — tree-lined paths, lamp posts, benches, joggers and dog walkers, a pond or bridge, horse-carriage cameo, autumn leaves. Fits the weather/variant system from Batch 3.
- Candidate follow-ups (NYC): Times Square, Brooklyn Bridge promenade, Grand Central concourse, High Line, Wall Street / Fifth Avenue (exists).
- Open question: Fifth Avenue is already NYC, so the cup would be Fifth Avenue + the new ones; Airport and Shibuya stay as standalone maps.

## Progress
- Batch 1 (characters): done, commit 0084a33.
- Batch 2 (crowd and racers): done, commit da97b95.
- Batch 3 (weather / time of day): done. Variants: airport day / sunrise / night, Fifth Avenue day / golden hour, Shibuya night / rain. `src/render/weather.js`; `?variant=rain` forces one; `setVariant()` is the hook a cup will use per round.
- Fix: daily/weekly runs always get the sky for their date; every restart re-picks (commit 20e7e54).
- Batch 1-2 gaps + Batch 4 (effects, podium): commit 1147bad.
- Batch 5 (menus/HUD): Customize preview close-ups and drag to turn, race HUD fits narrow phones, stronger pop-up outlines, racer ribbons only for racers ahead.

## Ideas for later (from this work)
- Profile picture: a "my character" option that draws your own head instead of an emoji.
- Cup: each round can set its own weather with setVariant(); a final round at golden hour or in the rain.
- Central Park: autumn leaves kicked up by the footstep puffs; joggers with the burst lean; dog walkers with the real lead.
- Podium for classic runs on daily/weekly boards (top 3 by score).
- Footstep sound variation to match dust vs splash.
