# Art sharpness pass (lead, 2026-11-14)

```text
Outcome:     done
Branch:      develop (lead), commit below
Changed:     Removed every soft overlay from the art worlds (glow, grain, dot wash, vignette, sparkles, ground light smears, sign flicker); single solid lines; heavier outlines and clearer crowd colours in the neon and space worlds; weather reduced to a light tint, sky-only glow and fewer rain streaks; dark outlines on the five placeholder stages.
Checks:      test/styles.test.js and test/scenery.test.js 33/33; npm test 1038 tests, 1036 pass, 0 fail, 2 todo; build pass; git diff --check clean.
Looked at:   all 12 stages before and after in an emulated 390x844 phone at 2x (tools/style-shots.mjs), plus rain, golden, mist and night weather. Sheets in art-sharpness-evidence/.
Not checked: real phones; frame rate (tools/perf-check.mjs not run; the pass removes work per frame and adds none).
Off plan:    none. Palettes (the colour recipes for scenery) are unchanged; crowd colours changed only in neo-noir (lighter) and space (more of their own colour).
Trouble:     none.
```

Method: the layer order and "quiet surroundings, richness in one or two moments" idea are adapted from the unslop skill by Damir Sokolovsky (heydamir/unslop, CC BY 4.0), applied to a game: the moments are the people and each stage's sky piece.
