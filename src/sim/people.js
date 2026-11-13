import { Music } from '../audio/music.js';
import { DOGS, FASTSHIRTS, GEARS, HAIRS, LUGS, PANTS, SHIRTS, SHOES, SKINS, shade } from '../config/colour.js';
import { randomFace } from '../config/faces.js';
import { LV, SPAWN_FAR } from '../config/levels.js';
import { routePopulation } from '../config/route-population.js';
import { routePieces } from '../config/routes.js';
import { BUILDS } from '../config/stats.js';
import { BELT_SPEED, beltHasZ, beltInfo } from '../config/strips.js';
import { R_BODY, R_LUGGAGE, R_PLAYER, walkSpeed } from '../config/tuning.js';
import { R, TAU, clamp, hashStr, mulberry32, pick, randn, rnd, setR, sgn } from '../config/util.js';
import { ctx } from '../dom.js';
import { VY, VZ } from '../render/camera.js';
import { W3 } from '../render/draw.js';
import { LOOK } from '../save/progress.js';
import { banner } from './actions.js';
import { addPop } from './scoring.js';
import { PHONE_SHARE, activeMod } from './modifiers.js';
import { S, goalOf, raceBuild, state } from './state.js';



/* ---------- obstacle shapes ----------
   Collision circles fitted inside what is drawn (render/figures.js drawProp), so passing close beside something never counts as a hit.
   test/hitboxes.test.js checks every kind against its drawn size. */
const rowC = (os, r) => os.map(ox => ({ ox, oz: 0, r }));
const WET = () => rowC([-0.13, 0.13], 0.12);                               // wet-floor sign: thin, as wide as the board
const BARRIER = () => rowC([-0.8, -0.4, 0, 0.4, 0.8], 0.14);              // crowd barrier: a thin rail 1.9 m wide
const RACK = os => os.flatMap(ox => [{ ox, oz: -0.22, r: 0.15 }, { ox, oz: 0.22, r: 0.15 }]);   // a bike at each spot, front and back wheel

/* ---------- people ---------- */
export function dress(p) {
  p.bald = p.hairStyle === 'bald' || p.hairStyle === 'mohawk';
  p.shirtL = shade(p.shirt, 1.2); p.shirtD = shade(p.shirt, 0.6);
  p.pantsL = shade(p.pants, 1.35); p.pantsD = shade(p.pants, 0.6);
  p.skinL = shade(p.skin, 1.1); p.skinD = shade(p.skin, 0.7);
  p.hairL = shade(p.hair, 1.6);
  p.shoeL = shade(p.shoe, 1.2); p.shoeD = shade(p.shoe, 0.55);
  p.gearL = shade(p.gear, 1.3); p.gearD = shade(p.gear, 0.6);
  p.lugL = shade(p.lugCol, 1.3); p.lugD = shade(p.lugCol, 0.65);
}

