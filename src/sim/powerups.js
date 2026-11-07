import { LV } from '../config/levels.js';
import { clamp, mulberry32 } from '../config/util.js';
import { buzz } from '../save/store.js';
import { Music } from '../audio/music.js';
import { addPop } from './scoring.js';
import { S } from './state.js';

/* ---------- race power-ups: rare pickups on the track, shared by everyone ---------- */
// Walk (or dash) through one and it is yours at once, no button. First to reach it takes it, so they are worth a detour.
export const PU_TYPES = {
  boost: { label: 'BOOST!', col: '#ffb020' },        // faster for a few seconds
  refill: { label: 'STAMINA FULL', col: '#3ddc84' },  // stamina back to full
  clear: { label: 'CLEAR PATH', col: '#7fd0ff' }      // walk through people for a moment
};
const BOOST_T = 3, BOOST_MUL = 1.35, CLEAR_T = 2.2;
const FIRST = 60, GAP = 70, JITTER = 18, END_MARGIN = 45;   // metres: none near the start or the finish
const REACH_X = 0.8, REACH_Z = 0.7;                          // how close counts as touching

export const powerMul = r => (r.puT > 0 ? BOOST_MUL : 1);

// Same layout for everyone on the same stage, so a ghost or a rematch plays the same race.
export function placePowerups(seed) {
  const rng = mulberry32(0xb007 + seed), kinds = Object.keys(PU_TYPES), out = [], lim = LV.half - 1.2;
  for (let z = FIRST; z <= LV.goal - END_MARGIN; z += GAP) {
    const pz = clamp(z + (rng() - 0.5) * JITTER, FIRST, LV.goal - END_MARGIN);
    if (out.length && pz - out[out.length - 1].z < 40) continue;
    out.push({ x: (rng() * 2 - 1) * lim, z: pz, type: kinds[(rng() * kinds.length) | 0], taken: false });
  }
  return out;
}

function give(r, type, isMe) {
  if (type === 'boost') r.puT = BOOST_T;
  else if (type === 'refill') r.energy = 100;
  else if (type === 'clear') r.ghostT = Math.max(r.ghostT || 0, CLEAR_T);
  if (isMe) { const t = PU_TYPES[type]; addPop(t.label, t.col, 30); Music.sfx('combo'); buzz(15); }
}

// Looks for a pickup at this runner's feet (r is the player's state or a bot). z0 is where they were a moment ago,
// so a fast runner cannot jump over one between frames.
export function collectPowerups(r, x, z, z0, isMe) {
  const R = S.race; if (!R || !R.pickups) return;
  for (const pk of R.pickups) {
    if (pk.taken || pk.z < z0 - REACH_Z || pk.z > z + REACH_Z || Math.abs(pk.x - x) > REACH_X) continue;
    pk.taken = true; give(r, pk.type, isMe);
  }
}

export function stepPowerups(r, dt) { r.puT = Math.max(0, (r.puT || 0) - dt); }
