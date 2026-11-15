// Batch 27f: does anyone pass through a Tsukiji porter's cart? 4-bot races, seeds 1 to 20. For every porter on screen (from the
// camera, 3.6 m behind the watched racer, to 62 m ahead of it), count the people whose body (0.25 m) overlaps one of the porter's
// circles, and how many of them were already overlapping when first seen (created on top of it). Also the open side: the widest
// free stretch across the alley beside the porter (its whole length), people counted as 0.5 m wide, the smallest seen: minGapRound
// counts the porter and the people stepping round it (within 1 m of its sides), minGapAll counts everyone in the alley there.
// jumps: someone within 3 m of an on-screen porter who moved more than 0.25 m sideways in one 1/30 s tick (a visible jump).
//   node game/rounds/round-02/batch-27-evidence/porter-overlap.js [seed ...]   (prints one JSON line)
const { load } = require('../../../../test/harness.js');
const CAM_BACK = 3.6, DRAW_FAR = 62, R_BODY = 0.25;

function race(seed, tally) {
  const E = load(undefined, { seed }); E.storage.excuseme_botlvl = String(seed % 3); E.setLevel(7);
  E.start('race', undefined, { cup: { model: { bots: [] } } }); E.S.cup = null; E.S.race.countT = 0;
  E.S.race.bots.splice(4); const bots = E.S.race.bots, h = E.LV.half;
  const seen = new Set(), born = new Map(), hit = new Map(), screen = new Set(), lastX = new Map();   // seen: people seen at least once without overlap
  for (let i = 0; i < 400 * 30 && !bots.every(b => b.done); i++) {
    E.S.pz = Math.max(0, Math.min(...bots.filter(b => !b.done).map(b => b.z)) - 20); E.S.me.z = E.S.pz;
    E.tick(1 / 30);
    const cam = E.S.pz - CAM_BACK, ps = E.S.people.filter(p => p.porter && !p.dead && p.z - cam > 0.6 && p.z - cam < DRAW_FAR);
    const crowd = E.S.people.filter(q => !q.dead && !q.prop && !q.porter);
    for (const q of crowd) { const x0 = lastX.get(q); if (x0 !== undefined && Math.abs(q.x - x0) > 0.25 && ps.some(p => Math.abs(q.z - p.z - 0.6) < 3)) tally.jumps++; lastX.set(q, q.x); }
    for (const p of ps) {
      screen.add(p);
      for (const q of crowd) {
        if (Math.abs(q.z - p.z - 0.6) > 2 || Math.abs(q.x - p.x) > 1) continue;
        const over = p.circles.some(c => Math.hypot(q.x - (p.x + c.ox), q.z - (p.z + c.oz)) < c.r + R_BODY - 1e-6);
        if (!over) { seen.add(q); continue; }
        if (!hit.has(p)) hit.set(p, new Set());
        if (!hit.get(p).has(q)) { hit.get(p).add(q); if (!seen.has(q)) born.set(q, 1); if (q.v0 === 0 && q.shopper) tally.stoppedShoppers++; }
      }
      // the open side: widest free stretch across [-half, half] over the porter's length
      if (i % 3) continue;
      const zl = p.z - 0.25, zh = p.z + 1.62, band = crowd.filter(q => q.z + R_BODY > zl && q.z - R_BODY < zh);
      const widest = qs => {
        const spans = [[p.x - 0.38, p.x + 0.38], ...qs.map(q => [q.x - R_BODY, q.x + R_BODY])].sort((a, b) => a[0] - b[0]);
        let at = -h, gap = 0;
        for (const [lo, hi] of spans) { gap = Math.max(gap, lo - at); at = Math.max(at, hi); }
        return Math.max(gap, h - at);
      };
      const round = widest(band.filter(q => Math.abs(q.x - p.x) - R_BODY < 0.38 + 1.0)), all = widest(band), at = { seed, t: +E.S.time.toFixed(1), z: +p.z.toFixed(1) };
      if (round < tally.minGapRound) { tally.minGapRound = round; tally.minGapRoundAt = at; }
      if (all < tally.minGapAll) { tally.minGapAll = all; tally.minGapAllAt = at; }
    }
  }
  tally.races++; tally.porters += screen.size; tally.portersHit += hit.size;
  for (const s of hit.values()) tally.people += s.size;
  tally.bornOnTop += born.size;
  tally.allDone = tally.allDone && bots.every(b => b.done);
}

const seeds = process.argv.slice(2).map(Number);
const tally = { races: 0, allDone: true, porters: 0, portersHit: 0, people: 0, bornOnTop: 0, stoppedShoppers: 0, jumps: 0, minGapRound: Infinity, minGapRoundAt: null, minGapAll: Infinity, minGapAllAt: null };
for (const seed of seeds.length ? seeds : Array.from({ length: 20 }, (_, k) => k + 1)) race(seed, tally);
tally.minGapRound = +tally.minGapRound.toFixed(2); tally.minGapAll = +tally.minGapAll.toFixed(2);
console.log(JSON.stringify(tally));
