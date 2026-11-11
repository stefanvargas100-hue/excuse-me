import { BASE, BOOST, REGEN } from './tuning.js';
/* ---------- race stats: your build and the type of gear you wear. Shared by race and Classic movement; colours never matter. ---------- */
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
  shirtType: {
    tee: NONE, tank: pts(-2, 2, 0), hoodie: pts(0, -2, 2), jacket: pts(2, 0, -2),
    baby: pts(-1, 2, -1), velour: pts(-1, -1, 2), wind: pts(2, 1, -3), varsity: pts(1, -2, 1), power: pts(3, -2, -1), puffer: pts(-2, -1, 3), dress: pts(-1, 3, -2), suit: pts(3, -1, -2)
  },
  pantsType: {
    jeans: NONE, shorts: pts(0, 2, -2), joggers: pts(2, -2, 0), cargo: pts(-2, 0, 2),
    track: pts(2, 1, -3), flares: pts(1, -2, 1), acid: pts(-1, 2, -1), parachute: pts(-2, -1, 3), slacks: pts(3, -2, -1), pleats: pts(-2, 3, -1), pencil: pts(2, -3, 1)
  },
  shoeType: {
    sneakers: NONE, runners: pts(2, 0, -2), boots: pts(0, -2, 2), slides: pts(-2, 2, 0),
    hightops: pts(-1, -1, 2), dad: pts(-1, 2, -1), platforms: pts(2, -3, 1), heels: pts(3, -1, -2), oxfords: pts(2, 1, -3), loafers: pts(-1, 2, -1)
  },
  hat: {
    cap: NONE, beanie: pts(-1, 0, 1), headphones: pts(1, 0, -1), shades: pts(1, -1, 0), crown: pts(1, 1, -2),
    beret: pts(1, 0, -1), visor: pts(0, 1, -1), sweatband: pts(-1, 1, 0), bucket: pts(0, -1, 1), fedora: pts(2, -1, -1), tiara: pts(-1, 2, -1)
  },
  pack: { pack: NONE, sling: pts(0, 1, -1), jet: pts(0, 2, -2), fanny: pts(-1, 2, -1), messenger: pts(1, -1, 0), boombox: pts(-2, -1, 3) }
};

// Fit check: a race bonus to every stat for a good outfit, up to +3.
// Style: 3 matching pieces earn 1, 4 earn 2, a full set of 5 earns 3. Plain starter clothes belong to no style.
// Focus: gear that adds up to 4 or more in one stat earns 1, 7 or more earns 2, so a mixed bag with a clear purpose counts too.
// A hidden headpiece still counts, as it does for stats.
export const STYLE_NAMES = { y2k: 'Y2K', '80s': '80s', modern: 'Modern', formal: 'Formal', sport: 'Sport' };
export const ITEM_STYLES = {
  shirtType: { tank: 'sport', jacket: 'sport', hoodie: 'modern', baby: 'y2k', velour: 'y2k', wind: '80s', varsity: '80s', power: '80s formal', puffer: 'modern', dress: 'formal y2k', suit: 'formal' },
  pantsType: { shorts: 'sport', joggers: 'sport', cargo: 'modern', track: '80s sport', flares: 'y2k', acid: '80s', parachute: '80s', slacks: 'formal', pleats: 'y2k formal', pencil: 'formal' },
  shoeType: { runners: 'sport', boots: 'modern', slides: 'sport', hightops: '80s', dad: 'modern', platforms: 'y2k', heels: 'formal', oxfords: 'formal', loafers: 'formal' },
  hat: { beanie: 'modern', headphones: 'modern', shades: 'y2k', visor: 'sport', sweatband: '80s sport', bucket: 'y2k', beret: 'formal', fedora: 'formal', tiara: 'formal', crown: 'formal' },
  pack: { sling: 'sport', fanny: 'y2k', messenger: 'modern formal', boombox: '80s', jet: 'modern' }
};
export const styleLabel = (key, val) => { const s = ITEM_STYLES[key] && ITEM_STYLES[key][val]; return s ? s.split(' ').map(x => STYLE_NAMES[x]).join('/') : ''; };

export function fitOf(look) {
  const counts = {}, gear = { speed: 0, accel: 0, rec: 0 };
  for (const key in ITEM_STATS) {
    const it = ITEM_STATS[key][look[key]] || NONE, tags = ITEM_STYLES[key][look[key]];
    gear.speed += it.speed; gear.accel += it.accel; gear.rec += it.rec;
    if (tags) for (const t of tags.split(' ')) counts[t] = (counts[t] || 0) + 1;
  }
  let style = null, count = 0;
  for (const t in counts) if (counts[t] > count) { style = t; count = counts[t]; }
  const stylePts = count >= 3 ? count - 2 : 0;
  const top = Math.max(gear.speed, gear.accel, gear.rec), focusPts = top >= 7 ? 2 : top >= 4 ? 1 : 0;
  const focus = !focusPts ? null : top === gear.speed ? 'Speed' : top === gear.accel ? 'Acceleration' : 'Recovery';
  return { style, count, stylePts, focus, focusPts, boost: Math.min(3, stylePts + focusPts) };
}

const CAP = 10;   // non-build speed cap; combined acceleration/recovery cap
const clampPts = v => Math.max(-CAP, Math.min(CAP, v));

export function statsOf(look) {
  const b = BUILDS[look.build] || BUILDS.medium;
  const body = BODIES[look.body] || BODIES.m;
  let speed = body.speed, accel = b.accel + body.accel, rec = b.rec + body.rec;
  for (const key in ITEM_STATS) {
    const it = ITEM_STATS[key][look[key]] || NONE;
    speed += it.speed; accel += it.accel; rec += it.rec;
  }
  const fit = fitOf(look).boost;
  return { speed: clampPts(speed + fit) + b.speed, accel: clampPts(accel + fit), rec: clampPts(rec + fit) };
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
// Keep the combined non-speed cap stable for existing consumers.
export const STAT_CAP = CAP;
export const STAT_CAPS = { speed: CAP + 3, accel: CAP, rec: CAP };

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

// Gear-only race figures: flat ground, full stamina, before combo or temporary boosts.
export function statDetails(points) {
  const e = effects(points), mph = 2.2369362921;
  return { walkMph: BASE * e.speed * mph, burstMph: BOOST * e.speed * mph,
    accel90: Math.log(10) / e.accel, refillSeconds: 100 / (REGEN * e.regen), bumpSeconds: e.bumpT };
}
