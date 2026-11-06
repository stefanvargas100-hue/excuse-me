import { Music } from '../audio/music.js';
import { DOGS, FASTSHIRTS, GEARS, HAIRS, LUGS, PANTS, SHIRTS, SHOES, SKINS, shade } from '../config/colour.js';
import { LV, SPAWN_FAR } from '../config/levels.js';
import { R_BODY, R_LUGGAGE, R_PLAYER, walkSpeed } from '../config/tuning.js';
import { R, TAU, clamp, pick, randn, rnd, sgn } from '../config/util.js';
import { ctx } from '../dom.js';
import { VY, VZ } from '../render/camera.js';
import { W3 } from '../render/draw.js';
import { LOOK } from '../save/progress.js';
import { banner } from './actions.js';
import { addPop } from './scoring.js';
import { S, state } from './state.js';



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
  dress(p);
  p.prevDz = z - (S ? S.pz : 0);
  S.people.push(p);
  return p;
}

export function makeMe() {
  const p = Object.assign({ x: 0, z: 0, vx: 0, vz: 0, phase: 0, t: 0, h: 1.76, lug: 0, lugCol: '#000000', dog: 0, phone: false, fast: false,
    rival: false, tele: false, hit: false, isMe: true, fx: 0, fz: 1, circles: [{ ox: 0, oz: 0, r: R_PLAYER }] }, LOOK);
  dress(p); return p;
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
    mk(gx, z + rnd(-0.15, 0.15), { hx: 0, hz: dir, v0: v, laneX: gx, space: 0 });
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
  } else {
    pool = [['oncoming', 5], ['walker', 3], ['pair', 2], ['phone', 1.5], ['diagonal', 2], ['luggage', 0.5]];
    if (d > 0.15) pool.push(['trio', 1], ['swerver', 1], ['speedster', 0.5]);
  }
  const type = wpick(pool), dirv = R() < 0.5 ? 1 : -1;
  switch (type) {
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
    case 'wetfloor': mk(rnd(-4, 4), z, { prop: 'wetfloor', circles: [{ ox: 0, oz: 0, r: 0.28 }] }); break;
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

export const inXing = z => { if (LV.id !== 'nyc') return false; const m = z % 90; return z >= 90 && z < LV.goal - 30 && m >= 0 && m < 12; };

// Fifth Avenue sidewalk furniture along the curb (and a few sandwich boards by the shops).
function nycProps(z0) {
  for (let z = Math.ceil(z0); z < z0 + 4; z++) {
    if (inXing(z) || inXing(z + 2) || inXing(z - 2) || z < 8) continue;
    if (z % 30 === 6) mk(-3.95, z, { prop: 'lamp', circles: [{ ox: 0, oz: 0, r: 0.14 }] });
    else if (z % 15 === 12) mk(-3.7, z, { prop: 'tree', circles: [{ ox: 0, oz: 0, r: 0.55 }] });
    else if (z % 45 === 21) mk(-3.85, z, { prop: 'trash', circles: [{ ox: 0, oz: 0, r: 0.3 }] });
    else if (z % 60 === 39) mk(-4.0, z, { prop: 'hydrant', circles: [{ ox: 0, oz: 0, r: 0.18 }] });
    else if (z % 90 === 52 && R() < 0.6) mk(-3.35, z, { prop: 'cart', circles: [{ ox: 0, oz: -0.6, r: 0.45 }, { ox: 0, oz: 0, r: 0.45 }, { ox: 0, oz: 0.6, r: 0.45 }] });
    if (z % 36 === 30 && R() < 0.6) mk(3.95, z, { prop: 'board', circles: [{ ox: 0, oz: 0, r: 0.3 }] });
  }
}

export function genChunk(z0) {
  const d = clamp(z0 / LV.goal, 0, 1);
  if (LV.id === 'nyc') nycProps(z0);
  if (inXing(z0 + 2)) return;   // the crosswalk crowds come from the signal waves instead
  const k = LV.base + (R() < 0.4 + 0.4 * d ? 1 : 0) + (d > 0.25 && R() < 0.55 ? 1 : 0) + (d > 0.6 && R() < 0.6 ? 1 : 0);
  for (let i = 0; i < k; i++) spawnUnit(z0 + R() * 4, d);
}

// Fifth Avenue: crowds wait at each corner, then pour across when the signal changes.
export function updXings() {
  for (const x of S.xings) {
    if (!x.sig && S.pz > x.z - 75) {
      x.sig = true;
      mk(-4.05, x.z - 0.8, { prop: 'signal', xing: x, circles: [{ ox: 0, oz: 0, r: 0.14 }] });
      mk(-4.05, x.z + 12.8, { prop: 'signal', xing: x, circles: [{ ox: 0, oz: 0, r: 0.14 }] });
    }
    if (!x.spawned && S.pz > x.z - (SPAWN_FAR + 2)) {
      x.spawned = true;
      const n1 = 3 + ((R() * 4) | 0), n2 = 4 + ((R() * 5) | 0), n3 = 2 + ((R() * 3) | 0);
      for (let i = 0; i < n1; i++) mk(rnd(-3.0, 3.6), x.z - rnd(0.4, 2.2), { v0: 0, hx: 0, hz: 1, fx: 0, fz: 1, wait: x });
      for (let i = 0; i < n2; i++) mk(rnd(-3.0, 3.6), x.z + 12 + rnd(0.4, 2.4), { v0: 0, hx: 0, hz: -1, fx: 0, fz: -1, wait: x });
      for (let i = 0; i < n3; i++) mk(rnd(-9.5, -6), x.z + 12 + rnd(0.5, 2.5), { v0: 0, hx: 1, hz: 0, fx: 1, fz: 0, wait: x, free: true, turnX: rnd(-2.5, 2.5), turnDir: pick([1, -1]) });
    }
    if (!x.walk && S.pz > x.z - 16) { x.walk = true; if (state === 'play') addPop('WALK', '#f4f6f8', 24); }
  }
}

// Scripted crowd moments, announced with a banner.
export function runEvent(kind) {
  const z = S.pz + rnd(SPAWN_FAR + 4, SPAWN_FAR + 14), h = LV.half;
  if (kind === 'tour') {
    const dir = R() < 0.6 ? -1 : 1, x = clamp(laneX(dir), -h + 1.8, h - 1.8), col = pick(['#ff2d3a', '#ffcf1f', '#20e3ff', '#7cff6b']);
    const L = mk(x, z, { hx: 0, hz: dir, v0: 1.0, flag: col, laneX: x, shirt: col });
    const n = 8 + ((R() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const sl = [rnd(-1.3, 1.3), -rnd(0.7, 2.8)];
      mk(clamp(x + sl[0], -h + 0.5, h - 0.5), z + sl[1] * dir, { hx: 0, hz: dir, v0: 1.0, follow: L, slot: sl, hat: R() < 0.4 ? 'cap' : 'none', gear: col, pack: R() < 0.4 ? 'pack' : 'none' });
    }
    banner('TOUR GROUP AHEAD', '#7cc4ff');
  } else if (kind === 'arrivals') {
    for (let i = 0; i < 13; i++) walker(S.pz + rnd(SPAWN_FAR, SPAWN_FAR + 28), -1, { lug: pick([-1, 1]) });
    banner('FLIGHT 212 HAS LANDED', '#ffcf1f');
  } else if (kind === 'spill') {
    const x = clamp(S.px + rnd(-1.5, 1.5), -h + 1.4, h - 1.4), sz = z - 10;
    const sp = mk(x, sz, { prop: 'spill', circles: [] }); sp.rad = 1.0;
    mk(x + (x > 0 ? -1.4 : 1.4), sz, { prop: 'wetfloor', circles: [{ ox: 0, oz: 0, r: 0.28 }] });
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
