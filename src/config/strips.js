/* ---------- fast strips: race shortcuts. Quicker ground, but narrow and in harm's way. ---------- */
// Each stage has one lane, in stretches along its length.
// Fifth Avenue: the curb run, threaded between lamp posts and trees. Shibuya: the painted centre line, right through the scramble.
const LANES = {
  nyc: { x0: -4.0, x1: -3.05, every: 70, len: 34, col: '#ffd166' },
  shibuya: { x0: -0.8, x1: 0.8, every: 60, len: 24, col: '#ff6b9d' }
};
const START = 30;      // nothing in the opening stretch, so the start is fair
export const STRIP_SPEED = 1.12;

// Airport: a real moving walkway, two belts side by side. The right one goes your way and carries you, the left one goes the
// other way. People ride on the right of their belt and walk on the left, like in an airport.
export const BELT_SPEED = 1.2;   // m/s the belt that goes your way carries you
export const BELT_BACK = 0.45;   // m/s the belt coming back pulls you: a slowdown, not a wall. You still walk forward at about 2.5 m/s, enough to pass a crowd blocking your belt
const BELT_BACK_MAX = 0.35;      // ...and it can never pull more than this share of your own speed, so a bump or an empty stamina bar cannot send you backwards
const BELTS = { airport: { start: 30, every: 100, len: 46, fwd: [1.9, 3.9], rev: [3.9, 5.9] } };
export const beltInfo = id => BELTS[id] || null;
export const beltHasZ = (B, z) => z > B.start && (z - B.start) % B.every < B.len;
// +1 on the belt that goes your way, -1 on the one coming back, 0 on plain floor
export const beltAt = (id, x, z) => {
  const B = BELTS[id]; if (!B || !beltHasZ(B, z)) return 0;
  if (x >= B.fwd[0] && x <= B.fwd[1]) return 1;
  if (x > B.rev[0] && x <= B.rev[1]) return -1;
  return 0;
};

// How fast the belt under (x, z) moves along z: positive carries you forward, negative back, 0 on plain floor.
export const beltSpeedAt = (id, x, z) => { const d = beltAt(id, x, z); return d > 0 ? BELT_SPEED : d < 0 ? -BELT_BACK : 0; };
// The same for a racer who is walking at `speed`: the reverse belt's pull is capped at a share of that speed.
export const beltFor = (id, x, z, speed) => { const v = beltSpeedAt(id, x, z); return v < 0 ? -Math.min(-v, BELT_BACK_MAX * Math.max(0, speed)) : v; };

// Glass railings run along both outer edges of every walkway stretch. Anyone on the walkway is locked in, anyone beside it is locked out,
// and the divider between the two belts is open. Given where you were (prevX) and where you want to be (x), returns where you end up.
export function contain(id, prevX, x, z, m = 0.22) {
  const B = BELTS[id]; if (!B || !beltHasZ(B, z)) return x;
  const a = B.fwd[0], b = B.rev[1];
  if (prevX < a) return Math.min(x, Math.max(prevX, a - m));
  if (prevX > b) return Math.max(x, Math.min(prevX, b + m));
  return Math.min(Math.max(x, Math.min(prevX, a + m)), Math.max(prevX, b - m));
}

export const stripLane = id => LANES[id] || null;
export const stripHasZ = (L, z) => z > START && (z - START) % L.every < L.len;
export const onStrip = (id, x, z) => { const L = LANES[id]; return !!L && x >= L.x0 && x <= L.x1 && stripHasZ(L, z); };
