/* ---------- race stats: your build and the type of gear you wear. Race mode only; colours never matter. ---------- */
// Every entry is points of [speed, accel, rec]. Each one is a trade-off that adds up to zero, so nothing is simply better.
const pts = (speed, accel, rec) => ({ speed, accel, rec });
const NONE = pts(0, 0, 0);

// h is height in metres, bulk is how broad the body is drawn.
export const BUILDS = {
  small: { h: 1.6, bulk: 0.92, ...pts(-3, 4, -1) },
  medium: { h: 1.76, bulk: 1, ...NONE },
  large: { h: 1.92, bulk: 1.12, ...pts(3, -4, 1) }
};

// Male leans to top speed, female to recovery. Equal trade-offs, so neither is ahead.
export const BODIES = { m: pts(2, 0, -2), f: pts(-2, 0, 2) };

export const ITEM_STATS = {
  shirtType: { tee: NONE, tank: pts(-2, 2, 0), hoodie: pts(0, -2, 2), jacket: pts(2, 0, -2) },
  pantsType: { jeans: NONE, shorts: pts(0, 2, -2), joggers: pts(2, -2, 0), cargo: pts(-2, 0, 2) },
  shoeType: { sneakers: NONE, runners: pts(2, 0, -2), boots: pts(0, -2, 2), slides: pts(-2, 2, 0) },
  hat: { cap: NONE, beanie: pts(-1, 0, 1), headphones: pts(1, 0, -1), shades: pts(1, -1, 0), crown: pts(1, 1, -2) },
  pack: { pack: NONE, sling: pts(0, 1, -1), jet: pts(0, 2, -2) }
};

const CAP = 10;   // no loadout can stack a stat past this many points
const clampPts = v => Math.max(-CAP, Math.min(CAP, v));

export function statsOf(look) {
  const b = BUILDS[look.build] || BUILDS.medium;
  const body = BODIES[look.body] || BODIES.m;
  let speed = b.speed + body.speed, accel = b.accel + body.accel, rec = b.rec + body.rec;
  for (const key in ITEM_STATS) {
    const it = ITEM_STATS[key][look[key]] || NONE;
    speed += it.speed; accel += it.accel; rec += it.rec;
  }
  return { speed: clampPts(speed), accel: clampPts(accel), rec: clampPts(rec) };
}

// What the points do in a race.
const SPEED_PER = 0.006, ACCEL_PER = 0.05, REC_PER = 0.04, BUMP_PER = 0.025;
export const RACE_ACCEL = 3.5;   // how quickly a medium build with no bonuses gets up to speed
export const BUMP_T = 1.3;       // seconds slowed after a bump, before recovery

export function effects(s) {
  return {
    speed: 1 + s.speed * SPEED_PER,              // walking and burst speed
    accel: RACE_ACCEL * (1 + s.accel * ACCEL_PER),   // getting up to speed: the start, after a bump, into a burst
    lat: 1 + s.accel * 0.03,                     // how sharply you change direction
    regen: 1 + s.rec * REC_PER,                  // stamina refill
    bumpT: BUMP_T * (1 - s.rec * BUMP_PER)       // how long a bump keeps you slow
  };
}

// The same numbers as percentages, for the customize screen.
export const statPercents = s => ({ speed: s.speed * SPEED_PER * 100, accel: s.accel * ACCEL_PER * 100, rec: s.rec * REC_PER * 100 });
export const STAT_CAP = CAP;

// A short label for a chip, for example "+Speed -Recovery".
export function statHint(it) {
  if (!it) return '';
  const names = [['speed', 'Speed'], ['accel', 'Accel'], ['rec', 'Recovery']], up = [], down = [];
  for (const [k, n] of names) { if (it[k] > 0) up.push('+' + n); else if (it[k] < 0) down.push('-' + n); }
  return up.concat(down).join(' ') || 'Balanced';
}

// A random build and set of gear for a bot.
export function randomLoadout(rand) {
  const pick = o => { const ks = Object.keys(o); return ks[(rand() * ks.length) | 0]; };
  const out = { build: pick(BUILDS) };
  for (const key in ITEM_STATS) out[key] = pick(ITEM_STATS[key]);
  return out;
}
