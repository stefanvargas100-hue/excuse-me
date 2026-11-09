Outcome: done
Branch: stefanvargas100-hue/clothing-fixes; 95926bd (implementation; follow-up commit records whitespace cleanup)
Changed: figures.js clothing paths and tools/lineup-shots.mjs (48 deterministic walking captures per run).
Items: #1 fixed (leg depth); #2 not reproduced in captured front pose (reduced sway/wider hem guard); #3 fixed (narrower shaded skirt, waist join); #4 fixed (clipped shaded midriff); #5 fixed (clipped torso band, removed disconnected sleeve stripe).
Items: #6 fixed (clipped bands); #7 fixed (sleeve-shaped pad); #8 fixed (smaller foot-aligned soles); #9 fixed (continuous shaded taper); #10 not clearly reproduced in captured pose (removed redundant pelvis ink that can protrude at hip).
Checks: 576/576 npm test; npm run build passed; diff whitespace check passed; before/after section comparisons in %TEMP%/lineup-before and %TEMP%/lineup-after, including Game size button; no obvious regression on reviewed other items.
Not checked: real phone race appearance/performance; complete walking cycle (captures use one repeatable moving pose); lead screenshot review remains.
Off plan: none; no extra clothing bugs fixed.
Trouble: Node cannot import source .js as ESM directly; screenshot tool imports LOOK_OPTS through Vite in browser instead.