export function mk(x, z, o) {
  o = o || {};
  const p = Object.assign({
    x, z, vx: 0, vz: 0, hx: 0, hz: 1, v0: 0, phase: rnd(0, TAU), t: rnd(0, 10), h: clamp(1.72 + randn() * 0.08, 1.55, 1.95),
    shirt: pick(SHIRTS), pants: pick(PANTS), skin: pick(SKINS), hair: pick(HAIRS), shoe: pick(SHOES),
    hairStyle: R() < 0.08 ? 'bald' : R() < 0.3 ? 'long' : 'short',
    hat: R() < 0.1 ? pick(['cap', 'beanie']) : R() < 0.04 ? 'headphones' : 'none', face: R() < 0.06 ? 'shades' : 'none', pack: R() < 0.15 ? 'pack' : 'none', gear: pick(GEARS),
    lug: 0, lugCol: pick(LUGS), dog: 0, dogCol: pick(DOGS), phone: false, wave: 0, ph: rnd(0, TAU),
    yieldP: 0.5, space: 0.1, locked: false, laneX: null, free: false, exit: false, dead: false,
    swerve: false, tele: false, swFired: false, swDir: 1, swT: 0, swAt: 8,
    hit: false, passed: false, fast: false, rival: false, rs: 'cruise', rt: 0, cuts: 0, cool: 0, cutDone: false,
    prop: null, photo: 0, stopT: 0, wait: null, turnX: null, turnDir: 0, faceTo: null
  }, o);
  // a face for every crowd person, derived from their own phase so it never disturbs the seeded crowd (daily and race layouts stay the same)
  { const rf = randomFace(mulberry32(Math.floor(p.phase * 1e6) >>> 0)); for (const k in rf) if (o[k] === undefined) p[k] = rf[k]; }
  // Heads down day: decided from the person's own phase, so the seeded crowd layout is untouched
  if (activeMod === 'phones' && !p.prop && !p.rival && o.phone === undefined && (p.phase * 1e6 % 1000) / 1000 < PHONE_SHARE) { p.phone = true; if (!p.wave) p.wave = 0.3; }
  if (o.vx === undefined && o.vz === undefined) { p.vx = p.hx * p.v0; p.vz = p.hz * p.v0; }
  p.dirz = sgn(p.hz);
  p.walkA = Math.hypot(p.vx, p.vz) > 0.15 ? 1 : 0;
  if (!p.circles) {
    p.circles = [{ ox: 0, oz: 0, r: R_BODY }];
    if (p.lug) p.circles.push({ ox: p.lug * 0.5, oz: 0, r: R_LUGGAGE });
    if (p.dog) p.circles.push({ ox: p.dog * 0.55, oz: 0.15, r: 0.2 });
  }
  p.rad = 0; for (const c of p.circles) p.rad = Math.max(p.rad, c.r + Math.hypot(c.ox, c.oz || 0));
  if (p.fx === undefined) {
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > 0.1) { p.fx = p.vx / sp; p.fz = p.vz / sp; }
    else if (p.v0 === 0 && !p.prop) { const a = rnd(0, TAU); p.fx = Math.cos(a); p.fz = Math.sin(a); }
    else { p.fx = p.hx; p.fz = p.hz; }
  }
  // Outfit and build variety for the crowd. Drawn from the person's own phase, never from the seeded stream, so positions, speeds and daily layouts stay exactly as they were.
  if (!p.prop && !o.isMe) {
    const rv = mulberry32((Math.floor(p.phase * 1e6) ^ 0x5bd1e995) >>> 0);
    const wp = l => { let t = 0; for (const e of l) t += e[1]; let r = rv() * t; for (const e of l) { r -= e[1]; if (r <= 0) return e[0]; } return l[0][0]; };
    const set = (k, v) => { if (o[k] === undefined) p[k] = v; };
    const fem = o.body !== undefined ? o.body === 'f' : (p.hairStyle === 'long' && o.hairStyle === undefined) || rv() < 0.3;
    set('body', fem ? 'f' : 'm');
    if (o.hairStyle === undefined && p.hairStyle !== 'bald') p.hairStyle = fem ? wp([['long', 3], ['medium', 2], ['pony', 2], ['bun', 2], ['braid', 1], ['curly', 1], ['short', 1]]) : wp([['short', 8], ['curly', 1.5], ['medium', 1]]);
    set('bulk', wp(fem ? [[0.9, 2], [0.96, 3], [1.08, 1]] : [[0.96, 2], [1, 3], [1.12, 2]]));
    set('shirtType', fem ? wp([['tee', 4], ['dress', 2.5], ['tank', 1.5], ['baby', 0.8], ['hoodie', 1.5], ['jacket', 1], ['suit', 0.6], ['velour', 0.5], ['power', 0.3]])
      : wp([['tee', 5], ['hoodie', 2], ['jacket', 1.2], ['tank', 0.8], ['suit', 0.9], ['wind', 0.5], ['varsity', 0.5], ['puffer', LV.id === 'nyc' ? 1 : 0.3]]));
    const formal = p.shirtType === 'suit' || p.shirtType === 'power';
    set('pantsType', formal ? (fem ? wp([['pencil', 2], ['slacks', 2]]) : 'slacks') : p.shirtType === 'dress' ? 'jeans'
      : fem ? wp([['jeans', 4], ['joggers', 1.5], ['shorts', 1], ['pleats', 1.5], ['pencil', 1], ['slacks', 0.8], ['cargo', 0.6], ['flares', 0.3]])
      : wp([['jeans', 5], ['joggers', 2], ['shorts', 1.2], ['cargo', 1], ['slacks', 1], ['track', 0.3]]));
    set('shoeType', formal ? (fem ? wp([['heels', 2], ['oxfords', 1], ['loafers', 1]]) : wp([['oxfords', 2], ['loafers', 1]]))
      : fem ? wp([['sneakers', 4], ['runners', 1.5], ['heels', 1.5], ['boots', 1], ['dad', 0.6], ['platforms', 0.3], ['slides', 0.5]])
      : wp([['sneakers', 5], ['runners', 2], ['boots', 1], ['slides', 0.5], ['hightops', 0.3], ['dad', 0.5]]));
    if (!p.lug && !p.dog && !p.phone && !p.boxes && !p.flag && !p.fast && !p.photo && !p.dance) set('carry', wp([[null, 7.5], ['coffee', 1.3], ['bag', 1.2]]));
  }
  dress(p);
  p.prevDz = z - (S ? S.pz : 0);
  S.people.push(p);
  return p;
}

// Height and breadth come from the build. The hitbox stays the same size for everyone.
export function applyBuild(p) {
  const b = BUILDS[p.build] || BUILDS.medium; p.h = b.h; p.bulk = b.bulk;
  const shown = p.showHead !== '0';   // what is drawn; the stats read the chosen item, shown or not
  p.face = shown && p.hat === 'shades' ? 'shades' : 'none';
  if (!shown || p.hat === 'shades') p.hat = 'none';
}

export function makeMe() {
  const p = Object.assign({ x: 0, z: 0, vx: 0, vz: 0, phase: 0, t: 0, h: 1.76, lug: 0, lugCol: '#000000', dog: 0, phone: false, fast: false,
    rival: false, tele: false, hit: false, isMe: true, fx: 0, fz: 1, circles: [{ ox: 0, oz: 0, r: R_PLAYER }] }, LOOK, S && S.run && S.run.outfit);
  applyBuild(p); dress(p); return p;
}

function wpick(pool) {
  let t = 0; for (const e of pool) t += e[1];
  let r = R() * t;
  for (const e of pool) { r -= e[1]; if (r <= 0) return e[0]; }
  return pool[0][0];
}

// x position biased to the keep side for a given walking direction (+1 with you, -1 toward you).
function laneX(dir) {
  const h = LV.half - 0.6, side = dir * LV.keep;
  const lo = LV.id === 'nyc' ? -3.2 : -h;   // NYC: curb furniture on the left
  if (R() < 0.78) return side > 0 ? rnd(0.2, h) : rnd(lo, -0.2);
  return rnd(lo, h);
}

export function walker(z, dir, o) {
  const x = laneX(dir);
  return mk(x, z, Object.assign({ hx: 0, hz: dir, v0: walkSpeed(), laneX: x }, o || {}));
}

function group(z, dir, n) {
  const x = clamp(laneX(dir), -LV.half + 1.2, LV.half - 1.2), v = walkSpeed(1.12, 0.12);   // groups walk abreast and slower
  for (let i = 0; i < n; i++) {
    const gx = x + (i - (n - 1) / 2) * 0.74;
    mk(gx, z + rnd(-0.15, 0.15), { hx: 0, hz: dir, v0: v, laneX: gx, space: 0, chat: i < (n - 1) / 2 ? 1 : i > (n - 1) / 2 ? -1 : 1 });   // chat: which way they turn to talk (looks only)
  }
}

