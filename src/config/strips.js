/* ---------- fast strips: race shortcuts. Quicker ground, but narrow and in harm's way. ---------- */
// Each stage has one lane, in stretches along its length. Airport: the moving walkway on the fast side.
// Fifth Avenue: the curb run, threaded between lamp posts and trees. Shibuya: the painted centre line, right through the scramble.
const LANES = {
  airport: { x0: 3.2, x1: 4.6, every: 80, len: 38, col: '#2ec4b6' },
  nyc: { x0: -4.0, x1: -3.05, every: 70, len: 34, col: '#ffd166' },
  shibuya: { x0: -0.8, x1: 0.8, every: 60, len: 24, col: '#ff6b9d' }
};
const START = 30;      // nothing in the opening stretch, so the start is fair
export const STRIP_SPEED = 1.12;

export const stripLane = id => LANES[id] || null;
export const stripHasZ = (L, z) => z > START && (z - START) % L.every < L.len;
export const onStrip = (id, x, z) => { const L = LANES[id]; return !!L && x >= L.x0 && x <= L.x1 && stripHasZ(L, z); };
