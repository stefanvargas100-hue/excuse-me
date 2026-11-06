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
export const BELT_SPEED = 1.2;   // m/s the belt itself moves
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

export const stripLane = id => LANES[id] || null;
export const stripHasZ = (L, z) => z > START && (z - START) % L.every < L.len;
export const onStrip = (id, x, z) => { const L = LANES[id]; return !!L && x >= L.x0 && x <= L.x1 && stripHasZ(L, z); };
