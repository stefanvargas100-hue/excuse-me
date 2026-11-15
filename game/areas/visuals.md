# Area guide: visuals, menus and audio

Everything the player sees and hears.

## Where things live
- `src/render/`: `render.js` draws the frame, `figures.js` draws characters (992 lines, so search it rather than reading it all), `hud.js`, `fx.js`, `weather.js`.
- Stage scenery in `src/render/`: `airportdetail.js`, `nycdetail.js`, `shibuyadetail.js`, `park.js`, `bridge.js`, `landmarks.js`.
- Art worlds: `src/config/styles.js` (one recipe per stage) and `src/render/style.js` (set pieces). The five newest stages paint their own scenery in `tsukiji.js`, `skytree.js`, `security.js`, `baggage.js` and `gatechange.js`, with shared tools in `stagekit.js`. Their designs are in `game/rounds/round-02/stage-worlds.md`.
- `src/ui/`: `menus.js`, `screens.js`, `friend.js`. Page and styles: `index.html`, `style.css`.
- `src/audio/`: `music.js`, `soundtrack.js`, `SOUNDTRACK.md`.
- `src/dev/lineup.js`: character review page.

## Rules that must hold
- **Drawing must not change the game.** Rendering must never change simulation state or use the seeded random stream.
- **Keep it sharp** (Director, 2026-11-14). Follow the sharpness rules at the top of `src/render/style.js`: nothing soft over the play area, single solid lines, a calm floor, one set piece per stage. `test/styles.test.js` fails if glow or blur comes back.
- **Signals keep true colours.** Props that tell the player where they can go (lane lights, scanner gates, rope lines) are drawn with the art style paused: see `SIGNALS` in `src/render/figures.js`.
- **Respect calm mode** for anything that moves or flashes.
- **Menus must fit without scrolling.** Check 320 x 568 (smallest), 390 x 844 (typical phone) and desktop. `pageInto` in `src/ui/screens.js` handles paging.
- **Visuals must match collisions.** If a prop's shape changes, check its collision shape and gaps too.

## Checking your work
- Styling and looks do not need tests that mirror the code. Say what a person should check instead.
- Browser screenshots have come out tiled at 320 x 568. If that happens, measure elements and overflow instead, and report that you measured.
- Emulation is not a real phone. Never report phone feel or performance as checked unless it was.

## Useful tests
`screens`, `scenery`, `landmarks`, `park`, `bridge`, `faces`, `music`, `music-playback`. Run one with `node --test test/<name>.test.js`.
- Run `npm run test:fit` for headless screen-fit measurements at all three sizes; `npm run test:fit -- --self-test` proves overflow detection.
