# Character art plan (started 2026-11-06)

Goal: characters look appealing and distinct at game size, in the current hand-drawn style.
Constraints: stats, unlocks and saved looks keep working; no new art files; keep the game smooth on phones (many figures on screen).
Review tool: open the game with `?lineup` to see every body and item side by side.
Rollback: only the art files are touched (figures.js, people.js, progress.js, preview.js, lineup.js). `git checkout <file>` restores any of them.
Status: all four batches built 2026-11-06 and checked in the lineup; not committed yet.
Working rule: one batch at a time; check the lineup and the tests after each batch.

## Batch 1: Clearly different male and female bodies
- One "body profile" per body type and build: shoulder width, waist, hip width, neck, head size, leg length, limb thickness.
- Torso becomes a shaped outline (shoulders, waist, hips) instead of a box. Male: broad shoulders, straight sides. Female: narrower shoulders, defined waist, wider hips, slightly smaller head.
- Walk: female hips sway a little more; male shoulders roll a little more.
- Done looks like: in the lineup, male and female are told apart from back, side and front at game size, for all three builds, and no clothing item looks broken on either.

## Batch 2: Customizable eyes, nose and mouth
- New Face area in Customize: Eyes, Nose, Mouth, each with a handful of options (looks only, no stats, nothing locked).
- Drawn on front and side views only (from behind there is nothing to see). Crowd people get random faces so the crowd is varied too.
- Old saved looks get sensible default faces.
- Done looks like: I can pick a combination, it shows in the preview and on oncoming people, the Customize screen still fits a 320x568 phone without scrolling.

## Batch 3: Better limbs and walking
- Tapered limbs (thigh thicker than calf, upper arm thicker than forearm), proper hands and feet shapes.
- Walk: arms swing against the legs, shoulders and hips counter-rotate, a small head bob, a foot roll.
- Done looks like: the walk reads as natural in Spin view, and a crowd of 20+ figures still runs smoothly (headless tests still pass, no extra drawing calls that matter).

## Batch 4: Clothing shading and folds
- Hand-drawn style shading: a hard shadow band on one side of each garment, fold lines at elbows and knees, collars, hems and cuffs.
- Hair shine and skin highlights tidied to match.
- Done looks like: every top, bottom and shoe in the lineup has visible form, and the look stays consistent with the ink outlines.

## Final check
Tests, build, full lineup review at game size and big, Customize screen on a 320x568 viewport.
