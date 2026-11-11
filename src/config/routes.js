import { sideRoutes } from './side-routes.js';
/* ---------- route choices: one data description shared by the crowd generator (collision, spawn placement) and the renderer ----------
   A route zone is a barrier line across the street with two openings: a tight DIRECT one in the middle, with a queue that zigzags
   in front of it, and a wide DETOUR one off to one side that is clear. Both lead on to the same street. Nothing is required:
   no item, unlock or perfect move. The detour costs sideways walking; the direct line costs crowd risk.
   Zones apply to bot races and friend races only (never Classic, Daily or Weekly, so their seeded crowds are unchanged).
   ROUTE_RULES goes up whenever this geometry changes; race records and ghosts are kept per version.
   Zones are placed away from the stage's own course features: the airport walkway glass, New York's crossings and curb strip,
   Tokyo's centre strip. tests/routes.test.js checks that. */
export const ROUTE_RULES = 1;

// half: the barrier runs this far each side (walls are 0.5 inside the stage half-width). directW/detourW: opening widths.
// detourX: where the detour opening is centred. skin: how the barrier is drawn.
const STAGES = {
  bridge: { half: 4.6, directW: 1.1, detourW: 2.0, detourX: 3.0, skin: 'fence',
    zones: [{ z: 120, side: 1 }, { z: 310, side: -1 }] },
  airport: { half: 6.6, directW: 1.0, detourW: 3.0, detourX: 3.9, skin: 'rope',
    // between the moving-walkway stretches (30-76, 130-176, 230-276 ...), so the glass never meets a barrier
    zones: [{ z: 104, side: 1 }, { z: 304, side: -1 }, { z: 404, side: 1 }] },
  nyc: { half: 4.1, directW: 1.0, detourW: 1.5, detourX: 2.5, skin: 'fence',   // a sidewalk detour round a loading zone
    zones: [{ z: 150, side: 1 }, { z: 290, side: -1 }, { z: 440, side: 1 }] },
  shibuya: { half: 10.6, directW: 1.1, detourW: 4.0, detourX: 6.4, skin: 'crowdbar',   // the direct line cuts the scramble, the arc goes round it
    zones: [{ z: 125, side: 1 }, { z: 245, side: -1 }, { z: 305, side: 1 }] }
};

export const hasRoutes = id => !!STAGES[id];
export const zonesOf = id => (STAGES[id] ? STAGES[id].zones : []);
export const routeCfg = id => STAGES[id] || null;
// Added to race-record keys of a stage whose course has route zones, so old times and ghosts are never compared with new ones.
export const courseTag = id => (sideRoutes(id).length ? ':sr2' : hasRoutes(id) ? ':rt' + ROUTE_RULES : '');

// The x ranges of a barrier line that are open, as [from, to] pairs.
export function openings(id, zone) {
  const c = STAGES[id], d = [-c.directW / 2, c.directW / 2], t = [zone.side * c.detourX - c.detourW / 2, zone.side * c.detourX + c.detourW / 2];
  return [d, t].sort((a, b) => a[0] - b[0]);
}
// Barrier segments: the closed stretches between openings and the walls.
function segments(id, zone) {
  const out = []; let x = -STAGES[id].half;
  for (const [a, b] of openings(id, zone)) { if (a > x) out.push([x, a]); x = b; }
  if (x < STAGES[id].half) out.push([x, STAGES[id].half]);
  return out;
}

// Everything to place for a zone: barrier segments and the queue people. Pure data.
export function zoneLayout(id, zone) {
  const pieces = segments(id, zone).map(([a, b]) => ({ kind: 'rope', skin: STAGES[id].skin, x: (a + b) / 2, z: zone.z, half: (b - a) / 2 }));
  // the queue zigzags in front of the direct opening, so passing it takes a couple of small steering decisions
  [[-0.8, 1.4], [0.85, 2.6], [-0.9, 3.8], [0.8, 5.0]].forEach(([x, back]) => pieces.push({ kind: 'queue', x, z: zone.z - back }));
  return pieces;
}

// Where the middle of an opening is: 'direct' or 'detour'. Used by the bots to line up early.
export const openingX = (id, zone, kind) => (kind === 'detour' ? zone.side * STAGES[id].detourX : 0);

// Pieces whose z lies in [z0, z1), for the generator.
export function routePieces(id, z0, z1) {
  const out = [];
  for (const zone of zonesOf(id)) for (const p of zoneLayout(id, zone)) if (p.z >= z0 && p.z < z1) out.push(p);
  return out;
}