function spawnUnit(z, d) {
  const id = LV.id;
  let pool;
  if (id === 'airport') {
    pool = [['walker', 3], ['oncoming', 4], ['luggage', 3], ['pair', 2], ['stander', 1]];
    if (d > 0.08) pool.push(['speedster', 2], ['phone', 1]);
    if (d > 0.2) pool.push(['swerver', 1], ['crosser', 0.8], ['wetfloor', 0.3]);
    if (d > 0.45) pool.push(['trio', 1], ['rusher', 1]);
  } else if (id === 'nyc') {
    pool = [['walker', 4], ['oncoming', 4], ['pair', 2], ['phone', 1.5], ['tourist', 1.5], ['dog', 1]];
    if (d > 0.08) pool.push(['speedster', 1.5], ['luggage', 0.5]);
    if (d > 0.2) pool.push(['swerver', 1]);
    if (d > 0.4) pool.push(['trio', 1]);
  } else if (id === 'tsukiji') {
    pool = [['walker',4],['oncoming',2],['luggage',1]];
  } else if (id === 'skytree') {
    pool = [['skywalker',6],['tourist',1]];
  } else if (id === 'takeshita') {
    pool = [['shopper', 8], ['walker', 3], ['oncoming', 2], ['pair', 1], ['phone', 1]];
  } else if (id === 'subway') {
    pool = [['walker', 4], ['oncoming', 4], ['pair', 2], ['phone', 2], ['luggage', 1]];
    if (d > 0.3) pool.push(['speedster', 1]);
  } else if (id === 'bridge') {
    pool = [['walker',4],['oncoming',4],['pair',2],['tourist',3],['joggers',1]];
  } else if (id === 'park') {
    pool = [['walker', 3], ['oncoming', 3], ['pair', 2], ['dog', 2], ['joggers', 2], ['tourist', 0.5]];
  } else {
    pool = [['oncoming', 5], ['walker', 3], ['pair', 2], ['phone', 1.5], ['diagonal', 2], ['luggage', 0.5]];
    if (d > 0.15) pool.push(['trio', 1], ['swerver', 1], ['speedster', 0.5]);
  }
  let type = wpick(pool); const dirv = R() < 0.5 ? 1 : -1;
  if (raceBuild && (type === 'crosser' || type === 'diagonal') && beltInfo(id) && beltHasZ(beltInfo(id), z)) type = 'walker';   // nobody cuts across the glass walls
  switch (type) {
    case 'joggers': {
      for (let i=0;i<2;i++) mk(2.4+i*0.8, z+i*0.3, { jogger: true, fast: true, hx: 0, hz: 1, v0: rnd(3.3,4.1), shirtType: 'tank', pantsType: 'shorts', yieldP: 0.7 });
      break;
    }
    case 'skywalker': walker(z,1,{v0:rnd(2.2,2.9)}); break;
    case 'walker': walker(z, 1); break;
    case 'oncoming': walker(z, -1, { lug: id === 'airport' && R() < 0.35 ? pick([-1, 1]) : 0 }); break;
    case 'luggage': walker(z, dirv, { lug: pick([-1, 1]) }); break;
    case 'pair': group(z, dirv, 2); break;
    case 'trio': group(z, dirv, 3); break;
    case 'stander': {
      const n = R() < 0.5 ? 3 : 2, x = rnd(-LV.half + 1, LV.half - 1.6), offs = [[0, 0], [0.72, 0.15], [0.36, 0.7]];
      for (let i = 0; i < n; i++) {
        const gx = x + offs[i][0], gz = z + offs[i][1], ax = x + 0.36 - gx, az = z + 0.3 - gz, al = Math.hypot(ax, az) || 1;
        mk(gx, gz, { v0: 0, fx: ax / al, fz: az / al });
      }
      break;
    }
    case 'phone': walker(z, dirv, { phone: true, v0: walkSpeed(0.95, 0.12), wave: 0.35, yieldP: 0, space: 0 }); break;
    case 'shopper': walker(z, dirv, { shopper: true, photo: rnd(1.2, 4), pack: 'pack', carry: 'bag' }); break;
    case 'tourist': walker(z, dirv, { photo: rnd(1, 6), pack: 'pack' }); break;
    case 'dog': walker(z, dirv, { dog: pick([-1, 1]), v0: walkSpeed(1.15, 0.15) }); break;
    case 'speedster': spawnFast(false, z); break;
    case 'swerver': walker(z, dirv, { swerve: true, swAt: rnd(7, 9) }); break;
    case 'rusher': walker(z, -1, { v0: rnd(2.2, 2.9), lug: pick([-1, 1]), yieldP: 0.2 }); break;
    case 'crosser': { const side = pick([-1, 1]); mk(side * (LV.half - 0.5), z, { hx: -side, hz: 0, v0: walkSpeed(), free: true, exit: true }); break; }
    case 'diagonal': {
      const side = pick([-1, 1]), dz = pick([1, -1]);
      mk(side * (LV.half - 0.5), z, { hx: -side * 0.6, hz: dz * 0.8, v0: walkSpeed(1.4), free: true, exit: true });
      break;
    }
    case 'spill': {
      const ry = Math.min(0.6, VY / Math.max(0.5, z - VZ));
      ctx.fillStyle = 'rgba(107,68,35,0.85)'; ctx.beginPath(); ctx.ellipse(bx, fy, 1.0 * s, 1.0 * s * ry, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(160,110,60,0.6)'; ctx.beginPath(); ctx.ellipse(bx + 0.3 * s, fy + 0.1 * s * ry, 0.55 * s, 0.4 * s * ry, 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(bx - 0.35 * s, fy - 0.2 * s * ry, 0.25 * s, 0.08 * s * ry, 0, 0, TAU); ctx.fill();
      const cup = W3(x + 0.5, 0.05, z - 0.3);
      ctx.fillStyle = '#f4f1ea'; ctx.fillRect(cup[0] - 0.06 * s, cup[1] - 0.05 * s, 0.16 * s, 0.1 * s);
      break;
    }
    case 'wetfloor': mk(rnd(-4, 4), z, { prop: 'wetfloor', circles: WET() }); break;
  }
}

// Speed walkers keep to the fast side and walk faster than you do at base pace.
export function spawnFast(behind, zOverride) {
  const z = zOverride !== undefined ? zOverride : (behind ? S.pz - rnd(9, 14) : S.pz + rnd(25, 50));
  const x = LV.id === 'airport' ? LV.keep * rnd(2.2, LV.half - 0.8) : laneX(1);
  mk(x, z, { fast: true, shirt: pick(FASTSHIRTS), hx: 0, hz: 1, v0: rnd(3.5, 4.7), yieldP: 0.65, space: 0, laneX: x });
}

// Rivals pull level or ahead, spot your lane, cut across, then brake in front of you.
export function spawnRival() {
  const behind = R() < 0.5, side = R() < 0.5 ? -1 : 1;
  const x = clamp(S.px + side * rnd(1.8, 2.8), -LV.half + 0.6, LV.half - 0.6);
  mk(x, behind ? S.pz - rnd(5, 8) : S.pz + rnd(SPAWN_FAR, SPAWN_FAR + 6), {
    rival: true, fast: true, shirt: '#c1121f', pants: '#111827', hx: 0, hz: 1, v0: behind ? rnd(4.3, 4.8) : rnd(2.3, 2.7), yieldP: 0, space: 0
  });
}

export const inXing = z => { if (LV.id !== 'nyc') return false; const m = z % 90; return z >= 90 && z < goalOf() - 30 && m >= 0 && m < 12; };

// Fifth Avenue sidewalk furniture along the curb (and a few sandwich boards by the shops).
function nycProps(z0) {
  for (let z = Math.ceil(z0); z < z0 + 4; z++) {
    if (inXing(z) || inXing(z + 2) || inXing(z - 2) || z < 8) continue;
    if (z % 30 === 6) mk(-3.95, z, { prop: 'lamp', circles: [{ ox: 0, oz: 0, r: 0.14 }] });
    else if (z % 15 === 12) mk(-3.7, z, { prop: 'tree', circles: [{ ox: 0, oz: 0, r: 0.18 }] });
    else if (z % 45 === 21) mk(-3.85, z, { prop: 'trash', circles: [{ ox: 0, oz: 0, r: 0.3 }] });
    else if (z % 60 === 39) mk(-4.0, z, { prop: 'hydrant', circles: [{ ox: 0, oz: 0, r: 0.18 }] });
    else if (z % 90 === 52 && R() < 0.6) mk(-3.35, z, { prop: 'cart', circles: [{ ox: 0, oz: -0.6, r: 0.45 }, { ox: 0, oz: 0, r: 0.45 }, { ox: 0, oz: 0.6, r: 0.45 }] });
    if (z % 36 === 30 && R() < 0.6) mk(3.95, z, { prop: 'board', circles: rowC([-0.18, 0.18], 0.12) });
  }
}

// Fifth Avenue obstacles in the walkway itself: an island every 36 m (barrier, newsstand, bike rack, bench in turn), plus a bus shelter
// and bags of rubbish at the curb now and then. Islands leave plenty of sidewalk open on one side.
const NYC_ISLANDS = ['barrier', 'newsstand', 'bikes', 'bench'];
function nycStreet(z0) {
  const n = Math.floor(z0 / 4);
  if (z0 < 24 || inXing(z0 - 4) || inXing(z0) || inXing(z0 + 4) || inXing(z0 + 8)) return;
  const row = (k, x, z, os, r) => mk(x, z, { prop: k, circles: os.map(ox => ({ ox, oz: 0, r })) });
  if (n % 9 === 4) {
    const kind = NYC_ISLANDS[Math.floor(n / 9) % NYC_ISLANDS.length], x = rnd(-2.2, 2.4), z = z0 + 2;
    if (kind === 'barrier') mk(x, z, { prop: kind, circles: BARRIER() });
    else if (kind === 'newsstand') row(kind, x, z, [-0.4, 0.4], 0.55);
    else if (kind === 'bikes') mk(x, z, { prop: kind, rack: [-0.6, 0, 0.6], circles: RACK([-0.6, 0, 0.6]) });
    else row(kind, x, z, [-0.5, -0.17, 0.17, 0.5], 0.21);
  } else if (n % 27 === 20) mk(-3.5, z0 + 2, { prop: 'shelter', circles: [-1.25, -0.625, 0, 0.625, 1.25].map(oz => ({ ox: -0.18, oz, r: 0.19 })) });   // the back wall and the seat; the roof is overhead
  else if (n % 11 === 7) mk(-3.75, z0 + 1, { prop: 'trashbags', circles: [{ ox: 0, oz: 0, r: 0.45 }] });
}

// Shibuya: vending machines at the edges, and an island every 44 m in the crossing (A-frame sign, bike rack, crowd barrier in turn).
const TOKYO_ISLANDS = ['asign', 'bikes', 'barrier'];
function tokyoStreet(z0) {
  const n = Math.floor(z0 / 4);
  if (z0 < 24) return;
  if (n % 6 === 1) mk((n % 12 === 1 ? -1 : 1) * 10.0, z0 + 1, { prop: 'vending', circles: [{ ox: 0, oz: 0, r: 0.4 }] });
  if (n % 11 === 5) {
    const kind = TOKYO_ISLANDS[Math.floor(n / 11) % TOKYO_ISLANDS.length], x = rnd(-7.5, 7.5), z = z0 + 2;
    if (kind === 'asign') mk(x, z, { prop: kind, circles: rowC([-0.17, 0.17], 0.13) });
    else if (kind === 'bikes') { const os = [-1.0, -0.5, 0, 0.5, 1.0]; mk(x, z, { prop: kind, rack: os, circles: RACK(os) }); }
    else mk(x, z, { prop: kind, circles: BARRIER() });
  }
}

// Terminal furniture you have to weave around: an island every 32 m (info desk, benches, bin, plant, trolleys in turn) and a bin or
// plant by a wall now and then. Islands leave the walkway open on at least one side, and in a race they keep off the moving walkway.
const AIRPORT_KINDS = ['desk', 'chairs', 'bin', 'plant', 'trolleys'];
const GATE_Z0 = 40, GATE_EVERY = 40;   // keep in step with render/apron.js
function airportProps(z0) {
  const n = Math.floor(z0 / 4);
  if (z0 < 24) return;
  // gate areas along the window wall: a desk at each gate, seats either side, a few people waiting
  const gz = GATE_Z0 + Math.round((z0 + 2 - GATE_Z0) / GATE_EVERY) * GATE_EVERY, off = gz - (z0 + 2);
  const nearGate = Math.abs(off) < 5;   // keep islands and wall bins clear of the gate area
  if (gz >= GATE_Z0) {
    const inChunk = d => d >= -2 && d < 2, seatsAt = o2 => inChunk(gz + o2 - (z0 + 2));
    if (inChunk(off)) mk(-5.9, gz, { prop: 'gatedesk', circles: [-0.9, 0, 0.9].map(oz => ({ ox: 0, oz, r: 0.45 })) });
    for (const o of [-7, 7]) if (seatsAt(o)) mk(-6.2, gz + o, { prop: 'benchz', circles: [-0.75, -0.25, 0.25, 0.75].map(oz => ({ ox: 0, oz, r: 0.28 })) });
    if (seatsAt(3)) for (let i = 0; i < 3; i++) mk(rnd(-5.6, -4.6), gz + 3 + rnd(-0.8, 0.8), { v0: 0, fx: -1, fz: 0 });   // waiting for boarding, facing the window
  }
  const race = raceBuild && beltInfo(LV.id);
  const shape = (kind, x, z) => {
    const cs = o => o.map(ox => ({ ox, oz: 0, r: kind === 'desk' ? 0.45 : kind === 'chairs' ? 0.28 : kind === 'trolleys' ? 0.26 : kind === 'plant' ? 0.38 : 0.3 }));
    const circles = kind === 'desk' ? cs([-0.9, -0.3, 0.3, 0.9]) : kind === 'chairs' ? cs([-0.75, -0.25, 0.25, 0.75]) : kind === 'trolleys' ? cs([-0.5, 0, 0.5]) : cs([0]);
    mk(x, z, { prop: kind, circles });
  };
  if (nearGate) return;
  if (n % 8 === 5) shape(AIRPORT_KINDS[Math.floor(n / 8) % AIRPORT_KINDS.length], rnd(-4.2, race ? -1.4 : 4.2), z0 + 2);
  else if (n % 5 === 2) { const side = race ? -1 : pick([-1, 1]); shape(n % 2 ? 'bin' : 'plant', side * 6.1, z0 + 1); }
}

function parkProps(z0) {
  if (z0 < 24 || (z0 >= 232 && z0 <= 284)) return;
  const n = Math.floor(z0 / 4), side = n % 2 ? -1 : 1, z = z0 + 2;
  if (n % 6 === 0) mk(side * 5.1, z, { prop: 'bench', circles: rowC([-0.5,-0.17,0.17,0.5],0.2) });
  else if (n % 6 === 1) mk(side * 5.4, z, { prop: 'lamp', circles: rowC([0],0.13) });
  else if (n % 6 === 2) mk(side * 5.3, z, { prop: 'trash', circles: rowC([0],0.27) });
  else if (n % 12 === 3) mk(side * 4.5, z, { prop: 'pretzel', circles: [-0.6,0,0.6].map(oz=>({ox:0,oz,r:0.4})) });
  else if (n % 12 === 9) mk(side * 3.4, z, { prop: 'easel', circles: rowC([-0.2,0,0.2],0.15) });
  else if (n % 6 === 4) mk(side * 4.6, z, { prop: 'bikes', rack: [-0.6,0,0.6], circles: RACK([-0.6,0,0.6]) });
}

function bridgeProps(z0) {
  if(z0<24 || (z0>=170&&z0<220)||(z0>=390&&z0<440))return;
  if(raceBuild && [120,310].some(z=>Math.abs(z-z0)<14))return;
  const n=Math.floor(z0/4), side=n%2?-1:1, z=z0+2;
  if(n%9===0)mk(side*4.1,z,{prop:'bench',circles:rowC([-0.5,-0.17,0.17,0.5],0.2)});
  else if(n%9===2)mk(side*4.4,z,{prop:'trash',circles:rowC([0],0.27)});
  else if(n%9===4)mk(side*3.3,z,{prop:'tripod',circles:rowC([-0.2,0,0.2],0.15)});
  else if(n%9===6)mk(side*3.5,z,{prop:'barrier',circles:BARRIER()});
}
function genChunkInner(z0) {
  const d = clamp(z0 / LV.goal, 0, 1);
  if (LV.id === 'nyc') { nycProps(z0); nycStreet(z0); }
  if (LV.id === 'airport') airportProps(z0);
  if (LV.id === 'shibuya') tokyoStreet(z0);
  if (LV.id === 'park') parkProps(z0);
  if (LV.id === 'bridge') bridgeProps(z0);
  if (LV.id === 'tsukiji' && z0 % 32 === 16) mk(pick([-1,1])*1.8,z0+2,{prop:'wetpatch',wetPatch:true,width:2.4,depth:4,circles:[]});
  if (inXing(z0 + 2)) return;   // the crosswalk crowds come from the signal waves instead
  const k = LV.base + (R() < 0.4 + 0.4 * d ? 1 : 0) + (d > 0.25 && R() < 0.55 ? 1 : 0) + (d > 0.6 && R() < 0.6 ? 1 : 0);
  for (let i = 0; i < k; i++) spawnUnit(z0 + R() * 4, d);
}

// Fifth Avenue: crowds wait at each corner, then pour across when the signal changes.
export function updXings() {
  if (S.endless) while (!S.xings.length || S.xings[S.xings.length - 1].z < S.pz + 250) S.xings.push({ z: (S.xings.length ? S.xings[S.xings.length - 1].z : 0) + 90, sig: false, spawned: false, walk: false });
  for (const x of S.xings) {
    if (!x.sig && S.pz > x.z - 75) {
      x.sig = true;
      mk(-4.05, x.z - 0.8, { prop: 'signal', xing: x, circles: [{ ox: 0, oz: 0, r: 0.14 }] });
      mk(-4.05, x.z + 12.8, { prop: 'signal', xing: x, circles: [{ ox: 0, oz: 0, r: 0.14 }] });
    }
    if (!x.spawned && S.pz > x.z - (SPAWN_FAR + 2)) {
      x.spawned = true;
      seeded(':x' + x.z, () => {
      const n1 = 3 + ((R() * 4) | 0), n2 = 4 + ((R() * 5) | 0), n3 = 2 + ((R() * 3) | 0);
      for (let i = 0; i < n1; i++) mk(rnd(-3.0, 3.6), x.z - rnd(0.4, 2.2), { v0: 0, hx: 0, hz: 1, fx: 0, fz: 1, wait: x });
      for (let i = 0; i < n2; i++) mk(rnd(-3.0, 3.6), x.z + 12 + rnd(0.4, 2.4), { v0: 0, hx: 0, hz: -1, fx: 0, fz: -1, wait: x });
      for (let i = 0; i < n3; i++) mk(rnd(-9.5, -6), x.z + 12 + rnd(0.5, 2.5), { v0: 0, hx: 1, hz: 0, fx: 1, fz: 0, wait: x, free: true, turnX: rnd(-2.5, 2.5), turnDir: pick([1, -1]) });
      });
    }
    if (!x.walk && S.pz > x.z - 16) { x.walk = true; if (state === 'play') addPop('WALK', '#f4f6f8', 24); }
  }
}

// Scripted crowd moments, announced with a banner.
export function runEvent(kind) {
  const z = S.pz + rnd(SPAWN_FAR + 4, SPAWN_FAR + 14), h = LV.half;
  if (kind === 'turret') {
    const dir=pick([-1,1]);
    const p=mk(-dir*(h+1.6),z,{prop:'turret',drive:dir*.65,driving:true,driveAt:0,len:2.2,circles:rowC([-0.7,0,0.7],.45)}); p.dirx=dir;
    banner('MARKET DELIVERY CROSSING', '#ffd166');
  } else if(kind === 'viewpoint') {
    for(let row=0;row<3;row++) for(let col=0;col<4;col++) mk(h-0.8-col*.8,z+row*1.4,{viewpoint:true,v0:0,phone:true,fx:1,fz:0,yieldP:0});
    banner('WINDOW VIEWPOINT AHEAD', '#7cc4ff');
  } else if (kind === 'tour') {
    const dir = R() < 0.6 ? -1 : 1, x = clamp(laneX(dir), -h + 1.8, h - 1.8), col = pick(['#ff2d3a', '#ffcf1f', '#20e3ff', '#7cff6b']);
    const L = mk(x, z, { hx: 0, hz: dir, v0: 1.0, flag: col, laneX: x, shirt: col });
    const n = 8 + ((R() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const sl = [rnd(-1.3, 1.3), -rnd(0.7, 2.8)];
      mk(clamp(x + sl[0], -h + 0.5, h - 0.5), z + sl[1] * dir, { hx: 0, hz: dir, v0: 1.0, follow: L, slot: sl, hat: R() < 0.4 ? 'cap' : 'none', gear: col, pack: R() < 0.4 ? 'pack' : 'none' });
    }
    banner('TOUR GROUP AHEAD', '#7cc4ff');
  } else if (kind === 'parade' || kind === 'queue') {
    // A line right across the walkway with one way through. Find the gap early, or say "Excuse me".
    const lim = LV.half - 0.5, lo = LV.id === 'nyc' ? -2.6 : -lim, gapW = 1.9, step = Math.max(0.74, 2 * lim / 16), rows = kind === 'parade' ? 2 : 1;
    const gapX = rnd(lo + gapW / 2 + 0.2, lim - gapW / 2 - 0.2);
    for (let r = 0; r < rows; r++) for (let x = -lim; x <= lim; x += step) {
      if (Math.abs(x - gapX) < gapW / 2) continue;
      if (kind === 'parade') mk(x, z + r * 1.1, { hx: 0, hz: -1, v0: 1.0, laneX: x, space: 0, yieldP: 0 });
      else mk(x, z, { v0: 0, fx: 0, fz: 1 });
    }
    banner(kind === 'parade' ? 'PARADE COMING THROUGH' : 'QUEUE ACROSS THE WALKWAY', '#ff9f43');
  } else if (kind === 'cleaners') {
    const lim = LV.half - 0.5, gapW = 2.2, gapX = rnd(-lim + gapW / 2 + 0.2, lim - gapW / 2 - 0.2);
    for (let x = -lim; x <= lim; x += 1.0) if (Math.abs(x - gapX) >= gapW / 2) mk(x, z, { prop: 'wetfloor', circles: WET() });
    banner('CLEANING CREW AHEAD', '#ffd166');
  } else if (kind === 'arrivals') {
    for (let i = 0; i < 13; i++) walker(S.pz + rnd(SPAWN_FAR, SPAWN_FAR + 28), -1, { lug: pick([-1, 1]) });
    banner('FLIGHT 212 HAS LANDED', '#ffcf1f');
  } else if (kind === 'spill') {
    const x = clamp(S.px + rnd(-1.5, 1.5), -h + 1.4, h - 1.4), sz = z - 10;
    const sp = mk(x, sz, { prop: 'spill', circles: [] }); sp.rad = 1.0;
    mk(x + (x > 0 ? -1.4 : 1.4), sz, { prop: 'wetfloor', circles: WET() });
    const dropper = mk(x + 0.6, sz + 0.8, { v0: 0, fx: 0, fz: -1 });
    dropper.react = { t: -1.2, text: 'My latte!', up: true };
    banner('SPILL AHEAD: NO GRIP', '#c8a165');
  } else if (kind === 'performer') {
    const px = rnd(-1.0, 2.0);
    mk(px, z, { v0: 0, dance: true, fx: 0, fz: -1, shirt: pick(['#ff2d3a', '#9b51e0', '#14b8a6']), hat: 'cap', gear: '#111827' });
    const m = 8 + ((R() * 3) | 0);
    for (let i = 0; i < m; i++) {
      const a = i / m * TAU + rnd(-0.12, 0.12), wx = clamp(px + Math.cos(a) * 1.75, -h + 0.4, h - 0.4), wz = z + Math.sin(a) * 1.4;
      const ax = px - wx, az = z - wz, al = Math.hypot(ax, az) || 1;
      mk(wx, wz, { v0: 0, fx: ax / al, fz: az / al, phone: R() < 0.3 });
    }
    banner('STREET PERFORMER', '#ff7eb6');
  } else if (kind === 'delivery') {
    walker(z, -1, { v0: 1.1, boxes: true, yieldP: 0.15, circles: [{ ox: 0, oz: 0, r: R_BODY }, { ox: 0, oz: -0.6, r: 0.32 }] });
    banner('DELIVERY COMING THROUGH', '#c8a165');
  } else if (kind === 'weave') {
    // Rows of oncoming people, each row with a gap, and the gap snakes left and right down the hall. The open spaces between people
    // let you read the pattern coming and plan a line through it.
    const race = raceBuild && beltInfo(LV.id), lo = LV.id === 'nyc' ? -2.8 : LV.id === 'shibuya' ? -9.5 : -5.6, hi = LV.id === 'nyc' ? 3.0 : LV.id === 'shibuya' ? 9.5 : race ? 1.4 : 5.6, mid = (lo + hi) / 2, amp = Math.min((hi - lo) / 2 - 1.0, 3.2), ph = rnd(0, TAU);
    const rows = [];
    for (let i = 0; i < 6; i++) {
      const gx = mid + amp * Math.sin(ph + i * 0.65), rz = z + i * 8;
      let ref = null;
      for (let x = lo; x <= hi; x += 0.85) {
        if (Math.abs(x - gx) < 1.0) continue;
        const q = mk(x, rz, { hx: 0, hz: -1, v0: 1.2, laneX: x, space: 0, yieldP: 0.2 }); ref = ref || q;
      }
      rows.push({ z: rz, gx, ref });
    }
    S.flows.push({ kind: 'weave', rows });
    banner('WEAVE AHEAD: FOLLOW THE GAPS', '#5ee6a8');
  } else if (kind === 'cart' || kind === 'van' || kind === 'taxi' || kind === 'carriage') {
    // A vehicle crosses the walkway from one side to the other, beeping as it starts. Beat it across or wait for it to pass.
    const dir = kind === 'van' ? 1 : pick([-1, 1]), x0 = -dir * (h + 3);
    const cz = kind === 'carriage' && z - 4 >= 225 && z - 4 <= 290 ? 300 : z - 4;
    // [prop, speed, trigger distance, circles, spacing, radius, banner, colour, first circle back from the front, length]
    const spec = { carriage: ['carriage', 2.5, 30, 6, 0.8, 0.4, 'HORSE CARRIAGE CROSSING', '#c8a165', 0.5, 5], cart: ['cart2', 2.6, 24, 3, 1.25, 0.5, 'BAGGAGE CART CROSSING', '#ffd166', 0, 3.05], van: ['van', 3.2, 24, 4, 3.2 / 3, 0.7, 'DELIVERY VAN CUTTING ACROSS', '#c8a165', 0.7, 4.6], taxi: ['taxi', 4.0, 30, 4, 1.0, 0.7, 'TAXI CUTTING THROUGH', '#ffcf1f', 0.7, 4.4] }[kind];
    const v = mk(x0, cz, { prop: spec[0], drive: dir * spec[1], driveAt: spec[2], len: spec[9], circles: [...Array(spec[3]).keys()].map(i => ({ ox: -dir * (spec[8] + i * spec[4]), oz: 0, r: spec[5] })) });
    v.rad = 3.4; v.dirx = dir;
    banner(spec[6], spec[7]);
  } else if (kind === 'train') {
    // A train pulls in on the track side. Its doors are 9 m apart, and each door lets out a tight group that crosses to the wall side,
    // so between doors there is always a clear stretch of platform. Nothing here depends on where any racer is.
    const doors = 4, spacing = 9, edge = h + 0.3;
    for (let c = 0; c < doors; c++) mk(edge + 1.4, z + c * spacing + spacing / 2, { prop: 'train', len: spacing - 0.5, door: true, circles: [] });
    for (let c = 0; c < doors; c++) {
      const dz = z + c * spacing + spacing / 2, n = 2 + ((R() * 3) | 0);
      for (let i = 0; i < n; i++) mk(h - 0.35 + i * 0.6, dz + rnd(-0.3, 0.3), { commuter: true, hx: -1, hz: 0, v0: walkSpeed(1.1, 0.15), free: true, turnX: rnd(-h + 1.0, 0.5), turnDir: pick([1, -1]), space: 0.05 });
    }
    banner('TRAIN ARRIVING', '#ffd166');
  } else if (kind === 'selfie') {
    const cx0 = rnd(-6, 6), n = 4 + ((R() * 3) | 0);
    for (let i = 0; i < n; i++) { const a = i / n * TAU; mk(cx0 + Math.cos(a) * 0.55, z + Math.sin(a) * 0.55, { v0: 0, fx: Math.cos(a), fz: Math.sin(a), phone: true }); }
    banner('SELFIE SQUAD', '#ff3d9a');
  }
}

// Shibuya: every few seconds the lights change and a wave crosses from the far side and the corners.
export function scramble() {
  const d = clamp(S.pz / LV.goal, 0, 1), n = 12 + Math.floor(d * 10);
  for (let i = 0; i < n; i++) {
    const x = rnd(-LV.half + 0.6, LV.half - 0.6);
    mk(x, S.pz + rnd(SPAWN_FAR, SPAWN_FAR + 16), { hx: 0, hz: -1, v0: walkSpeed(), laneX: null });
  }
  const m = 3 + ((R() * 5) | 0);
  for (let i = 0; i < m; i++) {
    const side = pick([-1, 1]);
    mk(side * (LV.half - 0.5), S.pz + rnd(SPAWN_FAR, SPAWN_FAR + 20), { hx: -side * 0.6, hz: pick([1, -1]) * 0.8, v0: walkSpeed(1.4), free: true, exit: true });
  }
  if (state === 'play') { addPop('SCRAMBLE', '#20e3ff', 26); Music.chirp(); }
}

// Daily and weekly runs: each piece of the crowd comes from its own seeded stream, so everyone who plays that
// run meets the same people in the same places, whatever pace they take.
export function seeded(tag, fn) {
  if (!S.seed) return fn();
  const prev = R;
  setR(mulberry32(hashStr(S.seed + tag)));
  try { return fn(); } finally { setR(prev); }
}

// Airport races: people ride the moving walkway the way they do in a real terminal. On each belt they stand on the right of the
// direction it goes and keep the left clear for walkers. Called last for a chunk so the rest of the crowd is unchanged.
function beltRiders(z0) {
  const B = beltInfo(LV.id);
  if (!raceBuild || !B || !beltHasZ(B, z0 + 0.1) || !beltHasZ(B, z0 + 3.9)) return;
  const fm = (B.fwd[0] + B.fwd[1]) / 2, rm = (B.rev[0] + B.rev[1]) / 2;
  // the belt that goes your way: standers on the right (high x), walkers on the left, walking on
  if (R() < 0.5) mk(rnd(fm + 0.4, B.fwd[1] - 0.3), z0 + rnd(0.2, 3.8), { belt: 1, v0: 0, hx: 0, hz: 1, fx: 0, fz: 1, yieldP: 0.6 });
  if (R() < 0.3) { const x = rnd(B.fwd[0] + 0.35, fm - 0.15); mk(x, z0 + rnd(0.2, 3.8), { belt: 1, hx: 0, hz: 1, v0: walkSpeed(), laneX: x }); }
  // nobody rides the belt that comes toward you: the crowd never walks the wrong way on a walkway
}

// Route zones (config/routes.js): the same rope lines and queues for everyone, placed from data, never from the random stream.
function placeRoute(z0) {
  for (const p of routePieces(LV.id, z0, z0 + 4)) {
    if (p.kind === 'rope') {
      const os = []; for (let o = -p.half; o < p.half; o += 0.4) os.push(o); os.push(p.half);
      mk(p.x, p.z, { prop: 'rope', skin: p.skin, span: p.half, circles: os.map(ox => ({ ox, oz: 0, r: 0.22 })) });
    } else mk(p.x, p.z, { v0: 0, fx: 0, fz: 1, laneX: p.x });
  }
}

export function genChunk(z0) {
  const n0 = S.people.length;
  seeded(':c' + z0, () => { genChunkInner(z0); beltRiders(z0); });
  // Ordinary airport race crowds spawn on the forward belt; preserve the random stream.
  // Explicit people and the Daily/Weekly generator keep their existing positions.
  const B = raceBuild && beltInfo(LV.id);
  if (B) for (const p of S.people.slice(n0)) {
    if (!p.prop && beltHasZ(B, p.z) && p.x > B.rev[0] && p.x <= B.rev[1]) {
      p.x -= B.rev[0] - B.fwd[0];
      if (p.laneX !== null) p.laneX -= B.rev[0] - B.fwd[0];
    }
  }
  if (raceBuild) {
    seeded(':r' + z0, () => placeRoute(z0));
    const stream = R;
    setR(mulberry32(hashStr((S.seed || LV.id) + ':sr2:' + z0)));
    try { for (const p of routePopulation(LV.id, z0, z0 + 4))
      mk(p.x, p.z, { ...p, hx: 0, hz: -1, dirz: -1, laneX: p.x, ...(p.prop ? { circles: BARRIER() } : {}) });
    } finally { setR(stream); }
  }
  if (S.race && S.race.elim) seeded(':g' + z0, () => { for (const [i, c] of S.race.elim.cps.entries()) if (c >= z0 && c < z0 + 4) mk(0, c, { prop: 'cpgate', span: LV.half - 0.5, num: i + 1, circles: [] }); });
  if (S.seed) { let sum = 0; for (let i = n0; i < S.people.length; i++) { const q = S.people[i]; sum += q.x * 7 + q.z; } S.chunkSum[z0] = Math.round(sum * 100); }
}

export function wetGrip(r,x,z,dt) {
  if(LV.id !== 'tsukiji') return 1;
  const wet=S.people.some(p=>p.wetPatch&&!p.dead&&Math.abs(x-p.x)<p.width/2&&Math.abs(z-p.z)<p.depth/2);
  r.wetSlide=wet ? .22 : Math.max(0,(r.wetSlide||0)-dt);
  return r.wetSlide > 0 ? .22 : 1;
}
