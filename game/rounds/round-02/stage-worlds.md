# Stage worlds: the five stages that were placeholders

**Written:** 2026-11-14 by the lead, on the Director's instruction: "They should be proper stages based on their group. Build out each of their designs to be more thought out. Add any features you think will help the design and gameplay."

Each stage now has its own world inside its Cup's family. Part 1 (the look) is built. Part 2 (new gameplay) is planned in `batch-27-stage-features.md`.

## Rules every stage world follows
- **Sharp:** the sharpness rules at the top of `src/render/style.js` apply. Solid shapes, single lines, nothing soft over the people.
- **One set piece:** each stage has one thing you remember it by, placed in the sky or beyond the walls, never on the walkway.
- **Calm floor:** the walkway is two close tones and at most one line, so feet and gaps read at a glance.
- **Scenery explains the hazard:** where a stage has a hazard, the scenery shows where it comes from.
- **Signals keep true colours:** lane lights, scanner gates and rope lines are drawn in their exact colours in every style (green open, red shut).

## Tokyo, the neon family

### Tsukiji Outer Market: the lantern market (style `lantern`)
- **World:** a narrow alley at night between lit stalls. Striped awnings, stall signs, crates of ice with the catch laid out, shophouses with a few lit windows, a full moon.
- **Set piece:** rows of red paper lanterns strung across the alley.
- **Colours:** dark teal concrete and navy walls, warm amber stalls, red and cream awnings. People are lit warm with a cream outline.
- **Scenery explains:** the cream kerb lines are the edges of the walkway; the stalls stand beyond them, so nothing drawn can be walked into.
- **Gameplay today:** narrow walkway (8 m), a delivery truck crossing, wet patches with less grip, a thin crowd.
- **Planned (batch 27):** shoppers who stop at the stalls, and porters pushing hand carts down the alley.

### Skytree Sky Walk: the sky deck (style `skydeck`)
- **World:** a glass gallery high over the city at dusk. Glass on the right from floor to ceiling, a wall of lit exhibits on the left, a glass roof on thin ribs.
- **Set piece:** the view: the dusk sky, Mount Fuji on the horizon, the lit street grid far below, and the tower's white lattice outside the glass.
- **Colours:** indigo deck, magenta-to-orange dusk, cyan guide lights. People are bright with a cyan outline.
- **Scenery explains:** the window crowds stand at the glass on the right, where the view is.
- **Gameplay today:** very wide walkway (16 m), fast walkers, groups stopped at the windows.
- **Planned (batch 27):** lift arrivals. Doors on the exhibit wall open and a group crosses the deck to the windows.

## Airport, the space family
All three share Terminal B's silver hull, suits and helmets, and add their own deck of the station.

### Security Lanes: the checkpoint deck (style `checkpoint`)
- **World:** a bright deck with windows on both sides and a glass roof.
- **Set piece:** a cratered moon hanging over the roof.
- **Scenery explains:** rope lines are red, open lanes green and shut lanes red, in exact colours. Before this pass the art style turned the green "OPEN" signs grey in the distance.
- **Gameplay today:** 3 or 4 roped queue lanes, some shut by a scanner gate.
- **Planned:** nothing new. This stage already has the richest rule.

### Baggage Claim: the cargo bay (style `cargo`)
- **World:** carousels down the left with bags riding them, bay windows behind with cargo shuttles docked outside, arrivals boards on the right.
- **Set piece:** a freighter holding station over the glass roof.
- **Scenery explains:** a yellow-and-navy hazard kerb runs along the carousel side, because that is where spilled bags come from.
- **Gameplay today:** bags and trolleys spill across from the left, tour groups, queues.
- **Planned (batch 27):** people waiting at the carousel edge, who narrow the left side.

### Gate Change Rush: the launch concourse (style `launch`)
- **World:** a long concourse in low orbit. Gates with rockets standing outside on the left, departure boards on the right.
- **Set piece:** the home planet's horizon passing the windows, and a rocket climbing away over the roof.
- **Scenery explains:** gate numbers count up along the wall and reach the goal's number (C40) at the finish, and overhead signs point to it.
- **Gameplay today:** the crowd turns and rushes toward you when the gate changes, tour groups, weaving flows.
- **Planned (batch 27):** the departure boards turn pink and read "GATE CHANGE" while the crowd is turning.

## Evidence
`stage-worlds-evidence/tokyo.jpg` and `airport.jpg`: emulated 390x844 phone at 2x, not a real phone.
