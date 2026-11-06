(() => {
'use strict';
const $ = id => document.getElementById(id);
const cv = $('game');
let ctx = cv.getContext('2d');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
// Randomness: normal runs use Math.random; the daily run swaps in a seeded generator so everyone gets the same crowd.
let R = Math.random;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const rnd = (a = 0, b = 1) => a + R() * (b - a);
const pick = a => a[(R() * a.length) | 0];
const sgn = v => v < 0 ? -1 : 1;
const mod = (a, n) => ((a % n) + n) % n;   // modulo that stays positive behind the start line
const TAU = Math.PI * 2;
const randn = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

/* ---------- tuning ---------- */
const CEIL = 4.6;
const R_PLAYER = 0.25;          // player hitbox radius (m)
const R_BODY = 0.25;            // person body hitbox radius (m)
const R_LUGGAGE = 0.17;         // rolling suitcase hitbox radius (m)
const BASE = 3.0, BOOST = 5.4;  // player walking speeds (m/s)
const LAT_MAX = 2.4, LAT_ACC = 7.0; // held-steer top speed and acceleration: reversing takes time
const REGEN = 9;                // stamina recharge per second (0-100)
const CHAIN_WINDOW = 2.2;       // seconds to land the next pass and keep a chain
// Crowd walking speeds follow measured pedestrian data: about 1.3 m/s on average, groups slower.
const walkSpeed = (m = 1.32, sd = 0.2) => clamp(m + randn() * sd, 0.75, 2.1);

/* ---------- colour ---------- */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const scl = (c, f) => [clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f, 0, 255)];
const shade = (h, f) => { const c = scl(hex(h), f); return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; };
const INK = '#0f1b2d';
const C = {
  tileA: hex('#cdd5dc'), tileB: hex('#bfc9d2'), carA: hex('#3d5272'), carB: hex('#34486a'),
  ceil: hex('#eef2f5'), panel: hex('#ffffff'), wall: hex('#aab6c0'), glass: hex('#8cc6ea'),
  pillar: hex('#e6ebef'), shop: hex('#f1dcae'), navy: hex('#14233b'), sign: hex('#ffcf1f'), glow: hex('#fff1bf'),
  asA: hex('#3d4149'), asB: hex('#42464f'), white: hex('#e8e8e8'), yline: hex('#e0b400'), curb: hex('#a2a6ab'),
  walkA: hex('#cbc7c0'), walkB: hex('#c2beb7'), glassDark: hex('#33475b'), win: hex('#2c3a4a'),
  nightA: hex('#26242e'), nightB: hex('#2a2833'), zebra: hex('#d9d9e3'), nightWalk: hex('#3a3646'), shopNight: hex('#ffe6b0'), litWin: hex('#f7c873')
};
const SHOPFRONTS = [hex('#d9473f'), hex('#2f7de1'), hex('#2aa56a'), hex('#e58b2b'), hex('#7d56d6'), hex('#17a2a8')];
const BLD = ['#b9a58c', '#8c6f5a', '#c8c2b8', '#6f7d8c', '#a0796a', '#d8cfc0', '#56606b'];
const AWN = ['#7f1d1d', '#14532d', '#1e3a8a', '#111827'];
const NIGHTBLD = ['#1d1a2e', '#231f36', '#191726', '#26213a'];
const NEON = ['#ff3d9a', '#20e3ff', '#ffe14d', '#7cff6b', '#b26bff'];
const SHIRTS = ['#e2574c', '#2f80ed', '#27ae60', '#f2994a', '#9b51e0', '#14b8a6', '#d6336c', '#5c7cfa', '#e9c46a', '#f4f1ea', '#374151', '#9ca3af'];
const FASTSHIRTS = ['#111827', '#0ea5e9', '#f97316', '#84cc16'];
const PANTS = ['#1f2937', '#334155', '#3f3a52', '#7a6a50', '#1e3a5f', '#4b5563', '#c2b280'];
const SKINS = ['#f1c7a5', '#e2b08a', '#c68863', '#9a6440', '#6b4329'];
const HAIRS = ['#1f1a17', '#3b2a1e', '#6b4a2b', '#a37b4f', '#d9c08c', '#6b7280'];
const SHOES = ['#2b2f36', '#2b2f36', '#f4f6f8', '#7a4b2a'];
const GEARS = ['#ffcf1f', '#e2574c', '#2f80ed', '#27ae60', '#111827', '#f4f6f8'];
const LUGS = ['#c0392b', '#2c3e50', '#16a085', '#8e44ad', '#e67e22'];
const DOGS = ['#c8a165', '#3b2a1e', '#f1eadf', '#7a7a7a'];
const CARCOLS = ['#1f2937', '#e5e7eb', '#9ca3af', '#1e3a8a', '#7f1d1d', '#111827'];

const REACT = {
  airport: ['Whoa!', 'Hey!', 'Rude.', 'Watch it!', 'Excuse YOU.', 'Seriously?', 'My bag!'],
  nyc: ['Hey!', "I'm walkin' here!", 'Watch it!', 'Come ON.', 'Yo!', 'Unbelievable.'],
  shibuya: ['Sumimasen!', 'Ah!', 'Eh?!', 'Whoa!', 'Abunai!']
};
const RIVAL_LINES = ['Move.', 'Coming through.', 'Mine.', 'Outta my way.', 'Too slow.'];
const MULT_COLS = ['#ffffff', '#ffcf1f', '#ff9f43', '#ff7eb6', '#c792ff', '#7cc4ff', '#5ee6a8', '#ff2d3a'];
let vibOn = (() => { try { return localStorage.getItem('excuseme_vib') !== '0'; } catch (e) { return true; } })();
function buzz(pattern) { if (!vibOn) return; try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }

/* ---------- levels ---------- */
const LEVELS = [
  { id: 'airport', city: 'Airport', name: 'Terminal B', goal: 500, goalText: 'GATE B17', half: 7, keep: 1, fog: '#dde5ec',
    lane: 0.25, fastEvery: [2, 4.5], rivalEvery: [9, 15], base: 2,
    starScore: 15000, timerLabel: 'Boarding closes', timeFail: 'The gate closed before you got there.', events: ['tour', 'arrivals', 'spill'],
    blurb: 'Rolling suitcases, people heading for gates, and a fast lane on the right.',
    music: { bpm: 148, prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] } },
  { id: 'nyc', city: 'New York', name: 'Fifth Avenue', goal: 600, goalText: '42 ST · SUBWAY', half: 4.5, keep: 1, fog: '#dfe6ec',
    lane: 0.08, fastEvery: [3, 6], rivalEvery: [8, 13], base: 1,
    starScore: 16000, timerLabel: 'Train leaves', timeFail: 'Your train left without you.', events: ['performer', 'delivery', 'tour'],
    blurb: 'Narrow sidewalk, lamp posts, hot dog carts, tourists who stop dead, and a crowd wave at every crosswalk.',
    music: { bpm: 152, prog: [[62, 65, 69], [58, 62, 65], [53, 57, 60], [60, 64, 67]] } },
  { id: 'shibuya', city: 'Tokyo', name: 'Shibuya Crossing', goal: 360, goalText: 'HACHIKŌ EXIT', half: 11, keep: -1, fog: '#2c2545', night: true,
    lane: 0.1, fastEvery: [4, 7], rivalEvery: [7, 12], base: 1,
    starScore: 14000, timerLabel: 'Meeting in', timeFail: 'You were late for the meeting.', events: ['tour', 'selfie'],
    blurb: 'Night scramble. Crowds pour in from every side when the lights change. Tokyo keeps left.',
    music: { bpm: 158, prog: [[66, 69, 73], [62, 66, 69], [57, 61, 64], [64, 68, 71]] } }
];
for (const L of LEVELS) L.limit = Math.round(L.goal / 3.0 * 1.07 + 6);   // seconds allowed per level
let LVI = 0, LV = LEVELS[0], FOGc = hex(LV.fog), FOGCSS = LV.fog;
function setLevel(i) { LVI = i; LV = LEVELS[i]; FOGc = hex(LV.fog); FOGCSS = LV.fog; }
function mixc(c, d) {
  const t = Math.min(1, Math.pow(Math.max(0, d) / 78, 0.9));
  return `rgb(${(c[0] + (FOGc[0] - c[0]) * t) | 0},${(c[1] + (FOGc[1] - c[1]) * t) | 0},${(c[2] + (FOGc[2] - c[2]) * t) | 0})`;
}
// Nothing is drawn past DRAW_FAR (metres from the camera) and everything fades out before it. All spawns land beyond SPAWN_FAR, so people always walk into view.
const DRAW_FAR = 62, SPAWN_FAR = 66;
const fogA = dz => clamp(1.25 - dz / 70, 0.15, 1);

/* ---------- viewport and camera ---------- */
let W = 0, H = 0, DPR = 1, F = 300, HOR = 0, CX = 0;
// Third-person chase camera: behind and above the player. VX/VY/VZ is the camera position used by all drawing.
const CAM_BACK = 3.6, CAM_UP = 2.8;
let VX = 0, VZ = -CAM_BACK, VY = CAM_UP;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  F = Math.min(W * 0.85, H * 0.75);
}
window.addEventListener('resize', resize); resize();

/* ---------- look (customization) ---------- */
const LOOK_OPTS = [
  { key: 'shirt', label: 'Shirt', type: 'color', vals: ['#ffcf1f', '#e2574c', '#2f80ed', '#27ae60', '#f2994a', '#9b51e0', '#14b8a6', '#d6336c', '#111827', '#f4f1ea', { c: '#d4af37', req: 5, name: 'Gold shirt' }, { c: '#39ff14', req: 7, name: 'Neon shirt' }] },
  { key: 'pants', label: 'Pants', type: 'color', vals: ['#1e3a5f', '#1f2937', '#334155', '#4b5563', '#7a6a50', '#c2b280'] },
  { key: 'shoe', label: 'Shoes', type: 'color', vals: ['#f4f6f8', '#2b2f36', '#e2574c', '#2f80ed', '#7a4b2a', { c: '#d4af37', req: 4, name: 'Gold sneakers' }] },
  { key: 'skin', label: 'Skin', type: 'color', vals: SKINS },
  { key: 'hair', label: 'Hair colour', type: 'color', vals: HAIRS },
  { key: 'hairStyle', label: 'Hair style', type: 'chip', vals: [['short', 'Short'], ['long', 'Long'], ['bald', 'Bald'], ['mohawk', 'Mohawk', 6]] },
  { key: 'hat', label: 'Head', type: 'chip', vals: [['none', 'None'], ['cap', 'Cap'], ['beanie', 'Beanie', 1], ['headphones', 'Headphones', 2], ['crown', 'Crown', 9]] },
  { key: 'face', label: 'Face', type: 'chip', vals: [['none', 'None'], ['shades', 'Shades', 3]] },
  { key: 'pack', label: 'Back', type: 'chip', vals: [['none', 'None'], ['pack', 'Backpack'], ['jet', 'Jetpack', 8]] },
  { key: 'gear', label: 'Hat and backpack colour', type: 'color', vals: GEARS }
];
const LOOK_DEFAULT = { shirt: '#ffcf1f', pants: '#1e3a5f', shoe: '#f4f6f8', skin: '#c68863', hair: '#3b2a1e', hairStyle: 'short', hat: 'cap', face: 'none', pack: 'pack', gear: '#111827' };
let LOOK = Object.assign({}, LOOK_DEFAULT);
try { Object.assign(LOOK, JSON.parse(store.get('excuseme_look', '{}'))); } catch (e) {}

const starsOf = id => parseInt(store.get('excuseme_stars_' + id, '0'), 10) || 0;   // bitmask: 1 finish, 2 score, 4 chain
const nbits = m => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);
const totalStars = () => LEVELS.reduce((n, L) => n + nbits(starsOf(L.id)), 0);
const STAR_CHAIN = 15;
// every unlockable: [option key, value, stars needed, name]
function unlockables() {
  const out = [];
  for (const o of LOOK_OPTS) for (const v of o.vals) {
    if (o.type === 'color' && typeof v === 'object') out.push([o.key, v.c, v.req, v.name]);
    else if (o.type === 'chip' && v[2]) out.push([o.key, v[0], v[2], v[1]]);
  }
  return out;
}
function sanitizeLook() {   // drop anything still locked (for example after clearing progress)
  const have = totalStars();
  for (const [k, v, req] of unlockables()) if (LOOK[k] === v && req > have) LOOK[k] = LOOK_DEFAULT[k];
}
sanitizeLook();

/* ---------- state ---------- */
let S = null, state = 'ready', showHB = false, camBob = store.get('excuseme_bob', '1') !== '0', endShown = false;
const bestOf = id => parseInt(store.get('excuseme_best_' + id, '0'), 10) || 0;

function reset() {
  S = { px: 0, pz: 0, vx: 0, speed: BASE, energy: 100, exhausted: false, boostV: 0, step: 0, camX: 0,
        time: 0, people: [], cars: [], carT: [0, 0.6, 1.2], xings: [], waveT: 4, nextChunk: 14, shake: 0, overT: 0, live: false, clock: 0,
        fastT: 2, rivalT: 7, dodged: 0, close: 0, passed: 0, heat: 0,
        score: 0, chain: 0, bestChain: 0, lastPassT: -9, lastPass: null,
        snake: 0, sweepDir: 0, sweepCount: 0, boostPasses: 0, oncRun: 0, pops: [],
        burstT: 0, dashT: 0, dashCool: 0, dashDir: 0, flash: 0, lastDashT: -9,
        meProxy: { x: 0, z: 0, vx: 0, vz: 0, prop: null },
        slow: 0, slowT: 0, breakFlash: 0, multPrev: 1, stepN: 0,
        timeLeft: LV.limit, timeout: false, lastSec: 99, shoutCD: 0, slipT: 0, eventT: 16, rush: false, rushT: rnd(28, 40), rushSpawn: 0, banner: null };
  touches.clear(); keys.l = keys.r = false; pendingDash = null; lastBoth = -9999;
  S.me = makeMe();
  if (LV.id === 'nyc') {
    for (let z = 90; z < LV.goal - 30; z += 90) S.xings.push({ z, sig: false, spawned: false, walk: false });
    for (let i = 0; i < 9; i++) { const L = CAR_LANES[i % 3]; spawnCar(L, rnd(-5, 85)); }
  }
  while (S.nextChunk < S.pz + SPAWN_FAR) { genChunk(S.nextChunk); S.nextChunk += 4; }
}

/* ---------- input ---------- */
// Touch zones: hold the left or right half of the screen to steer (one thumb each).
// Double tap one side to dash that way. Double tap BOTH sides together to burst forward. Both cost stamina.
const ZONE = 0.5, DOUBLE_MS = 300, PAIR_MS = 110, BOTH_DOUBLE_MS = 450;
const COST_BURST = 30, COST_DASH = 20, BURST_T = 1.2, DASH_T = 0.22, DASH_V = 5.0;
const touches = new Map();
const lastTap = { L: -9999, R: -9999 };
const lastDown = { L: -9999, R: -9999 };
let lastBoth = -9999, pendingDash = null;
const keys = { l: false, r: false };
const lastKey = { l: -9999, r: -9999 };
const zoneOf = x => x < W * ZONE ? 'L' : 'R';
function onTap(z, now) {
  const other = z === 'L' ? 'R' : 'L';
  lastDown[z] = now;
  if (now - lastDown[other] < PAIR_MS) {            // both thumbs tapped together
    pendingDash = null;
    lastTap.L = lastTap.R = -9999;
    if (now - lastBoth < BOTH_DOUBLE_MS) { action('M'); lastBoth = -9999; } else lastBoth = now;
    return;
  }
  if (now - lastTap[z] < DOUBLE_MS) { pendingDash = { z, at: now + PAIR_MS }; lastTap[z] = -9999; }
  else lastTap[z] = now;
}
function action(z) {
  if (state !== 'play') return;
  if (z === 'M') tryBurst(); else tryDash(z === 'L' ? -1 : 1);
}
const POLITE = ['Oh, sorry!', 'Go ahead.', 'My bad.', 'Sure!', 'Oops, sorry.'];
// "Excuse me": up to two people just ahead of you step aside. Rivals refuse; phone zombies may not hear.
function shout() {
  if (S.shoutCD > 0) return;
  S.shoutCD = 6;
  S.me.react = { t: 0, text: 'Excuse me!', up: false };
  Music.sfx('shout'); buzz(8);
  const near = S.people.filter(p => !p.prop && !p.dead && p.z - S.pz > 0.2 && p.z - S.pz < 6 && Math.abs(p.x - S.px) < 1.6)
    .sort((a, b) => a.z - b.z).slice(0, 2);
  for (const p of near) {
    if (p.rival) { p.react = { t: 0, text: pick(['No.', 'Nope.', 'Wait your turn.']), up: false }; continue; }
    if (p.phone && R() < 0.5) { p.react = { t: 0, text: '…', up: false }; continue; }
    p.react = { t: 0, text: pick(POLITE), up: false };
    p.aside = 1.0; p.asideDir = Math.abs(p.x - S.px) > 0.15 ? sgn(p.x - S.px) : pick([-1, 1]);
  }
}
function banner(text, color) { S.banner = { text, color, t: 0 }; }
function tryBurst() {
  if (S.burstT > 0) return;
  if (S.energy < COST_BURST) { S.flash = 0.45; return; }
  S.energy -= COST_BURST; S.burstT = BURST_T; S.heat = Math.min(0.9, S.heat + 0.12); Music.sfx('dash');
}
function tryDash(dir) {
  if (S.dashT > 0 || S.dashCool > 0) return;
  if (S.energy < COST_DASH) { S.flash = 0.45; return; }
  S.energy -= COST_DASH; S.dashT = DASH_T; S.dashDir = dir; S.dashCool = 0.45; S.lastDashT = S.time; Music.sfx('dash');
}
cv.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  const z = zoneOf(e.clientX);
  touches.set(e.pointerId, z);
  swipes.set(e.pointerId, { y: e.clientY, t: performance.now(), done: false });
  onTap(z, performance.now());
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  e.preventDefault();
});
const swipes = new Map();   // pointerId -> start point, for swipe-up
cv.addEventListener('pointermove', e => {
  const sw = swipes.get(e.pointerId);
  if (!sw || sw.done || state !== 'play') return;
  if (sw.y - e.clientY > 50 && performance.now() - sw.t < 450) { sw.done = true; shout(); }
});
const up = e => { touches.delete(e.pointerId); swipes.delete(e.pointerId); };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase(), now = performance.now();
  const isL = k === 'arrowleft' || k === 'a', isR = k === 'arrowright' || k === 'd';
  if (isL) { keys.l = true; if (!e.repeat) { if (now - lastKey.l < DOUBLE_MS) action('L'); lastKey.l = now; } }
  if (isR) { keys.r = true; if (!e.repeat) { if (now - lastKey.r < DOUBLE_MS) action('R'); lastKey.r = now; } }
  if ((k === 'arrowup' || k === 'w' || k === ' ') && !e.repeat) action('M');
  if (k === 'e' && !e.repeat && state === 'play') shout();
  if (state === 'play' && (k === ' ' || k.startsWith('arrow'))) e.preventDefault();
});
window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.l = false;
  if (k === 'arrowright' || k === 'd') keys.r = false;
});

/* ---------- people ---------- */
function dress(p) {
  p.bald = p.hairStyle === 'bald' || p.hairStyle === 'mohawk';
  p.shirtL = shade(p.shirt, 1.2); p.shirtD = shade(p.shirt, 0.6);
  p.pantsL = shade(p.pants, 1.35); p.pantsD = shade(p.pants, 0.6);
  p.skinL = shade(p.skin, 1.1); p.skinD = shade(p.skin, 0.7);
  p.hairL = shade(p.hair, 1.6);
  p.shoeL = shade(p.shoe, 1.2); p.shoeD = shade(p.shoe, 0.55);
  p.gearL = shade(p.gear, 1.3); p.gearD = shade(p.gear, 0.6);
  p.lugL = shade(p.lugCol, 1.3); p.lugD = shade(p.lugCol, 0.65);
}
function mk(x, z, o) {
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
function makeMe() {
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
function walker(z, dir, o) {
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
function spawnFast(behind, zOverride) {
  const z = zOverride !== undefined ? zOverride : (behind ? S.pz - rnd(9, 14) : S.pz + rnd(25, 50));
  const x = LV.id === 'airport' ? LV.keep * rnd(2.2, LV.half - 0.8) : laneX(1);
  mk(x, z, { fast: true, shirt: pick(FASTSHIRTS), hx: 0, hz: 1, v0: rnd(3.5, 4.7), yieldP: 0.65, space: 0, laneX: x });
}
// Rivals pull level or ahead, spot your lane, cut across, then brake in front of you.
function spawnRival() {
  const behind = R() < 0.5, side = R() < 0.5 ? -1 : 1;
  const x = clamp(S.px + side * rnd(1.8, 2.8), -LV.half + 0.6, LV.half - 0.6);
  mk(x, behind ? S.pz - rnd(5, 8) : S.pz + rnd(SPAWN_FAR, SPAWN_FAR + 6), {
    rival: true, fast: true, shirt: '#c1121f', pants: '#111827', hx: 0, hz: 1, v0: behind ? rnd(4.3, 4.8) : rnd(2.3, 2.7), yieldP: 0, space: 0
  });
}
const inXing = z => { if (LV.id !== 'nyc') return false; const m = z % 90; return z >= 90 && z < LV.goal - 30 && m >= 0 && m < 12; };
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
function genChunk(z0) {
  const d = clamp(z0 / LV.goal, 0, 1);
  if (LV.id === 'nyc') nycProps(z0);
  if (inXing(z0 + 2)) return;   // the crosswalk crowds come from the signal waves instead
  const k = LV.base + (R() < 0.4 + 0.4 * d ? 1 : 0) + (d > 0.25 && R() < 0.55 ? 1 : 0) + (d > 0.6 && R() < 0.6 ? 1 : 0);
  for (let i = 0; i < k; i++) spawnUnit(z0 + R() * 4, d);
}
// Fifth Avenue: crowds wait at each corner, then pour across when the signal changes.
function updXings() {
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
function runEvent(kind) {
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
function scramble() {
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

/* ---------- crowd behaviour ----------
   Based on pedestrian-dynamics research: people anticipate collisions a couple of seconds ahead
   and sidestep, prefer their culture's keep side when meeting someone head on (which makes lanes form),
   brake behind slower walkers, and walk side by side in groups. */
function behaviours(p, dt) {
  if (p.follow) {
    const L = p.follow;
    if (L.dead || L.z < S.pz - 15) p.follow = null;
    else {
      const ex = L.x + p.slot[0] - p.x, ez = L.z + p.slot[1] * L.dirz - p.z, el = Math.hypot(ex, ez);
      if (el > 0.3) { p.hx = ex / el; p.hz = ez / el; p.v0 = L.v0 * clamp(0.7 + el * 0.25, 0.7, 1.5); } else { p.hx = L.hx; p.hz = L.hz; p.v0 = L.v0 * 0.9; }
    }
  }
  if (p.dance) { p.phase += dt * 5; if (R() < dt * 0.3) p.react = { t: 0, text: pick(['♪', 'Tips welcome!', 'Showtime!']), up: false }; }
  if (p.wave) { const a = Math.sin(p.t * 0.8 + p.ph) * p.wave; p.hx = Math.sin(a); p.hz = Math.cos(a) * p.dirz; }
  if (p.swerve) {
    const dz = p.z - S.pz;
    if (!p.swFired) {
      if (!p.tele && dz < p.swAt + 3 && dz > 0) { p.tele = true; p.swDir = R() < 0.7 ? (Math.sign(S.px - p.x) || 1) : pick([-1, 1]); }
      if (p.tele && dz < p.swAt) { p.swFired = true; p.tele = false; p.locked = true; p.vx = p.swDir * 1.8; p.swT = 1.0; }
    } else if (p.swT > 0) { p.swT -= dt; if (p.swT <= 0) { p.locked = false; } }
  }
  if (p.rival) {
    const dz = p.z - S.pz, dx = S.px - p.x;
    p.cool -= dt;
    if (p.rs === 'cruise') {
      if (dz > 1.2 && dz < 5.5 && Math.abs(dx) < 3.0 && p.cool <= 0 && p.cuts < 2 && state === 'play') { p.rs = 'tele'; p.rt = 0.5; p.swDir = sgn(dx); p.tele = true; p.react = { t: 0, text: pick(RIVAL_LINES), up: false }; }
    } else if (p.rs === 'tele') {
      p.rt -= dt; p.swDir = sgn(dx);
      if (p.rt <= 0) { p.rs = 'cut'; p.rt = 1.3; p.tele = false; p.cuts++; p.locked = true; }
    } else if (p.rs === 'cut') {
      const ex = S.px + S.vx * 0.35 - p.x;
      p.vx = clamp(ex * 3, -2.4, 2.4);
      p.vz += (1.0 - p.vz) * Math.min(1, dt * 2.2);
      p.rt -= dt;
      if (p.rt <= 0 || Math.abs(ex) < 0.08) { p.rs = 'cruise'; p.locked = false; p.v0 = 1.0; p.hx = 0; p.hz = 1; p.cool = 1.6; p.cutDone = true; }
    }
  }
  if (p.photo > 0 && Math.abs(p.z - S.pz) < 30) {        // tourist stops dead for a photo
    p.photo -= dt;
    if (p.photo <= 0) { p.stopT = rnd(2, 3.2); p.v0save = p.v0; p.v0 = 0; p.phone = true; p.faceTo = [1, 0]; }
  }
  if (p.stopT > 0) { p.stopT -= dt; if (p.stopT <= 0) { p.v0 = p.v0save; p.phone = false; p.faceTo = null; p.photo = -1; } }
  if (p.wait && p.wait.walk && p.v0 === 0) { p.v0 = walkSpeed(1.25, 0.18); p.laneX = p.turnX === null ? p.x : null; p.wait = null; }
  if (p.turnX !== null && !p.wait && sgn(p.hx) * (p.x - p.turnX) >= 0) { p.hx = 0; p.hz = p.turnDir; p.dirz = p.turnDir; p.turnX = null; p.free = false; p.laneX = p.x; }
}
function updPeople(dt) {
  const ppl = S.people, n = ppl.length, me = S.meProxy;
  me.x = S.px; me.z = S.pz; me.vx = state === 'play' ? S.vx : 0; me.vz = state === 'play' ? S.speed : 0;
  const lim = LV.half - 0.35, wallLim = LV.half - 0.75;
  for (let i = 0; i < n; i++) {
    const p = ppl[i];
    if (p.prop || p.dead) continue;
    p.t += dt;
    behaviours(p, dt);
    if (p.react) { p.react.t += dt; if (p.react.t > 1.4) p.react = null; }
    if (!p.locked && p.v0 > 0) {
      let ax = 0, az = 0, slow = 0;
      const rgX = p.hz, rgZ = -p.hx;   // right-hand side of the walking direction
      for (let j = 0; j <= n; j++) {
        const q = j < n ? ppl[j] : me;
        if (q === p || q.dead) continue;
        const rx = q.x - p.x, rz = q.z - p.z;
        if (rx > 4 || rx < -4 || rz > 7 || rz < -7) continue;
        if (rx * p.hx + rz * p.hz < -0.2) continue;               // people mostly ignore what's behind them
        const ux = q.vx - p.vx, uz = q.vz - p.vz, uu = ux * ux + uz * uz;
        let t = uu > 1e-4 ? -(rx * ux + rz * uz) / uu : 0;
        if (t > 3) continue;
        if (t < 0) t = 0;
        const cx = rx + ux * t, cz = rz + uz * t;
        const reach = (q.prop ? q.rad : 0.25) + 0.25 + p.space + 0.3;
        const dmin = Math.hypot(cx, cz);
        if (dmin >= reach) continue;
        let w = (1 - t / 3) * (reach - dmin) / reach;
        if (j === n) w *= p.yieldP;
        let nx = -cx, nz = -cz, nl = dmin;
        if (nl < 0.05) { nx = rgX; nz = rgZ; nl = 1; }
        ax += nx / nl * w; az += nz / nl * w;
        if (!q.prop && q.vx * p.hx + q.vz * p.hz < -0.3) { ax += rgX * LV.keep * w * 0.6; az += rgZ * LV.keep * w * 0.6; }
        if (t < 1.2) slow = Math.max(slow, w);
      }
      const along = 1 - 0.7 * Math.min(1, slow);
      let dvx = p.hx * p.v0 * along + ax * 1.9, dvz = p.hz * p.v0 * along + az * 1.9;
      if (p.aside > 0) { dvx += p.asideDir * 1.8; dvz *= 0.5; }
      if (p.laneX !== null && LV.lane) dvx += clamp(p.laneX - p.x, -1, 1) * LV.lane;
      if (!p.free) { if (p.x > wallLim) dvx -= (p.x - wallLim) * 3; if (p.x < -wallLim) dvx += (-wallLim - p.x) * 3; }
      const rel = Math.min(1, dt * 2.6);
      p.vx += (dvx - p.vx) * rel; p.vz += (dvz - p.vz) * rel;
      const sp = Math.hypot(p.vx, p.vz), cap = p.v0 * 1.35 + 0.2;
      if (sp > cap) { p.vx *= cap / sp; p.vz *= cap / sp; }
    } else if (!p.locked) {
      if (p.aside > 0) p.vx += (p.asideDir * 1.3 - p.vx) * Math.min(1, dt * 5);
      else { const k = Math.max(0, 1 - dt * 6); p.vx *= k; p.vz *= k; }
    }
    if (p.aside > 0) p.aside -= dt;
    p.x += p.vx * dt; p.z += p.vz * dt;
    if (!p.free && Math.abs(p.x) > lim) { p.x = clamp(p.x, -lim, lim); if (p.locked) p.vx = 0; }
    if (p.exit && Math.abs(p.x) > (LV.id === 'shibuya' ? 14.5 : LV.half + 0.2)) p.dead = true;
    if (p.z > LV.goal - 1.5 && p.hz > 0) { p.hz = -p.hz; p.dirz = -1; }
    const sp = Math.hypot(p.vx, p.vz);
    let tx = null, tz = null;
    if (p.faceTo) { tx = p.faceTo[0]; tz = p.faceTo[1]; } else if (sp > 0.15) { tx = p.vx / sp; tz = p.vz / sp; }
    if (tx !== null) {  // turn the body smoothly toward where they walk
      const kk = Math.min(1, dt * 6);
      p.fx += (tx - p.fx) * kk; p.fz += (tz - p.fz) * kk;
      const nn = Math.hypot(p.fx, p.fz) || 1; p.fx /= nn; p.fz /= nn;
    }
    p.phase += dt * (sp > 0.15 ? 2.2 + sp * 2.6 : 0);
    p.walkA = (p.walkA || 0) + ((sp > 0.15 ? 1 : 0) - (p.walkA || 0)) * Math.min(1, dt * 8);
    if (p.fadeT !== undefined) { p.fadeT += dt; if (p.fadeT >= 0.9) delete p.fadeT; }
  }
}
function updMe(dt) {
  const m = S.me, live = state === 'play';
  m.x = S.px; m.z = S.pz; m.vx = live ? S.vx : 0; m.vz = live ? S.speed : 0;
  const sp = Math.hypot(m.vx, m.vz);
  if (sp > 0.15) {
    const kk = Math.min(1, dt * 8);
    m.fx += (m.vx / sp - m.fx) * kk; m.fz += (m.vz / sp - m.fz) * kk;
    const nn = Math.hypot(m.fx, m.fz) || 1; m.fx /= nn; m.fz /= nn;
  }
  m.phase += dt * (sp > 0.15 ? 2.2 + sp * 2.0 : 0);
  m.walkA = (m.walkA || 0) + ((sp > 0.15 ? 1 : 0) - (m.walkA || 0)) * Math.min(1, dt * 8);
  if (m.react) { m.react.t += dt; if (m.react.t > 1.4) m.react = null; }
}
function collide() {
  for (const p of S.people) {
    if (p.dead) continue;
    const dz0 = p.z - S.pz;
    if (dz0 > 3 || dz0 < -3) continue;
    for (const c of p.circles) {
      const dx = p.x + c.ox - S.px, dz = p.z + (c.oz || 0) - S.pz, rr = R_PLAYER + c.r;
      if (dx * dx + dz * dz < rr * rr) return p;
    }
  }
  return null;
}

/* ---------- traffic (Fifth Avenue, visual only) ---------- */
const CAR_LANES = [{ x: -6.4, dir: -1, idx: 0 }, { x: -9.4, dir: -1, idx: 1 }, { x: -12.4, dir: 1, idx: 2 }];
function spawnCar(L, z) {
  const taxi = R() < 0.45;
  S.cars.push({ x: L.x + rnd(-0.2, 0.2), z, v: L.dir * rnd(7, 11), col: hex(taxi ? '#f2c200' : pick(CARCOLS)), taxi, front: L.dir < 0 });
}
function updCars(dt) {
  if (LV.id !== 'nyc') return;
  for (const c of S.cars) c.z += c.v * dt;
  S.cars = S.cars.filter(c => c.z > S.pz - 20 && c.z < S.pz + 110);
  for (const L of CAR_LANES) {
    S.carT[L.idx] -= dt;
    if (S.carT[L.idx] <= 0) { spawnCar(L, L.dir < 0 ? S.pz + 100 : S.pz - 15); S.carT[L.idx] = rnd(1.4, 3.4); }
  }
}

/* ---------- scoring ---------- */
function addPop(text, color, size) {
  S.pops.push({ text, color, size, t: 0 });
  if (S.pops.length > 6) S.pops.shift();
}
function onPass(p) {
  if (p.prop) return;
  const dx = p.x - S.px;
  if (Math.abs(dx) > 2.6) return;            // only people you actually walked past
  let gap = Infinity;
  for (const c of p.circles) gap = Math.min(gap, Math.abs(p.x + c.ox - S.px) - R_PLAYER - c.r);
  const side = dx > 0 ? 1 : -1, now = S.time;
  if (now - S.lastPassT > CHAIN_WINDOW) { S.chain = 0; S.snake = 0; S.oncRun = 0; }
  const prev = S.chain > 0 ? S.lastPass : null;
  S.chain++; S.passed++; S.bestChain = Math.max(S.bestChain, S.chain);
  const mult = Math.min(8, 1 + Math.floor(S.chain / 3));
  let pts = 10, sound = null;
  const tags = [];
  if (gap < 0.15) { pts += 50; S.close++; tags.push(['RAZOR', '#ff4d4f']); S.heat = Math.min(0.9, S.heat + 0.45); sound = 'razor'; }
  else if (gap < 0.4) { pts += 25; S.close++; tags.push(['CLOSE', '#ffcf1f']); S.heat = Math.min(0.9, S.heat + 0.3); sound = 'whoosh'; }
  if (prev && now - prev.t < 0.35 && prev.side !== side && Math.abs(dx) < 1.2 && prev.adx < 1.2) { pts += 150; tags.push(['THREAD THE NEEDLE', '#5ee6a8']); }
  S.snake = prev && prev.side !== side ? S.snake + 1 : 1;
  if (S.snake >= 3) { pts += 40 * (S.snake - 1); tags.push([S.snake === 3 ? 'SNAKE' : 'SNAKE ×' + S.snake, '#7cc4ff']); }
  const dir = Math.abs(S.vx) > 0.8 ? sgn(S.vx) : 0;
  if (dir && dir === S.sweepDir) S.sweepCount++; else { S.sweepDir = dir; S.sweepCount = dir ? 1 : 0; }
  if (S.sweepCount === 3) { pts += 150; tags.push([dir < 0 ? 'SWEEP LEFT' : 'SWEEP RIGHT', '#ff9f43']); }
  if (S.sweepCount === 5) { pts += 300; tags.push(['MEGA SWEEP', '#ff9f43']); }
  if (S.boostV > 0.5) { S.boostPasses++; if (S.boostPasses === 3) { pts += 120; tags.push(['BULLET TRAIN', '#c792ff']); } }
  if (now - S.lastDashT < 0.6) { pts += 80; tags.push(['JUKE', '#ffd166']); }
  if (p.fast && !p.rival && p.vz > 3) { pts += 60; tags.push(['SLIPSTREAM', '#8be9fd']); }
  if (p.vz < -0.3) { S.oncRun++; if (S.oncRun === 5) { pts += 150; tags.push(['SALMON RUN', '#ff7eb6']); } } else S.oncRun = 0;
  if (p.rival) {
    if (p.cutDone) { pts += 250; S.dodged++; tags.push(['RIVAL BURNED', '#ff2d3a']); }
    else { pts += 80; tags.push(['RIVAL PASSED', '#ff2d3a']); }
  }
  const total = pts * mult;
  S.score += total;
  for (const t of tags) addPop(t[0], t[1], 30);
  addPop('+' + total + (mult > 1 ? '  ×' + mult : ''), '#ffffff', 22);
  if (sound) Music.sfx(sound);
  else if (tags.length) Music.sfx('combo');
  S.lastPassT = now; S.lastPass = { t: now, side, adx: Math.abs(dx) };
  // near-miss slow motion on the riskiest passes
  if (gap < 0.15 || tags.some(t => t[0] === 'THREAD THE NEEDLE')) { S.slowT = 0.55; Music.sfx('slow'); }
  if (gap < 0.15) buzz(30); else if (gap < 0.4) buzz(12);
  // the person you brushed past reacts
  if (gap < 0.4 && !p.rival) {
    p.react = { t: 0, text: pick(REACT[LV.id]), up: R() < 0.65 };
    if (!p.locked) p.vx += sgn(p.x - S.px) * 0.7;
  }
  if (mult > S.multPrev) { addPop('×' + mult + ' MULTIPLIER', MULT_COLS[mult - 1], 26); buzz([10, 30, 10]); }
  S.multPrev = mult;
}

/* ---------- simulation ---------- */
function movePlayer(dt) {
  let steer = 0;
  for (const z of touches.values()) steer += z === 'L' ? -1 : 1;
  if (keys.l) steer -= 1;
  if (keys.r) steer += 1;
  steer = clamp(steer, -1, 1);
  S.shoutCD = Math.max(0, S.shoutCD - dt);
  if (S.slipT > 0) { S.slipT -= dt; steer = 0; }
  if (S.tut) S.tutHold = steer > 0 ? Math.max(0, S.tutHold) + dt : steer < 0 ? Math.min(0, S.tutHold) - dt : 0;
  S.burstT -= dt; S.dashT -= dt; S.dashCool -= dt; S.flash -= dt;
  const bursting = S.burstT > 0;
  if (!bursting && S.dashT <= 0) S.energy = Math.min(100, S.energy + REGEN * dt);
  S.exhausted = S.energy < COST_DASH || S.flash > 0;
  S.boostV += ((bursting ? 1 : 0) - S.boostV) * Math.min(1, dt * 8);
  if (S.boostV < 0.2) S.boostPasses = 0;
  const weave = 1 - 0.14 * Math.min(1.4, Math.abs(S.vx) / LAT_MAX);   // weaving costs a little forward speed
  S.speed += ((bursting ? BOOST : BASE) * weave - S.speed) * Math.min(1, dt * 5);
  if (S.dashT > 0) S.vx = S.dashDir * DASH_V;
  else if (S.slipT > 0) S.vx *= Math.max(0, 1 - dt * 0.4);   // sliding: no grip
  else {
    const acc = Math.abs(S.vx) > LAT_MAX ? LAT_ACC * 2.2 : LAT_ACC;   // shed dash speed quickly
    S.vx += clamp(steer * LAT_MAX - S.vx, -acc * dt, acc * dt);
  }
  if (S.sweepDir && S.vx * S.sweepDir < 0.3) { S.sweepDir = 0; S.sweepCount = 0; }
  S.px += S.vx * dt;
  const lim = LV.half - 0.5;
  if (Math.abs(S.px) > lim) { S.px = clamp(S.px, -lim, lim); S.vx = 0; }
  S.pz += S.speed * dt;
  const sn = Math.floor(S.step / Math.PI);
  if (sn !== S.stepN) { S.stepN = sn; Music.sfx('step'); }
  S.score += S.speed * dt;   // 1 point per metre walked
  S.step += S.speed * dt * 2.1;
}
function tick(dt) {
  S.clock += dt;
  for (const q of S.pops) q.t += dt;
  if (S.banner) { S.banner.t += dt; if (S.banner.t > 2.4) S.banner = null; }
  S.pops = S.pops.filter(q => q.t < 1.3);
  S.camX += (S.px - S.camX) * (1 - Math.exp(-dt * 5));
  updMe(dt);
  updCars(dt);
  if (state === 'play') {
    S.time += dt;
    if (pendingDash && performance.now() >= pendingDash.at) { action(pendingDash.z); pendingDash = null; }
    movePlayer(dt);
    S.me.x = S.px; S.me.z = S.pz;
    if (S.tut) {
      tutTick(dt);
      if (S.tut) { updPeople(dt); S.people = S.people.filter(p => !p.dead && p.z > S.pz - 16); return; }
    }
    while (S.nextChunk < S.pz + SPAWN_FAR && S.nextChunk < LV.goal - 15) { genChunk(S.nextChunk); S.nextChunk += 4; }
    const prog = clamp(S.pz / LV.goal, 0, 1);
    S.fastT -= dt;
    if (S.fastT <= 0) { spawnFast(true); if (R() < 0.3) spawnFast(true); S.fastT = rnd(LV.fastEvery[0], LV.fastEvery[1]) * (1.3 - 0.6 * prog); }
    S.rivalT -= dt;
    if (S.rivalT <= 0 && S.pz > 25 && S.pz < LV.goal - 40) { spawnRival(); S.rivalT = rnd(LV.rivalEvery[0], LV.rivalEvery[1]) * (1.2 - 0.5 * prog); }
    if (LV.id === 'nyc') updXings();
    // clock
    S.timeLeft -= dt;
    const sec = Math.ceil(S.timeLeft);
    if (sec !== S.lastSec) { S.lastSec = sec; if (sec <= 10 && sec > 0) { Music.sfx('tick'); if (sec <= 5) buzz(6); } }
    if (S.timeLeft <= 0) { loseTime(); return; }
    // scripted crowd moments
    S.eventT -= dt;
    if (S.eventT <= 0 && S.pz < LV.goal - 60) { runEvent(pick(LV.events)); S.eventT = rnd(16, 24); }
    // rush hour surges
    if (S.pz < LV.goal - 50) {
      S.rushT -= dt;
      if (S.rushT <= 0) {
        if (!S.rush) { S.rush = true; S.rushT = 10; banner('RUSH HOUR', '#ff9f43'); Music.sfx('combo'); }
        else { S.rush = false; S.rushT = rnd(28, 40); banner('CROWD THINNING', '#5ee6a8'); }
      }
      if (S.rush) {
        S.rushSpawn -= dt; S.heat = Math.max(S.heat, 0.3);
        if (S.rushSpawn <= 0) { S.rushSpawn = 0.45; walker(S.pz + rnd(SPAWN_FAR, SPAWN_FAR + 14), R() < 0.7 ? -1 : 1); }
      }
    }
    for (const p of S.people) if (p.prop === 'spill' && !p.slipped && Math.hypot(S.px - p.x, (S.pz - p.z) * 0.8) < 1.0) { p.slipped = true; S.slipT = 0.7; addPop('SLIPPERY!', '#c8a165', 26); buzz([10, 20, 10]); }
    if (LV.id === 'shibuya') { S.waveT -= dt; if (S.waveT <= 0 && S.pz < LV.goal - 60) { scramble(); S.waveT = rnd(8, 11); } }
    updPeople(dt);
    S.people = S.people.filter(p => !p.dead && p.z > S.pz - 16);
    const hit = collide();
    if (hit) { lose(hit); return; }
    for (const p of S.people) {
      const dz = p.z - S.pz;
      if (!p.passed && p.prevDz > 0 && dz <= 0) { p.passed = true; onPass(p); }
      p.prevDz = dz;
    }
    if (S.chain > 0 && S.time - S.lastPassT > CHAIN_WINDOW) {
      if (S.chain >= 3) { S.breakFlash = 0.35; addPop('CHAIN OF ' + S.chain + ' ENDED', '#9ca3af', 17); }
      S.chain = 0; S.snake = 0; S.oncRun = 0; S.multPrev = 1;
    }
    S.heat = Math.max(0, S.heat - dt * 0.16);
    const mult = Math.min(8, 1 + Math.floor(S.chain / 3));
    Music.target(clamp(0.15 + (mult - 1) * 0.12 + S.heat + (S.timeLeft < 15 ? 0.3 : 0), 0, 1));
    if (S.pz >= LV.goal) win();
  } else if (state === 'ready') {
    updPeople(dt);
    S.people = S.people.filter(p => !p.dead);
  } else {
    S.shake = Math.max(0, S.shake - dt * 3);
    S.overT += dt;
    if (!endShown && S.overT > (state === 'won' ? 0.5 : 0.8)) showEnd();
  }
}
function recordBest() {
  S.score = Math.floor(S.score);
  if (S.daily) {
    const k = 'excuseme_daily_' + S.dailyKey, b = parseInt(store.get(k, '0'), 10) || 0;
    S.newBest = S.score > b; if (S.newBest) store.set(k, String(S.score));
    S.newStars = 0; S.unlocked = [];
    return;
  }
  const b = bestOf(LV.id);
  S.newBest = S.score > b;
  if (S.newBest) store.set('excuseme_best_' + LV.id, String(S.score));
  // stars: finish, score target, chain of 15
  const before = totalStars(), old = starsOf(LV.id);
  const mask = (state === 'won' ? 1 : 0) | (S.score >= LV.starScore ? 2 : 0) | (S.bestChain >= STAR_CHAIN ? 4 : 0);
  store.set('excuseme_stars_' + LV.id, String(old | mask));
  S.newStars = mask & ~old;
  const after = totalStars();
  S.unlocked = unlockables().filter(u => u[2] > before && u[2] <= after).map(u => u[3]);
}
function lose(p) { state = 'over'; S.live = false; p.hit = true; S.shake = 1; S.overT = 0; touches.clear(); Music.sfx('bump'); Music.stop(); Music.ambStop(); buzz([60, 40, 140]); recordBest(); }
function loseTime() {
  state = 'over'; S.live = false; S.timeout = true; S.shake = 0.4; S.overT = 0; touches.clear();
  Music.sfx('bump'); Music.stop(); Music.ambStop(); buzz([100, 60, 100]); recordBest();
}
function win() {
  state = 'won'; S.live = false; S.overT = 0; S.pz = LV.goal; touches.clear();
  S.timeBonus = Math.max(0, Math.round(S.timeLeft * 15));
  S.score += 1000 + S.timeBonus;
  Music.sfx('win'); Music.stop(); Music.ambStop(); buzz([20, 60, 20, 60, 80]);
  recordBest();
}
const fmt = n => Math.floor(n).toLocaleString('en-US');
function showEnd() {
  endShown = true;
  const won = state === 'won';
  $('endEyebrow').textContent = LV.city + ' · ' + LV.name;
  const t = $('endTitle'); t.textContent = won ? 'Made it' : S.timeout ? 'Too late' : 'Bump'; t.className = won ? 'good' : 'bad';
  $('endLead').textContent = won
    ? 'You reached ' + LV.goalText + ' in ' + Math.floor(S.time / 60) + ':' + String(Math.floor(S.time % 60)).padStart(2, '0') + ' without touching anyone. Finish bonus 1,000, time bonus ' + fmt(S.timeBonus) + '.'
    : S.timeout ? LV.timeFail + ' You were ' + Math.max(0, LV.goal - Math.floor(S.pz)) + ' m short of ' + LV.goalText + '.'
    : 'You walked into ' + (S.people.some(p => p.hit && p.prop) ? 'something' : 'someone') + ' ' + Math.max(0, LV.goal - Math.floor(S.pz)) + ' m short of ' + LV.goalText + '.';
  $('sScoreLabel').textContent = S.newBest ? 'Score · new best' : 'Score';
  $('sScore').textContent = fmt(S.score);
  $('sBest').textContent = fmt(S.daily ? (parseInt(store.get('excuseme_daily_' + S.dailyKey, '0'), 10) || 0) : bestOf(LV.id));
  $('sDist').textContent = Math.floor(S.pz) + ' m';
  $('sChain').textContent = S.bestChain;
  $('sClose').textContent = S.close;
  $('sPassed').textContent = S.passed;
  $('sRival').textContent = S.dodged;
  // stars and unlocks
  const have = S.daily ? 0 : starsOf(LV.id), sb = $('endStars');
  sb.hidden = !!S.daily;
  if (!S.daily) {
    const labels = ['Reach ' + LV.goalText, 'Score ' + fmt(LV.starScore), 'Chain of ' + STAR_CHAIN];
    sb.innerHTML = '';
    labels.forEach((t, i) => {
      const d = document.createElement('div'); const bit = 1 << i;
      d.className = 'star' + (have & bit ? ' on' : '') + (S.newStars & bit ? ' new' : '');
      d.innerHTML = '<b>★</b>'; const sp = document.createElement('span'); sp.textContent = t; d.appendChild(sp);
      sb.appendChild(d);
    });
  }
  const un = $('unlockNote');
  if (S.unlocked && S.unlocked.length) { un.hidden = false; un.textContent = 'Unlocked: ' + S.unlocked.join(', ') + '. Try it in Change look.'; } else un.hidden = true;
  if (S.daily) { $('endEyebrow').textContent = 'Daily run · ' + S.dailyKey + ' · ' + LV.name; }
  const nx = $('next');
  if (won && !S.daily && LVI < LEVELS.length - 1) { nx.hidden = false; nx.textContent = 'Next: ' + LEVELS[LVI + 1].name; } else nx.hidden = true;
  $('again').textContent = won ? 'Play again' : 'Try again';
  $('again').className = won && !S.daily && LVI < LEVELS.length - 1 ? 'ghost' : 'big';
  $('end').hidden = false;
}
let lastDaily = false;
function startDaily() { const key = todayKey(); setLevel(hashStr(key + ':level') % LEVELS.length); start(true); }
function start(daily) {
  daily = daily === true;
  lastDaily = daily;
  R = daily ? mulberry32(hashStr(todayKey())) : Math.random;
  reset();
  S.daily = daily; S.dailyKey = todayKey(); for (const k in last) last[k] = k === 'low' ? null : -1; S.live = true; state = 'play'; endShown = false;
  $('start').hidden = true; $('end').hidden = true; $('look').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
  const hb = $('hud').getBoundingClientRect ? $('hud').getBoundingClientRect() : null;
  radarTop = hb && hb.bottom ? hb.bottom + 6 : 120;
  if (LV.id === 'shibuya') { S.waveT = 1.5; }
  if (!daily && store.get('excuseme_tut', '0') !== '1') beginTut();
  Music.start(LV.music); Music.ambStart(LV.id);
}
function pauseGame() {
  if (state !== 'play') return;
  state = 'paused'; touches.clear(); Music.suspend();
  $('pauseEyebrow').textContent = LV.city + ' · ' + LV.name + ' · ' + Math.floor(S.pz) + ' m';
  $('pause').hidden = false;
}
function resumeGame() { if (state !== 'paused') return; $('pause').hidden = true; state = 'play'; Music.resume(); }
/* ---------- first-run tutorial ---------- */
const TUT = [
  { text: 'Hold the RIGHT side of the screen to steer right.', zone: 'R', done: () => S.tutHold > 0.6 },
  { text: 'Now hold the LEFT side to steer left.', zone: 'L', done: () => S.tutHold < -0.6 },
  { text: 'Double tap one side to DASH sideways.', zone: 'LR', done: () => S.dashT > 0 },
  { text: 'Double tap BOTH sides at the same time to BURST forward.', zone: 'both', done: () => S.burstT > 0 },
  { text: 'Swipe up to say "Excuse me". The person ahead steps aside.', zone: null, done: () => S.shoutCD > 0 },
  { text: "That's it. Pass people for points and don't touch anyone. Go!", zone: null, done: () => S.tut.t > 2.6 }
];
function beginTut() {
  S.tut = { step: 0, t: 0 }; S.tutHold = 0;
  S.people = S.people.filter(p => p.prop);
  $('tut').hidden = false; tutUI();
}
function tutUI() { $('tutStep').textContent = 'Tutorial ' + (S.tut.step + 1) + ' / ' + TUT.length; $('tutText').textContent = TUT[S.tut.step].text; }
function tutTick(dt) {
  S.tut.t += dt;
  if (S.tut.t > 0.4 && TUT[S.tut.step].done()) {
    S.tut.step++; S.tut.t = 0; S.tutHold = 0; Music.sfx('combo'); buzz(10);
    if (S.tut.step >= TUT.length) { endTut(); return; }
    if (S.tut.step === 4) mk(S.px, S.pz + 9, { hx: 0, hz: 1, v0: 1.0, laneX: S.px, fadeT: 0 });
    tutUI();
  }
}
function endTut() {
  S.tut = null; store.set('excuseme_tut', '1'); $('tut').hidden = true;
  S.nextChunk = Math.ceil((S.pz + 22) / 4) * 4;
  const before = new Set(S.people);
  while (S.nextChunk < S.pz + SPAWN_FAR && S.nextChunk < LV.goal - 15) { genChunk(S.nextChunk); S.nextChunk += 4; }
  for (const p of S.people) if (!before.has(p) && !p.prop && p.z - S.pz < SPAWN_FAR - 2) p.fadeT = 0;
  S.timeLeft = LV.limit; S.eventT = 16; S.rivalT = 8; S.fastT = 3; S.rushT = rnd(28, 40);
  if (LV.id === 'nyc') for (const x of S.xings) if (x.z < S.pz + 20) { x.sig = x.spawned = x.walk = true; }
}
function toMenu() {
  R = Math.random; $('tut').hidden = true;
  $('pause').hidden = true;
  state = 'ready'; reset(); $('end').hidden = true; $('hud').hidden = true; $('start').hidden = false; buildLevels();
}

/* ---------- world rendering ---------- */
const P = (x, y, d) => [CX + (x - VX) * F / d, HOR + (VY - y) * F / d];
function poly(pts, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const q = P(pts[i][0], pts[i][1], pts[i][2]);
    if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
  }
  ctx.closePath(); ctx.fill();
}
const fq = (x0, x1, y, a, b, col) => poly([[x0, y, a], [x1, y, a], [x1, y, b], [x0, y, b]], col);     // floor or ceiling strip
const wq = (x, y0, y1, a, b, col) => poly([[x, y0, a], [x, y1, a], [x, y1, b], [x, y0, b]], col);     // side wall strip
const cq = (x0, x1, y0, y1, d, col) => poly([[x0, y0, d], [x1, y0, d], [x1, y1, d], [x0, y1, d]], col); // faces the camera
const sub = (z0, z1) => [Math.max(z0 - VZ, 0.2), z1 - VZ];
const FONT = "'Barlow Condensed','Arial Narrow',sans-serif";
function label(str, x, y, px, color) {
  if (px < 8) return;
  ctx.font = '700 ' + px + 'px ' + FONT; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}
function forSegs(seg, far, cb) {
  const kMax = Math.min(Math.floor(LV.goal / seg) - 1, Math.ceil((VZ + far) / seg));
  const kMin = Math.floor(VZ / seg);
  for (let k = kMax; k >= kMin; k--) {
    const za = k * seg, zb = za + seg, da = Math.max(za - VZ, 0.2), db = zb - VZ;
    if (db <= 0.2) continue;
    cb(k, za, zb, da, db);
  }
}
function sky(top) {
  const g = ctx.createLinearGradient(0, HOR - H * 0.45, 0, HOR);
  g.addColorStop(0, top); g.addColorStop(1, FOGCSS);
  ctx.fillStyle = g; ctx.fillRect(-W, -H, 3 * W, HOR + H);
}
function ball(x, y, r, base, light, dark) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, light); g.addColorStop(0.55, base); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
// World point -> screen [x, y, depth]
function W3(x, y, z) {
  const d = Math.max(0.12, z - VZ), sc = F / d;
  return [CX + (x - VX) * sc, HOR + (VY - y) * sc, d];
}
function box3D(x0, x1, y0, y1, z0, z1, c) {
  if (z1 - VZ < 0.3) return;
  const zn = Math.max(z0, VZ + 0.3), d = zn - VZ;
  const q = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => { const s = W3(p[0], p[1], p[2]); if (i) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); }); ctx.closePath(); ctx.fill(); };
  if (VX < x0) q([[x0, y0, zn], [x0, y1, zn], [x0, y1, z1], [x0, y0, z1]], mixc(scl(c, 0.72), d));
  else if (VX > x1) q([[x1, y0, zn], [x1, y1, zn], [x1, y1, z1], [x1, y0, z1]], mixc(scl(c, 0.72), d));
  if (VY > y1) q([[x0, y1, zn], [x1, y1, zn], [x1, y1, z1], [x0, y1, z1]], mixc(scl(c, 1.15), d));
  if (z0 > VZ + 0.3) q([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], mixc(c, d));
}

function goalAirport(d) {
  const w = LV.half;
  cq(-w, w, 0, CEIL, d, mixc(C.navy, d));
  cq(-1.6, 1.6, 0, 2.7, d, mixc(C.glow, d));
  cq(-3.4, 3.4, 3.0, 4.1, d, mixc(C.sign, d));
  const c = P(0, 3.55, d);
  label(LV.goalText, c[0], c[1], 0.8 * F / d, INK);
  for (const sx of [-4.6, 4.6]) cq(sx - 0.9, sx + 0.9, 0.9, 1.1, d, mixc(C.sign, d));
}
function paintAirport() {
  const Wl = LV.half;
  if (LV.goal - VZ < 84) goalAirport(LV.goal - VZ);
  forSegs(3, 82, (k, za, zb, da, db) => {
    const par = k & 1;
    fq(-Wl, Wl, CEIL, da, db, mixc(C.ceil, da));
    if (!par) {
      const [pa, pb] = sub(za + 0.5, zb - 0.5);
      if (pb > 0.2) for (const r of [[-1.3, 1.3], [-5.3, -3.3], [3.3, 5.3]]) fq(r[0], r[1], CEIL, pa, pb, mixc(C.panel, pa));
    }
    fq(-5, 5, 0, da, db, mixc(par ? C.tileA : C.tileB, da));
    fq(-Wl, -5, 0, da, db, mixc(par ? C.carA : C.carB, da));
    fq(5, Wl, 0, da, db, mixc(par ? C.carA : C.carB, da));
    if (!par) { const [a, b] = sub(za + 0.4, zb - 0.4); if (b > 0.2) fq(-0.07, 0.07, 0, a, b, mixc(C.sign, a)); }
    ctx.strokeStyle = 'rgba(15,27,45,0.10)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -4; x <= 4; x += 2) { const a = P(x, 0, da), b = P(x, 0, db); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
    for (const side of [-1, 1]) {
      const wx = side * Wl;
      wq(wx, 0, CEIL, da, db, mixc(C.wall, da));
      if (mod(k, 4) === 0) {
        const [pa, pb] = sub(za - 0.35, za + 0.35);
        if (pb > 0.2) wq(side * (Wl - 0.6), 0, CEIL, pa, pb, mixc(C.pillar, pa));
      } else {
        const [wa, wb] = sub(za + 0.2, zb - 0.2);
        if (wb > 0.2) {
          if (side < 0) wq(wx, 0.9, 3.8, wa, wb, mixc(C.glass, wa));
          else {
            wq(wx, 0.4, 2.7, wa, wb, mixc(C.shop, wa));
            wq(wx, 3.0, 3.9, wa, wb, mixc(SHOPFRONTS[mod(Math.floor(k / 4) + k, SHOPFRONTS.length)], wa));
          }
        }
      }
    }
    if (mod(k, 10) === 0 && za - VZ > 6) {
      const d = za - VZ;
      ctx.globalAlpha = clamp((d - 6) / 5, 0, 1);   // overhead signs fade out before they pass over the camera
      cq(-2.5, 2.5, 3.05, 3.95, d, mixc(C.sign, d));
      for (const hx of [-2, 2]) cq(hx - 0.04, hx + 0.04, 3.95, CEIL, d, mixc(C.navy, d));
      const c = P(0, 3.5, d);
      label('GATES B1 – B20', c[0], c[1] - 0.12 * F / d, 0.42 * F / d, INK);
      label('TERMINAL B', c[0], c[1] + 0.26 * F / d, 0.26 * F / d, INK);
      ctx.globalAlpha = 1;
    }
  });
}
function goalNYC(d) {
  cq(-17, 17, 0, 34, d, mixc(hex('#857868'), d));
  for (let y = 4.5; y < 30; y += 3.4) for (let x = -15; x < 15; x += 2.6) cq(x, x + 1.3, y, y + 1.9, d, mixc(C.win, d));
  cq(-1.7, 1.7, 0, 2.5, d, mixc(hex('#121417'), d));
  cq(-2.8, 2.8, 2.6, 3.4, d, mixc(hex('#0f5132'), d));
  const c = P(0, 3.0, d);
  label(LV.goalText, c[0], c[1], 0.55 * F / d, '#ffffff');
  for (const sx of [-2.3, 2.3]) {
    const q = P(sx, 2.2, d), r = 0.22 * F / d;
    ball(q[0], q[1], r, '#2ecc71', '#b6ffd5', '#137a43');
    cq(sx - 0.05, sx + 0.05, 0, 2.0, d, mixc(hex('#1f3d2b'), d));
  }
}
function paintNYC() {
  sky('#7fb0dd');
  const hw = LV.half;
  if (LV.goal - VZ < 86) goalNYC(LV.goal - VZ);
  forSegs(3, 85, (k, za, zb, da, db) => {
    const par = k & 1, xing = inXing(za + 0.1), bi = Math.floor(za / 12);
    wq(-17, 0, 18 + mod(bi * 53, 6) * 5, da, db, mixc(scl(hex(BLD[mod(bi + 3, BLD.length)]), 0.85), da));
    fq(-17, -4.75, 0, da, db, mixc(par ? C.asA : C.asB, da));
    if (!par) { const [a, b] = sub(za + 0.6, zb - 0.6); if (b > 0.2) { fq(-8.0, -7.85, 0.003, a, b, mixc(C.white, a)); fq(-11.0, -10.85, 0.003, a, b, mixc(C.white, a)); } }
    fq(-14.0, -13.85, 0.003, da, db, mixc(C.yline, da));
    if (xing) {
      fq(-4.75, 17, 0, da, db, mixc(par ? C.asA : C.asB, da));
      for (let x = -3.9; x < 3.9; x += 1.2) fq(x, x + 0.6, 0.004, da, db, mixc(C.white, da));
      wq(17, 0, 24, da, db, mixc(hex('#9a8f80'), da));
    } else {
      fq(-4.75, -4.4, 0.01, da, db, mixc(C.curb, da));
      fq(-4.4, hw, 0, da, db, mixc(par ? C.walkA : C.walkB, da));
      if (za - VZ > 0.2) {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.beginPath();
        const a = P(-4.4, 0, za - VZ), b = P(hw, 0, za - VZ); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      const col = hex(BLD[mod(bi, BLD.length)]), hB = 16 + mod(bi * 37, 7) * 5;
      wq(hw, 0, hB, da, db, mixc(col, da));
      if (inXing(za - 1)) cq(hw, 17, 0, hB, da, mixc(scl(col, 0.85), da));   // corner building facing us across the side street
      const [wa, wb] = sub(za + 0.25, zb - 0.25);
      if (wb > 0.2) {
        wq(hw, 0.15, 3.0, wa, wb, mixc(C.glassDark, wa));
        if (mod(bi, 3) !== 1) poly([[hw, 3.45, wa], [hw - 1.1, 2.95, wa], [hw - 1.1, 2.95, wb], [hw, 3.45, wb]], mixc(scl(hex(AWN[mod(bi, AWN.length)]), par ? 1 : 1.25), wa));
        if (wa < 55) { const [a, b] = sub(za + 0.6, zb - 0.6); if (b > 0.2) for (let y = 4.6; y < hB - 1.5 && y < 26; y += 3.4) wq(hw, y, y + 1.9, a, b, mixc(C.win, a)); }
      }
    }
  });
}
function goalShibuya(d) {
  cq(-15, 15, 0, 28, d, mixc(hex('#221d38'), d));
  cq(-6, 6, 7, 13, d, mixc(hex(NEON[0]), d * 0.5));
  cq(-3, 3, 0, 3, d, mixc(C.glow, d));
  cq(-4.2, 4.2, 3.3, 4.6, d, mixc(hex('#1d8f4e'), d));
  const c = P(0, 3.95, d);
  label(LV.goalText, c[0], c[1], 0.8 * F / d, '#ffffff');
}
function paintShibuya() {
  sky('#0e0b1f');
  if (LV.goal - VZ < 86) goalShibuya(LV.goal - VZ);
  const hw = 15;
  forSegs(3, 85, (k, za, zb, da, db) => {
    const par = k & 1, m = mod(za, 45);
    fq(-hw, hw, 0, da, db, mixc(par ? C.nightA : C.nightB, da));
    if (m >= 6 && m < 33) for (let x = -10.2; x < 10.2; x += 1.25) fq(x, x + 0.65, 0.004, da, db, mixc(C.zebra, da));
    if (m === 36 || m === 39) for (let zz = za; zz < zb; zz += 1.2) { const [a, b] = sub(zz, zz + 0.6); if (b > 0.2) fq(-hw, hw, 0.004, a, b, mixc(C.zebra, a)); }
    for (const sd of [-1, 1]) {
      fq(sd * 11.6, sd * hw, 0.02, da, db, mixc(C.nightWalk, da));
      wq(sd * hw, 0, 30, da, db, mixc(hex(NIGHTBLD[mod((k >> 2) + (sd > 0 ? 1 : 0), NIGHTBLD.length)]), da));
      const [wa, wb] = sub(za + 0.3, zb - 0.3);
      if (wb > 0.2) {
        wq(sd * hw, 0.2, 3.2, wa, wb, mixc(C.shopNight, wa * 0.7));
        if (mod((k >> 1) + (sd > 0 ? 1 : 0), 3) === 0) {
          const nc = hex(NEON[mod(k + (sd > 0 ? 2 : 0), NEON.length)]);
          ctx.globalAlpha = 0.35; wq(sd * hw, 5.4, 14.6, Math.max(0.2, wa - 0.3), wb + 0.3, mixc(nc, wa * 0.5)); ctx.globalAlpha = 1;
          wq(sd * hw, 6, 14, wa, wb, mixc(nc, wa * 0.5));
        } else if (wa < 60) {
          const [a, b] = sub(za + 0.7, zb - 0.7);
          if (b > 0.2) for (let y = 5; y < 26; y += 3) wq(sd * hw, y, y + 1.2, a, b, mixc(C.litWin, a * 0.7));
        }
      }
    }
  });
}
function drawCars() {
  const list = S.cars.slice().sort((a, b) => b.z - a.z);
  for (const c of list) {
    const d = c.z - VZ;
    if (d < 1 || d > 92) continue;
    const x = c.x, z = c.z;
    fq(x - 1.0, x + 1.0, 0.01, Math.max(0.2, z - 2.4 - VZ), z + 2.4 - VZ, 'rgba(0,0,0,0.25)');
    box3D(x - 0.95, x + 0.95, 0.22, 1.0, z - 2.3, z + 2.3, c.col);
    box3D(x - 0.8, x + 0.8, 1.0, 1.5, z - 1.0, z + 1.1, scl(hex('#2a3644'), 1));
    if (c.taxi) box3D(x - 0.25, x + 0.25, 1.5, 1.68, z - 0.15, z + 0.15, hex('#f4f1ea'));
    const fd = z - 2.3 - VZ;
    if (fd > 0.4) {
      const col = c.front ? '#fff4c8' : '#e3342f';
      for (const lx of [-0.68, 0.48]) cq(x + lx, x + lx + 0.2, 0.62, 0.78, fd - 0.01, col);
    }
  }
}

/* ---------- people rendering: a projected 3D skeleton with shaded, rounded limbs ---------- */
function capsule(pts, w, base, dark, light) {
  const run = (ox, oy) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
    ctx.stroke();
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = dark; ctx.lineWidth = w; run(0, 0);
  ctx.strokeStyle = base; ctx.lineWidth = w * 0.7; run(-w * 0.09, -w * 0.07);
  if (light && w > 6) { ctx.strokeStyle = light; ctx.lineWidth = w * 0.22; run(-w * 0.2, -w * 0.16); }
}
function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function drawCase(p, s) {
  const cx0 = p.x + p.lug * 0.5, w = 0.36, dd = 0.22, h = 0.55;
  const x0 = cx0 - w / 2, x1 = cx0 + w / 2, zn = p.z - dd / 2, zf = p.z + dd / 2;
  const fill = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); };
  const sx = cx0 > VX ? x0 : x1;
  fill([W3(sx, 0.03, zn), W3(sx, h, zn), W3(sx, h, zf), W3(sx, 0.03, zf)], p.lugD);
  fill([W3(x0, h, zn), W3(x1, h, zn), W3(x1, h, zf), W3(x0, h, zf)], p.lugL);
  fill([W3(x0, 0.03, zn), W3(x1, 0.03, zn), W3(x1, h, zn), W3(x0, h, zn)], p.lugCol);
  const hp = [W3(cx0 - 0.07, h, p.z), W3(cx0 - 0.07, 0.92, p.z), W3(cx0 + 0.07, 0.92, p.z), W3(cx0 + 0.07, h, p.z)];
  ctx.strokeStyle = '#4b5563'; ctx.lineWidth = Math.max(1, 0.025 * s);
  ctx.beginPath(); hp.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
  ctx.fillStyle = '#111827';
  for (const wx of [x0 + 0.05, x1 - 0.05]) { const q = W3(wx, 0.03, zn); ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1, 0.035 * s), 0, TAU); ctx.fill(); }
  return W3(cx0, 0.92, p.z);
}
function drawDog(p, s) {
  const dx = p.x + p.dog * 0.55, dz = p.z + 0.15, c = hex(p.dogCol);
  const f = p.fz >= 0 ? 1 : -1, wag = Math.sin(p.phase * 2) * 0.05;
  box3D(dx - 0.12, dx + 0.12, 0.22, 0.46, dz - 0.3, dz + 0.3, c);
  const hd = W3(dx, 0.55, dz + f * 0.36), r = 0.11 * F / Math.max(0.3, hd[2]);
  const cs = 'rgb(' + c.join(',') + ')';
  ball(hd[0], hd[1], r, cs, shade('#' + c.map(v => (v | 0).toString(16).padStart(2, '0')).join(''), 1.2), shade('#' + c.map(v => (v | 0).toString(16).padStart(2, '0')).join(''), 0.6));
  ctx.strokeStyle = cs; ctx.lineWidth = Math.max(1, 0.05 * s); ctx.lineCap = 'round';
  for (const [lx, lz] of [[-0.08, -0.22], [0.08, -0.22], [-0.08, 0.22], [0.08, 0.22]]) {
    const a = W3(dx + lx, 0.24, dz + lz), b = W3(dx + lx, 0.02, dz + lz + Math.sin(p.phase + lz * 10) * 0.05);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  const ta = W3(dx, 0.44, dz - f * 0.3), tb = W3(dx + wag, 0.6, dz - f * 0.42);
  ctx.beginPath(); ctx.moveTo(ta[0], ta[1]); ctx.lineTo(tb[0], tb[1]); ctx.stroke();
  const hand = W3(p.x + p.dog * 0.24, 0.85, p.z);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = Math.max(1, 0.012 * s);
  ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.quadraticCurveTo((hand[0] + hd[0]) / 2, Math.max(hand[1], hd[1]) + 0.1 * s, hd[0], hd[1]); ctx.stroke();
}
function drawNear(p, s) {
  const k = p.h / 1.75, fx = p.fx, fz = p.fz, rx = fz, rz = -fx;
  const sp = Math.hypot(p.vx, p.vz), wa = p.walkA === undefined ? (sp > 0.15 ? 1 : 0) : p.walkA, walk = wa * Math.min(1, 0.55 + sp * 0.15);
  const ph = p.phase;
  const legs = [];
  let minA = 9;
  for (const side of [-1, 1]) {
    const lp = ph + (side > 0 ? Math.PI : 0);
    const a = Math.sin(lp) * 0.42 * walk;
    const bend = 0.06 + (0.1 + 0.6 * Math.max(0, Math.cos(lp))) * walk;
    const knee = [side * 0.1, Math.sin(a) * 0.45, 0.93 - Math.cos(a) * 0.45];
    const sa = a - bend;
    const ankle = [side * 0.1, knee[1] + Math.sin(sa) * 0.44, knee[2] - Math.cos(sa) * 0.44];
    minA = Math.min(minA, ankle[2]);
    legs.push({ side, knee, ankle });
  }
  const drop = minA - 0.08;   // planted foot stays on the floor, so the body bobs naturally
  const L = (lx, ly, u) => W3(p.x + (rx * lx + fx * ly) * k, (u - drop) * k, p.z + (rz * lx + fz * ly) * k);
  const sk = s * k;
  const vxv = p.x - VX, vzv = Math.max(0.2, p.z - VZ), vl = Math.hypot(vxv, vzv);
  const across = Math.abs(rx * (vzv / vl) - rz * (vxv / vl));   // 1 = shoulders face the camera, 0 = side-on
  const facing = fx * (vxv / vl) + fz * (vzv / vl);            // >0 walking away from the camera
  const sideDir = sgn(fx * (vzv / vl) - fz * (vxv / vl));
  const items = [];
  for (const g of legs) {
    const hip = L(g.side * 0.1, 0, 0.93), kn = L(g.knee[0], g.knee[1], g.knee[2]), an = L(g.ankle[0], g.ankle[1], g.ankle[2]);
    const toe = L(g.ankle[0], g.ankle[1] + 0.13, g.ankle[2] - 0.03);
    items.push({ d: hip[2], f: () => {
      capsule([hip, kn, an], 0.13 * sk, p.pants, p.pantsD, p.pantsL);
      capsule([an, toe], 0.1 * sk, p.shoe, p.shoeD, p.shoeL);
    } });
  }
  let handle = null;
  if (p.lug) items.push({ d: p.z - VZ, f: () => { handle = drawCase(p, s); } });
  if (p.dog) items.push({ d: p.z + 0.15 - VZ, f: () => drawDog(p, s) });
  if (p.boxes) {
    const bz = p.z + p.dirz * 0.6;
    items.push({ d: bz - VZ, f: () => {
      box3D(p.x - 0.26, p.x + 0.26, 0.05, 0.62, bz - 0.22, bz + 0.22, hex('#b08350'));
      box3D(p.x - 0.22, p.x + 0.22, 0.62, 1.12, bz - 0.2, bz + 0.2, hex('#c49563'));
      box3D(p.x - 0.18, p.x + 0.18, 1.12, 1.45, bz - 0.17, bz + 0.17, hex('#a8794a'));
    } });
  }
  const lugSide = p.lug ? (Math.sign(rx * p.lug) || p.lug) : 0;
  for (const side of [-1, 1]) {
    const ap = ph + (side > 0 ? 0 : Math.PI);
    let c = Math.sin(ap) * (p.fast ? 0.55 : 0.32) * walk, bend = p.fast ? 1.35 : 0.2 + 0.2 * walk, hx = 0.22;
    if (p.react && p.react.up && p.react.t > 0 && p.react.t < 0.9) { c = 2.45; bend = 0.55; hx = 0.36; }   // hands up
    if (p.dance) { c = 1.7 + Math.sin(ph * 1.3 + side * 1.7) * 1.0; bend = 0.9; hx = 0.38; }
    if (p.phone && side > 0) { c = 0.35; bend = 1.7; hx = 0.1; }
    const el = [side * 0.23, Math.sin(c) * 0.28, 1.42 - Math.cos(c) * 0.28];
    const fa = c + bend;
    const hd = [side * hx, el[1] + Math.sin(fa) * 0.26, el[2] - Math.cos(fa) * 0.26];
    const shp = L(side * 0.19, 0, 1.42), elp = L(el[0], el[1], el[2]), hdp = L(hd[0], hd[1], hd[2]);
    const holds = side === lugSide;
    items.push({ d: shp[2] + 0.001, f: () => {
      let e2 = elp, h2 = hdp;
      if (holds && handle) { h2 = handle; e2 = [(shp[0] + handle[0]) / 2 + (handle[0] - shp[0]) * 0.1, (shp[1] + handle[1]) / 2, 0]; }
      capsule([shp, e2], 0.095 * sk, p.shirt, p.shirtD, p.shirtL);
      capsule([e2, h2], 0.075 * sk, p.skin, p.skinD, null);
      ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(h2[0], h2[1], 0.045 * sk, 0, TAU); ctx.fill();
      if (p.phone && side > 0) {
        ctx.fillStyle = '#111827'; ctx.fillRect(h2[0] - 0.04 * sk, h2[1] - 0.09 * sk, 0.08 * sk, 0.13 * sk);
        ctx.fillStyle = '#8ecbff'; ctx.fillRect(h2[0] - 0.03 * sk, h2[1] - 0.08 * sk, 0.06 * sk, 0.1 * sk);
      }
    } });
  }
  const chest = L(0, 0, 1.38), waist = L(0, 0, 0.98), neck = L(0, 0, 1.48), pelvis = L(0, 0, 0.86);
  const wM = 0.2 + 0.18 * across;
  items.push({ d: chest[2], f: () => {
    const sC = F / chest[2] * k, hwC = wM / 2 * sC, hwW = hwC * 0.78;
    const g = ctx.createLinearGradient(chest[0] - hwC, 0, chest[0] + hwC, 0);
    g.addColorStop(0, p.shirtL); g.addColorStop(0.5, p.shirt); g.addColorStop(1, p.shirtD);
    ctx.fillStyle = p.pants; ctx.strokeStyle = p.pants; ctx.lineWidth = hwC * 0.3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(waist[0] - hwW, waist[1]); ctx.lineTo(waist[0] + hwW, waist[1]);
    ctx.lineTo(pelvis[0] + hwW * 0.95, pelvis[1]); ctx.lineTo(pelvis[0] - hwW * 0.95, pelvis[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = g; ctx.strokeStyle = g; ctx.lineWidth = hwC * 0.4;
    ctx.beginPath(); ctx.moveTo(neck[0] - hwC * 0.85, neck[1]); ctx.lineTo(neck[0] + hwC * 0.85, neck[1]);
    ctx.lineTo(chest[0] + hwC, chest[1]); ctx.lineTo(waist[0] + hwW, waist[1]); ctx.lineTo(waist[0] - hwW, waist[1]);
    ctx.lineTo(chest[0] - hwC, chest[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
  } });
  if (p.pack === 'pack' || p.pack === 'jet') {
    const bc = L(0, -0.19, 1.2), jet = p.pack === 'jet';
    items.push({ d: bc[2], f: () => {
      const sc = F / bc[2] * k, w = (0.16 + 0.16 * across) * sc, h = 0.42 * sc;
      if (jet && p.isMe && S.boostV > 0.25) {   // jetpack flames while bursting
        for (const fx2 of [-0.25, 0.25]) {
          const fl = h * (0.6 + 0.5 * Math.random()) * S.boostV, x0 = bc[0] + fx2 * w;
          const g2 = ctx.createLinearGradient(0, bc[1] + h / 2, 0, bc[1] + h / 2 + fl);
          g2.addColorStop(0, '#fff3b0'); g2.addColorStop(0.5, '#ff9f43'); g2.addColorStop(1, 'rgba(255,77,79,0)');
          ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(x0 - w * 0.13, bc[1] + h / 2); ctx.lineTo(x0 + w * 0.13, bc[1] + h / 2); ctx.lineTo(x0, bc[1] + h / 2 + fl); ctx.closePath(); ctx.fill();
        }
      }
      const g = ctx.createLinearGradient(bc[0] - w / 2, 0, bc[0] + w / 2, 0);
      g.addColorStop(0, jet ? '#f3f4f6' : p.gearL); g.addColorStop(1, jet ? '#6b7280' : p.gearD);
      ctx.fillStyle = g; rrect(bc[0] - w / 2, bc[1] - h / 2, w, h, Math.min(w, h) * 0.3); ctx.fill();
      ctx.fillStyle = jet ? '#374151' : p.gearD;
      if (jet) { for (const fx2 of [-0.25, 0.25]) { rrect(bc[0] + fx2 * w - w * 0.13, bc[1] + h * 0.36, w * 0.26, h * 0.2, 2); ctx.fill(); } ctx.fillStyle = '#ff2d3a'; rrect(bc[0] - w * 0.2, bc[1] - h * 0.3, w * 0.4, h * 0.12, 2); ctx.fill(); }
      else { rrect(bc[0] - w * 0.36, bc[1] + h * 0.04, w * 0.72, h * 0.32, Math.min(w, h) * 0.12); ctx.fill(); }
    } });
  }
  const pitch = p.phone ? 0.06 : 0;
  const head = L(0, 0.02 + pitch, 1.63 - pitch * 0.6), neckTop = L(0, 0, 1.54), brimP = L(0, 0.22 + pitch, 1.69 - pitch * 0.6);
  const out = {};
  items.push({ d: head[2] - 0.002, f: () => {
    const r = 0.115 * F / head[2] * k, hx = head[0], hy = head[1];
    const longHair = p.hairStyle === 'long' && !p.bald;
    const brim = () => {
      ctx.fillStyle = p.gearD; ctx.beginPath();
      ctx.ellipse((hx + brimP[0]) / 2, (hy - r * 0.2 + brimP[1]) / 2, r * 0.9 + Math.abs(brimP[0] - hx) * 0.5, r * 0.24, 0, 0, TAU); ctx.fill();
    };
    capsule([neck, neckTop], 0.08 * sk, p.skin, p.skinD, null);
    if (longHair && facing <= 0.35) { ctx.fillStyle = p.hair; ctx.beginPath(); ctx.ellipse(hx - (facing > -0.35 ? sideDir * r * 0.25 : 0), hy + r * 0.55, r * 1.05, r * 1.15, 0, 0, TAU); ctx.fill(); }
    if (p.hat === 'cap' && facing > 0.35) brim();
    ball(hx, hy, r, p.skin, p.skinL, p.skinD);
    ctx.fillStyle = p.hair;
    if (facing > 0.35) {
      if (!p.bald) {
        ctx.beginPath(); ctx.arc(hx, hy - r * 0.05, r * 1.01, 0, TAU); ctx.fill();
        if (longHair) { ctx.beginPath(); ctx.ellipse(hx, hy + r * 0.65, r * 0.98, r * 1.1, 0, 0, TAU); ctx.fill(); }
      }
    } else if (facing < -0.35) {
      if (!p.bald) { ctx.beginPath(); ctx.arc(hx, hy - r * 0.12, r * 1.0, Math.PI, TAU); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#16191f';
      const er = Math.max(0.9, r * 0.11);
      if (p.face === 'shades') { rrect(hx - r * 0.66, hy - r * 0.06, r * 1.32, r * 0.3, r * 0.12); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(hx - r * 0.5, hy - r * 0.01, r * 0.18, r * 0.06); ctx.fillRect(hx + r * 0.18, hy - r * 0.01, r * 0.18, r * 0.06); }
      else { ctx.beginPath(); ctx.arc(hx - r * 0.36, hy + r * 0.08, er, 0, TAU); ctx.arc(hx + r * 0.36, hy + r * 0.08, er, 0, TAU); ctx.fill(); }
      if (p.rival) {
        ctx.strokeStyle = '#16191f'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx - r * 0.58, hy - r * 0.16); ctx.lineTo(hx - r * 0.15, hy - r * 0.02);
        ctx.moveTo(hx + r * 0.58, hy - r * 0.16); ctx.lineTo(hx + r * 0.15, hy - r * 0.02); ctx.stroke();
      }
    } else {
      if (!p.bald) {
        ctx.beginPath(); ctx.moveTo(hx, hy);
        if (sideDir > 0) ctx.arc(hx, hy - r * 0.04, r * 1.02, 0.55 * Math.PI, 1.85 * Math.PI);
        else ctx.arc(hx, hy - r * 0.04, r * 1.02, -0.85 * Math.PI, 0.45 * Math.PI);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#16191f';
      if (p.face === 'shades') { rrect(hx + sideDir * r * 0.3 - r * 0.3, hy - r * 0.05, r * 0.66, r * 0.26, r * 0.1); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(hx + sideDir * r * 0.55, hy + r * 0.05, Math.max(0.9, r * 0.11), 0, TAU); ctx.fill(); }
      ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(hx + sideDir * r * 0.97, hy + r * 0.22, r * 0.17, 0, TAU); ctx.fill();
    }
    if (!p.bald && facing <= 0.35 && p.hat === 'none') {
      ctx.strokeStyle = p.hairL; ctx.lineWidth = Math.max(1, r * 0.12); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(hx, hy - r * 0.08, r * 0.78, 1.15 * Math.PI, 1.45 * Math.PI); ctx.stroke();
    }
    if (p.hairStyle === 'mohawk' && (p.hat === 'none' || p.hat === 'headphones')) {
      ctx.fillStyle = p.hair;
      if (Math.abs(facing) > 0.35) {
        ctx.beginPath(); ctx.moveTo(hx - r * 0.2, hy - r * 0.8);
        ctx.lineTo(hx - r * 0.12, hy - r * 1.5); ctx.lineTo(hx, hy - r * 1.05); ctx.lineTo(hx + r * 0.1, hy - r * 1.55); ctx.lineTo(hx + r * 0.2, hy - r * 0.8); ctx.closePath(); ctx.fill();
      } else {
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (1.12 + i * 0.19), ca = Math.cos(a) * -sideDir, sa = Math.sin(a);
          const bx0 = hx + ca * r * 0.92, by0 = hy + sa * r * 0.92;
          ctx.beginPath(); ctx.moveTo(bx0 - sa * r * 0.18, by0 + ca * r * 0.18 * 0); ctx.lineTo(hx + ca * r * 1.5, hy + sa * r * 1.5); ctx.lineTo(bx0 + r * 0.18 * Math.sign(ca || 1), by0); ctx.closePath(); ctx.fill();
        }
      }
    }
    if (p.hat === 'headphones') {
      ctx.strokeStyle = p.gear; ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(hx, hy - r * 0.05, r * 1.1, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.fillStyle = p.gearD;
      if (Math.abs(facing) > 0.35) { for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + sx * r * 1.0, hy + r * 0.05, r * 0.26, r * 0.4, 0, 0, TAU); ctx.fill(); } }
      else { ctx.beginPath(); ctx.ellipse(hx - sideDir * r * 0.1, hy + r * 0.05, r * 0.36, r * 0.44, 0, 0, TAU); ctx.fill(); }
    }
    if (p.hat === 'crown') {
      ctx.fillStyle = '#f2c200'; ctx.strokeStyle = '#a07800'; ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath(); ctx.moveTo(hx - r * 0.7, hy - r * 0.7);
      ctx.lineTo(hx - r * 0.75, hy - r * 1.35); ctx.lineTo(hx - r * 0.38, hy - r * 1.0); ctx.lineTo(hx, hy - r * 1.45); ctx.lineTo(hx + r * 0.38, hy - r * 1.0); ctx.lineTo(hx + r * 0.75, hy - r * 1.35); ctx.lineTo(hx + r * 0.7, hy - r * 0.7);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2574c'; ctx.beginPath(); ctx.arc(hx, hy - r * 0.86, r * 0.1, 0, TAU); ctx.fill();
    }
    if (p.hat === 'beanie') {
      ctx.fillStyle = p.gear; ctx.beginPath(); ctx.arc(hx, hy - r * 0.12, r * 1.07, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p.gearD; ctx.fillRect(hx - r * 1.07, hy - r * 0.3, r * 2.14, r * 0.26);
      ctx.fillStyle = p.gearL; ctx.beginPath(); ctx.arc(hx, hy - r * 1.18, r * 0.22, 0, TAU); ctx.fill();
    } else if (p.hat === 'cap') {
      ctx.fillStyle = p.gear; ctx.beginPath(); ctx.arc(hx, hy - r * 0.14, r * 1.05, Math.PI, TAU); ctx.closePath(); ctx.fill();
      if (facing <= 0.35) brim();
    }
    out.hx = hx; out.hy = hy; out.hr = r;
  } });
  items.sort((a, b) => b.d - a.d);
  for (const it of items) it.f();
  return out;
}
function drawFar(p, bx, fy, U) {
  const sw = Math.sin(p.phase), moving = Math.hypot(p.vx, p.vz) > 0.15;
  const lw = Math.max(1.2, 0.12 * U);
  ctx.lineCap = 'round';
  ctx.strokeStyle = p.pants; ctx.lineWidth = lw; ctx.beginPath();
  ctx.moveTo(bx, fy - 0.9 * U); ctx.lineTo(bx - 0.08 * U, fy - (moving ? Math.max(0, sw) * 0.1 * U : 0));
  ctx.moveTo(bx, fy - 0.9 * U); ctx.lineTo(bx + 0.08 * U, fy - (moving ? Math.max(0, -sw) * 0.1 * U : 0));
  ctx.stroke();
  ctx.strokeStyle = p.shirt; ctx.lineWidth = Math.max(2, 0.32 * U);
  ctx.beginPath(); ctx.moveTo(bx, fy - 0.98 * U); ctx.lineTo(bx, fy - 1.4 * U); ctx.stroke();
  if (p.lug) { ctx.fillStyle = p.lugCol; ctx.fillRect(bx + p.lug * 0.5 * U - 0.17 * U, fy - 0.55 * U, 0.34 * U, 0.55 * U); }
  const r = Math.max(1.2, 0.115 * U), hy = fy - 1.63 * U;
  ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(bx, hy, r, 0, TAU); ctx.fill();
  if (!p.bald) { ctx.fillStyle = p.hair; ctx.beginPath(); ctx.arc(bx, hy - r * 0.1, r, Math.PI, TAU); ctx.fill(); }
  return { hx: bx, hy, hr: r };
}
function drawProp(p, s, bx, fy) {
  const x = p.x, z = p.z;
  switch (p.prop) {
    case 'lamp': {
      const a = W3(x, 0, z), b = W3(x, 4.6, z), c = W3(x - 0.9, 4.75, z);
      capsule([a, W3(x, 0.5, z)], 0.26 * s, '#3a4a40', '#1f2a23', null);
      capsule([a, b], 0.15 * s, '#3a4a40', '#1f2a23', '#5d7366');
      capsule([b, c], 0.08 * s, '#3a4a40', '#1f2a23', null);
      ball(c[0], c[1], 0.16 * F / c[2], '#fff3c4', '#ffffff', '#d8c58a');
      break;
    }
    case 'signal': {
      const a = W3(x, 0, z), b = W3(x, 3.1, z);
      capsule([a, b], 0.13 * s, '#4b5563', '#1f2937', '#9ca3af');
      box3D(x - 0.2, x + 0.2, 2.45, 3.0, z - 0.16, z + 0.16, hex('#2b2b2b'));
      const q = W3(x, 2.72, z - 0.17), walk = p.xing && p.xing.walk;
      ctx.fillStyle = walk ? '#f4f6f8' : '#ff6a3d';
      ctx.beginPath(); ctx.arc(q[0], q[1], 0.11 * F / q[2], 0, TAU); ctx.fill();
      break;
    }
    case 'tree': {
      ctx.strokeStyle = 'rgba(30,30,30,0.6)'; ctx.lineWidth = Math.max(1, 0.04 * s);
      ctx.beginPath(); ctx.ellipse(bx, fy, 0.55 * s, 0.55 * s * Math.min(0.6, VY / (z - VZ)), 0, 0, TAU); ctx.stroke();
      const a = W3(x, 0, z), b = W3(x, 2.8, z);
      capsule([a, b], 0.22 * s, '#6b4a2b', '#3b2a1e', '#8a6a46');
      const c1 = W3(x, 3.7, z), c2 = W3(x + 0.6, 3.3, z + 0.3), c3 = W3(x - 0.5, 3.4, z - 0.3);
      ball(c2[0], c2[1], 1.0 * F / c2[2], '#3f7d3a', '#6fae5a', '#24502a');
      ball(c3[0], c3[1], 0.95 * F / c3[2], '#3f7d3a', '#6fae5a', '#24502a');
      ball(c1[0], c1[1], 1.2 * F / c1[2], '#4a8c42', '#7fc068', '#2a5c2f');
      break;
    }
    case 'trash': box3D(x - 0.28, x + 0.28, 0, 0.95, z - 0.28, z + 0.28, hex('#2f5d3a')); break;
    case 'hydrant': {
      const a = W3(x, 0, z), b = W3(x, 0.7, z);
      capsule([a, b], 0.28 * s, '#c0392b', '#7d1f16', '#ff7b6b');
      ball(b[0], b[1], 0.15 * s, '#d4a017', '#ffe08a', '#8a6a0c');
      break;
    }
    case 'cart': {
      box3D(x - 0.45, x + 0.45, 0.25, 1.1, z - 1.0, z + 1.0, hex('#c9ced6'));
      const a = W3(x, 1.1, z), b = W3(x, 2.25, z);
      capsule([a, b], 0.05 * s, '#6b7280', '#374151', null);
      ctx.fillStyle = '#2f80ed'; ctx.beginPath(); ctx.ellipse(b[0], b[1], 1.2 * F / b[2], 0.5 * F / b[2], 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#ffcf1f'; ctx.beginPath(); ctx.ellipse(b[0], b[1], 0.6 * F / b[2], 0.5 * F / b[2], 0, Math.PI, TAU); ctx.fill();
      const fq0 = W3(x, 0.7, z - 1.01); label('HOT DOGS', fq0[0], fq0[1], Math.round(0.2 * F / fq0[2]), '#c0392b');
      break;
    }
    case 'board': box3D(x - 0.3, x + 0.3, 0, 0.95, z - 0.12, z + 0.12, hex('#1f2937')); { const q = W3(x, 0.6, z - 0.13); label('SALE', q[0], q[1], Math.round(0.18 * F / q[2]), '#f4f6f8'); } break;
    case 'wetfloor': box3D(x - 0.25, x + 0.25, 0, 0.62, z - 0.12, z + 0.12, hex('#ffcf1f')); { const q = W3(x, 0.4, z - 0.13); label('WET', q[0], q[1], Math.round(0.14 * F / q[2]), INK); } break;
  }
}
function drawPerson(p) {
  const dz = p.z - VZ;
  if (dz < 0.6 || dz > DRAW_FAR) return;
  const s = F / dz, k = p.h / 1.75, U = s * k;
  const bx = CX + (p.x - VX) * s;
  if (bx < -s * 3 || bx > W + s * 3) return;
  const fy = HOR + VY * s;
  // fog in the distance; fade people right in front of the camera so they never block your character
  ctx.globalAlpha = Math.min(fogA(dz), p.isMe ? 1 : clamp((dz - 0.6) / 1.6, 0.22, 1), clamp((DRAW_FAR - dz) / 8, 0, 1), p.fadeT === undefined ? 1 : p.fadeT / 0.9);
  if (p.prop !== 'spill') {
    ctx.fillStyle = LV.night ? 'rgba(0,0,0,0.35)' : 'rgba(15,27,45,0.18)';
    ctx.beginPath(); ctx.ellipse(bx, fy, 0.34 * s, 0.34 * s * Math.min(0.6, VY / dz), 0, 0, TAU); ctx.fill();
  }
  if (p.isMe) {
    ctx.strokeStyle = 'rgba(255,207,31,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(bx, fy, 0.42 * s, 0.42 * s * Math.min(0.6, VY / dz), 0, 0, TAU); ctx.stroke();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let hd = {};
  if (p.prop) drawProp(p, s, bx, fy);
  else hd = U * 1.75 < 34 ? drawFar(p, bx, fy, U) : drawNear(p, s);
  const hx = hd.hx !== undefined ? hd.hx : bx, hy = hd.hy !== undefined ? hd.hy : fy - 1.63 * U;
  if (p.tele) {
    const a = 0.55 + 0.45 * Math.sin(S.clock * 18), sz = 0.12 * U, cy = hy - 0.34 * U;
    ctx.globalAlpha = Math.min(1, fogA(dz) * a + 0.2);
    ctx.fillStyle = p.rival ? '#ff2d3a' : '#ffcf1f'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 0.03 * U);
    for (let i = 0; i < 2; i++) {
      const ox = hx + p.swDir * (i * sz * 1.1 - sz * 0.4);
      ctx.beginPath(); ctx.moveTo(ox + p.swDir * sz, cy); ctx.lineTo(ox - p.swDir * sz * 0.2, cy - sz); ctx.lineTo(ox - p.swDir * sz * 0.2, cy + sz); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = fogA(dz);
  }
  if (p.flag) {
    const a = W3(p.x + 0.28, 1.0, p.z), b = W3(p.x + 0.28, 2.7, p.z);
    ctx.strokeStyle = '#374151'; ctx.lineWidth = Math.max(1, 0.03 * s);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const w = Math.sin(S.clock * 6) * 0.06, f1 = W3(p.x + 0.28, 2.7, p.z), f2 = W3(p.x + 0.85, 2.55 + w, p.z), f3 = W3(p.x + 0.28, 2.35, p.z);
    ctx.fillStyle = p.flag; ctx.beginPath(); ctx.moveTo(f1[0], f1[1]); ctx.lineTo(f2[0], f2[1]); ctx.lineTo(f3[0], f3[1]); ctx.closePath(); ctx.fill();
  }
  if (p.react && p.react.t >= 0 && p.react.t < 1.25 && dz < 32) {
    const t = p.react.t, a = t < 0.1 ? t / 0.1 : t > 1.0 ? (1.25 - t) / 0.25 : 1;
    const fs = clamp(Math.round(0.16 * U), 12, 18);
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const mt = ctx.measureText(p.react.text), tw = (mt && mt.width) || fs * 4;
    const bw = tw + 14, bh = fs + 10, by = hy - 0.32 * U - bh - t * 6, bxx = clamp(hx - bw / 2, 4, W - bw - 4);
    ctx.fillStyle = p.rival ? '#ff2d3a' : '#ffffff';
    rrect(bxx, by, bw, bh, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 5, by + bh - 1); ctx.lineTo(hx + 5, by + bh - 1); ctx.lineTo(hx, by + bh + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.rival ? '#ffffff' : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.react.text, bxx + bw / 2, by + bh / 2 + 1);
    ctx.globalAlpha = fogA(dz);
  }
  if (p.hit) {
    ctx.strokeStyle = '#ff4d4f'; ctx.lineWidth = Math.max(3, 0.06 * U);
    ctx.beginPath(); ctx.ellipse(bx, fy - 0.85 * U, 0.55 * U, 1.0 * U, 0, 0, TAU); ctx.stroke();
  }
  if (showHB) {
    for (const c of p.circles) {
      const cd = Math.max(0.3, dz + (c.oz || 0)), ss = F / cd;
      const cxp = CX + (p.x + c.ox - VX) * ss, rx = c.r * ss, ry = rx * Math.min(0.6, VY / cd);
      ctx.fillStyle = p.isMe ? 'rgba(39,194,122,0.3)' : 'rgba(255,77,79,0.28)'; ctx.strokeStyle = p.isMe ? '#27c27a' : '#ff4d4f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cxp, HOR + VY * ss, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

let radarTop = 120;   // bottom of the HUD, used to place banners
// Circular radar, bottom right: you are the dot in the middle and up is the way you are walking, so
// people beside and behind you sit below and to the sides. Each arrow points the way that person is moving
// relative to you, so an arrow pointing down on the lower half means they are catching up.
function radarArrow(x, y, ang, size, col, edge) {
  const c = Math.cos(ang), s = Math.sin(ang), P = [[1, 0], [-0.75, -0.65], [-0.35, 0], [-0.75, 0.65]];
  ctx.fillStyle = col; ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
  ctx.beginPath();
  P.forEach(([u, v], i) => { const px = x + (u * c - v * s) * size, py = y + (u * s + v * c) * size; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
function rearRadar() {
  const RANGE = 7, r = Math.min(58, W * 0.16), cx = W - r - 14, cy = H - r - 30, sc = r / RANGE;
  ctx.save();
  ctx.fillStyle = 'rgba(15,27,45,0.5)'; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const list = [];
  for (const p of S.people) {
    if (p.prop || p.dead) continue;
    const dx = p.x - S.px, dz = p.z - S.pz, d = Math.hypot(dx, dz);
    if (d < RANGE + 0.5) list.push({ p, dx, dz, d });
  }
  list.sort((a, b) => b.d - a.d);
  for (const it of list) {
    const p = it.p, x = cx + it.dx * sc, y = cy - it.dz * sc;
    const relx = p.vx - S.vx, relz = p.vz - S.speed;
    const ang = Math.hypot(relx, relz) > 0.2 ? Math.atan2(-relz, relx) : -Math.PI / 2;
    const near = clamp(1 - it.d / RANGE, 0, 1);
    const gap = Math.abs(it.dx) - (R_PLAYER + R_BODY);
    const danger = gap < 0.6 && it.dz < 1.4 && it.dz > -2.5;
    ctx.globalAlpha = (0.5 + 0.5 * near) * (danger ? 0.65 + 0.35 * Math.sin(S.clock * 22) : 1);
    const sz = 5.5 + 3 * near;
    if (p.rival) radarArrow(x, y, ang, sz, '#ff2d3a', '#ffffff');
    else if (p.fast) radarArrow(x, y, ang, sz, '#22b8e8', '#ffffff');
    else radarArrow(x, y, ang, sz, '#ffcf1f', 'rgba(255,255,255,0.85)');
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.font = '700 9px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('RADAR', cx, cy - r - 5);
}
function zoneGuide() {
  const held = { L: false, R: false };
  for (const z of touches.values()) held[z] = true;
  for (const z of ['L', 'R']) {
    const w = W * 0.35, x0 = z === 'L' ? 0 : W - w;
    const g = ctx.createLinearGradient(z === 'L' ? 0 : W, 0, z === 'L' ? w : W - w, 0);
    const tz = S.tut ? TUT[S.tut.step].zone : null;
    const want = tz && (tz === z || tz === 'LR' || tz === 'both');
    const al = held[z] ? 0.32 : want ? 0.22 + 0.18 * Math.sin(S.clock * 6) : 0.10;
    g.addColorStop(0, (held[z] || want) ? 'rgba(255,207,31,' + al.toFixed(2) + ')' : 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x0, H * 0.45, w, H * 0.55);
  }
}
function drawPops() {
  let y = H * 0.86;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = S.pops.length - 1; i >= 0; i--) {
    const q = S.pops[i], a = clamp(1.3 - q.t, 0, 1), rise = q.t * 26;
    const pop = q.t < 0.12 ? 0.7 + q.t * 2.5 : 1;
    ctx.globalAlpha = a;
    ctx.font = '700 ' + Math.round(q.size * pop) + 'px ' + FONT;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(15,27,45,0.85)'; ctx.lineJoin = 'round';
    ctx.strokeText(q.text, W / 2, y - rise);
    ctx.fillStyle = q.color; ctx.fillText(q.text, W / 2, y - rise);
    y -= q.size * 1.1;
  }
  ctx.globalAlpha = 1;
}

function render() {
  const F0 = F, multNow = Math.min(8, 1 + Math.floor(S.chain / 3));
  F = F0 * (1 + 0.07 * S.slow + 0.012 * (multNow - 1));   // pull in during slow-mo and as the multiplier climbs
  const live = S.live && camBob;
  VX = S.camX; VZ = S.pz - CAM_BACK; VY = CAM_UP;
  HOR = H * 0.34 + (live ? (1 - Math.cos(S.step)) * H * 0.0012 : 0);
  CX = W / 2;
  ctx.save();
  if (S.shake > 0) ctx.translate((R() - 0.5) * S.shake * 6, (R() - 0.5) * S.shake * 6);
  ctx.fillStyle = FOGCSS; ctx.fillRect(-W, -H, 3 * W, 3 * H);
  if (LV.id === 'airport') paintAirport(); else if (LV.id === 'nyc') paintNYC(); else paintShibuya();
  if (LV.id === 'nyc') drawCars();
  for (const p of S.people) if (p.prop === 'spill') drawPerson(p);   // puddles lie under everyone
  const list = S.people.filter(p => p.prop !== 'spill').concat([S.me]).sort((a, b) => b.z - a.z);
  for (const p of list) drawPerson(p);
  ctx.restore();

  if (S.boostV > 0.25) {
    const R = Math.max(W, H), cx = W / 2, cy = H * 0.45, f = Math.floor(S.clock * 14);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 * S.boostV).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = i * 0.393 + 0.1, r1 = R * (0.46 + 0.12 * (((i * 7 + f) % 5) / 5)), r2 = r1 + R * 0.1;
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    }
    ctx.stroke();
  }
  F = F0;
  // combo edge tint, slow-motion vignette, chain-break flash
  if (multNow > 1 || S.slow > 0.02 || S.breakFlash > 0) {
    const g = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    const mc = hex(MULT_COLS[multNow - 1]);
    const tintA = multNow > 1 ? 0.06 + 0.03 * (multNow - 1) : 0;
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, S.breakFlash > 0 ? 'rgba(255,255,255,' + (S.breakFlash * 1.4).toFixed(2) + ')'
      : S.slow > 0.02 ? 'rgba(10,14,30,' + (0.5 * S.slow).toFixed(2) + ')' : 'rgba(' + mc.join(',') + ',' + tintA.toFixed(2) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (state === 'over') {
    const a = clamp(0.35 - S.overT * 0.5, 0, 0.35);
    if (a > 0) { ctx.fillStyle = 'rgba(255,77,79,' + a.toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
  }
  if (state === 'play') { zoneGuide(); rearRadar(); }
  if (state !== 'ready') drawPops();
  if (S.banner && state === 'play') {
    const b = S.banner, a = b.t < 0.2 ? b.t / 0.2 : b.t > 2.0 ? (2.4 - b.t) / 0.4 : 1, y = radarTop + 112;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.font = '700 24px ' + FONT;
    const mt = ctx.measureText(b.text), tw = (mt && mt.width) || 200;
    ctx.fillStyle = 'rgba(15,27,45,0.82)'; rrect(W / 2 - tw / 2 - 16, y - 18, tw + 32, 36, 8); ctx.fill();
    ctx.fillStyle = b.color; ctx.fillRect(W / 2 - tw / 2 - 16, y - 18, 5, 36);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, W / 2 + 2, y + 1);
    ctx.globalAlpha = 1;
  }
}

/* ---------- character preview ---------- */
let PV = null;
function refreshLook() {
  store.set('excuseme_look', JSON.stringify(LOOK));
  PV = makeMe();
  if (S) { const m = makeMe(); m.x = S.me.x; m.z = S.me.z; m.fx = S.me.fx; m.fz = S.me.fz; S.me = m; }
}
function drawPreview(now) {
  const pc = $('preview');
  if (!pc || !pc.getContext) return;
  if (!PV) PV = makeMe();
  const pctx = pc.getContext('2d'), pw = 170, ph = 210;
  if (pc.width !== Math.round(pw * DPR)) { pc.width = Math.round(pw * DPR); pc.height = Math.round(ph * DPR); }
  const saved = [ctx, W, H, F, HOR, CX, VX, VZ, VY, showHB];
  ctx = pctx; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, pw, ph);
  W = pw; H = ph; F = 290; VX = 0; VZ = -3; VY = 1.0; CX = pw / 2; HOR = 92; showHB = false;
  const a = now / 1000 * 0.7;
  PV.fx = Math.sin(a); PV.fz = -Math.cos(a); PV.vx = PV.fx * 1.3; PV.vz = PV.fz * 1.3; PV.x = 0; PV.z = 0;
  PV.phase = now / 1000 * 5.5;
  drawPerson(PV);
  [ctx, W, H, F, HOR, CX, VX, VZ, VY, showHB] = saved;
}
function buildLook() {
  const box = $('opts'); box.innerHTML = '';
  for (const o of LOOK_OPTS) {
    const row = document.createElement('div'); row.className = 'opt';
    const lab = document.createElement('div'); lab.className = 'optl'; lab.textContent = o.label; row.appendChild(lab);
    const wrap = document.createElement('div'); wrap.className = 'sws'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', o.label);
    for (const v of o.vals) {
      const b = document.createElement('button'); b.type = 'button';
      const isObj = o.type === 'color' && typeof v === 'object';
      const val = o.type === 'color' ? (isObj ? v.c : v) : v[0];
      const req = isObj ? v.req : o.type === 'chip' ? (v[2] || 0) : 0;
      const locked = req > totalStars();
      if (o.type === 'color') { b.className = 'sw'; b.style.background = val; b.setAttribute('aria-label', isObj ? v.name : o.label + ' ' + val); }
      else { b.className = 'chip'; b.textContent = v[1]; }
      if (locked) {
        b.disabled = true; b.classList.add('locked');
        b.title = 'Unlock with ' + req + ' stars'; b.setAttribute('aria-label', (isObj ? v.name : (v[1] || val)) + ', locked, needs ' + req + ' stars');
        b.textContent = o.type === 'color' ? req + '★' : v[1] + ' · ' + req + '★';
      }
      b.setAttribute('aria-pressed', String(LOOK[o.key] === val));
      b.addEventListener('click', () => {
        LOOK[o.key] = val;
        wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        refreshLook();
      });
      wrap.appendChild(b);
    }
    row.appendChild(wrap); box.appendChild(row);
  }
}
let lookFrom = 'start';
function openLook(from) {
  lookFrom = from;
  const t = totalStars();
  $('starNote').textContent = '★ ' + t + ' of ' + LEVELS.length * 3 + ' stars. ' + (t < 9 ? 'Earn stars in each level to unlock more gear.' : 'Everything unlocked.');
  buildLook(); refreshLook(); $(from).hidden = true; $('look').hidden = false; }
$('lookBtn').addEventListener('click', () => openLook('start'));
$('endLook').addEventListener('click', () => openLook('end'));
$('lookDone').addEventListener('click', () => { $('look').hidden = true; $(lookFrom).hidden = false; });

/* ---------- music: a procedural 148-158 BPM track whose energy follows your chain and close calls ---------- */
const Music = (() => {
  let ac = null, master = null, sfxBus = null, noiseBuf = null, playing = false, next = 0, step = 0, I = 0.15, target = 0.15;
  let enabled = store.get('excuseme_snd', '1') !== '0', song = LEVELS[0].music;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ac = new AC();
      const comp = ac.createDynamicsCompressor(); comp.connect(ac.destination);
      master = ac.createGain(); master.gain.value = 0; master.connect(comp);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(comp);
      noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.5), ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; return false; }
    return true;
  }
  function kick(t, v, out) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g); g.connect(out || master); o.start(t); o.stop(t + 0.3);
  }
  function noise(t, dur, v, type, freq, q, out) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(out || master); src.start(t); src.stop(t + dur + 0.02);
  }
  function sweep(t, f0, f1, dur, v) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t); src.stop(t + dur + 0.02);
  }
  function tone(t, midi, dur, v, type, cut, out) {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = type; o.frequency.value = mtof(midi); f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(out || master); o.start(t); o.stop(t + dur + 0.05);
  }
  function schedule(st, t) {
    const s16 = 60 / song.bpm / 4, bar = Math.floor(st / 16) % 4, s = st % 16, ch = song.prog[bar];
    if (s % 4 === 0) kick(t, 0.85);
    if (s % 4 === 2) noise(t, 0.05, 0.1 + 0.1 * I, 'highpass', 8000);
    if (I > 0.4 && s % 2 === 1) noise(t, 0.03, 0.04 + 0.06 * I, 'highpass', 9000);
    if (I > 0.3 && (s === 4 || s === 12)) noise(t, 0.14, 0.05 + 0.2 * I, 'bandpass', 1800, 0.8);
    if (s % 4 === 2) tone(t, ch[0] - 24, s16 * 1.8, 0.2, 'sawtooth', 260 + 2400 * I);
    if (s % 4 === 3 && I > 0.5) tone(t, ch[0] - 24, s16 * 0.9, 0.1, 'sawtooth', 260 + 2400 * I);
    if (I > 0.55) { const arp = [0, 1, 2, 1]; tone(t, ch[arp[s % 4]] + 12 + (s >= 8 && I > 0.85 ? 12 : 0), s16 * 0.8, 0.045 * I, 'square', 1800 + 2000 * I); }
    if (s === 0) for (const n of ch) tone(t, n, s16 * 15, 0.022, 'triangle', 1200);
  }
  // Background ambience per level: crowd murmur, plus announcements, traffic, horns or crossing chirps.
  let amb = [], ambLevel = null, ambT = 0, ambT2 = 0;
  function loopNoise(type, freq, q, vol) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.value = 0; g.gain.setTargetAtTime(vol, ac.currentTime, 0.8);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start();
    amb.push({ src, g, f });
  }
  function ambStart(id) {
    ambStop(); ambLevel = id; ambT = 4 + Math.random() * 6; ambT2 = 10 + Math.random() * 10;
    loopNoise('bandpass', id === 'shibuya' ? 900 : 650, 0.6, 0.05);            // crowd murmur
    if (id === 'nyc') loopNoise('lowpass', 180, 0.7, 0.09);                      // traffic rumble
    if (id === 'airport') loopNoise('lowpass', 120, 0.7, 0.03);                  // air handling hum
  }
  function ambStop() {
    for (const a of amb) { try { a.g.gain.setTargetAtTime(0, ac.currentTime, 0.2); a.src.stop(ac.currentTime + 0.8); } catch (e) {} }
    amb = []; ambLevel = null;
  }
  function ambEvents(dt) {
    if (!ambLevel) return;
    for (const a of amb) if (a.f.type === 'bandpass') a.f.frequency.setTargetAtTime(560 + Math.random() * 260, ac.currentTime, 0.4);
    ambT -= dt; ambT2 -= dt;
    const t = ac.currentTime;
    if (ambLevel === 'airport' && ambT <= 0) { ambT = 18 + Math.random() * 14; tone(t, 76, 0.7, 0.05, 'sine', 4000, sfxBus); tone(t + 0.45, 72, 0.9, 0.05, 'sine', 4000, sfxBus); tone(t + 0.9, 67, 1.1, 0.05, 'sine', 4000, sfxBus); }
    if (ambLevel === 'nyc' && ambT <= 0) { ambT = 6 + Math.random() * 9; tone(t, 60, 0.22, 0.03, 'square', 1200, sfxBus); tone(t, 64, 0.22, 0.03, 'square', 1200, sfxBus); if (Math.random() < 0.5) { tone(t + 0.3, 60, 0.4, 0.03, 'square', 1200, sfxBus); tone(t + 0.3, 64, 0.4, 0.03, 'square', 1200, sfxBus); } }
    if (ambLevel === 'nyc' && ambT2 <= 0) {
      ambT2 = 25 + Math.random() * 20;
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
      for (let i = 0; i < 6; i++) { o.frequency.setValueAtTime(700, t + i * 0.5); o.frequency.linearRampToValueAtTime(1050, t + i * 0.5 + 0.25); o.frequency.linearRampToValueAtTime(700, t + i * 0.5 + 0.5); }
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 3.1);
    }
  }
  return {
    ambStart(id) { if (!enabled || !init()) return; ambStart(id); },
    ambStop() { if (ac) ambStop(); },
    chirp() { if (!ac || !enabled || ac.state !== 'running') return; const t = ac.currentTime; for (let i = 0; i < 8; i++) tone(t + i * 0.16, i % 2 ? 98 : 101, 0.09, 0.025, 'sine', 6000, sfxBus); },
    start(m) {
      song = m || song;
      if (!enabled || !init()) return;
      if (ac.resume) ac.resume();
      playing = true; next = ac.currentTime + 0.08; step = 0; I = 0.15; target = 0.15;
      master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0.24, ac.currentTime, 0.3);
    },
    stop() { if (!ac) return; playing = false; master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0, ac.currentTime, 0.25); },
    update(dt) {
      if (ac && ac.state === 'running') ambEvents(dt);
      if (!ac || !playing) return;
      I += (target - I) * Math.min(1, dt * 1.5);
      if (next < ac.currentTime - 0.2) next = ac.currentTime + 0.05;
      const s16 = 60 / song.bpm / 4;
      while (next < ac.currentTime + 0.12) { schedule(step, next); next += s16; step++; }
    },
    target(v) { target = v; },
    sfx(kind) {
      if (!ac || !enabled || ac.state !== 'running') return;
      const t = ac.currentTime;
      if (kind === 'whoosh') sweep(t, 500, 2600, 0.28, 0.22);
      else if (kind === 'razor') { sweep(t, 900, 5200, 0.22, 0.3); tone(t, 88, 0.12, 0.05, 'square', 4000, sfxBus); }
      else if (kind === 'dash') sweep(t, 300, 1500, 0.18, 0.14);
      else if (kind === 'combo') { tone(t, 81, 0.08, 0.05, 'square', 3000, sfxBus); tone(t + 0.08, 88, 0.12, 0.05, 'square', 3000, sfxBus); }
      else if (kind === 'bump') { kick(t, 1, sfxBus); noise(t, 0.25, 0.35, 'lowpass', 500, 0, sfxBus); }
      else if (kind === 'shout') { tone(t, 79, 0.1, 0.06, 'triangle', 4000, sfxBus); tone(t + 0.1, 84, 0.14, 0.06, 'triangle', 4000, sfxBus); }
      else if (kind === 'tick') tone(t, 96, 0.05, 0.06, 'square', 5000, sfxBus);
      else if (kind === 'step') noise(t, 0.035, 0.05, 'highpass', 2200, 0, sfxBus);
      else if (kind === 'slow') { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.5); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.6); }
      else if (kind === 'win') [69, 73, 76, 81].forEach((m, i) => tone(t + i * 0.1, m, 0.35, 0.07, 'triangle', 3000, sfxBus));
    },
    setEnabled(v) { enabled = v; store.set('excuseme_snd', v ? '1' : '0'); if (!v) { this.stop(); this.ambStop(); } else if (state === 'play' || state === 'paused') { this.start(LV.music); this.ambStart(LV.id); } },
    get enabled() { return enabled; },
    suspend() { if (ac && ac.suspend) ac.suspend(); },
    resume() { if (ac && ac.resume && playing) ac.resume(); }
  };
})();
if (document.addEventListener) document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state === 'play') pauseGame(); else Music.suspend(); } });

/* ---------- menus ---------- */
function buildLevels() {
  const box = $('levels'); if (!box || !document.createElement) return;
  box.innerHTML = '';
  const key = todayKey(), dl = LEVELS[hashStr(key + ':level') % LEVELS.length], dbest = parseInt(store.get('excuseme_daily_' + key, '0'), 10) || 0;
  const d = document.createElement('button'); d.type = 'button'; d.className = 'lvl daily';
  d.innerHTML = '<span class="lc"></span><span class="ln"></span><span class="lm"></span><span class="lb"></span>';
  d.children[0].textContent = 'Daily run · ' + key;
  d.children[1].textContent = dl.name;
  d.children[2].textContent = dbest ? 'today ' + fmt(dbest) : 'Play';
  d.children[3].textContent = 'Same seeded crowd for everyone today. Tap to start.';
  d.addEventListener('click', startDaily);
  box.appendChild(d);
  LEVELS.forEach((L, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lvl';
    b.setAttribute('aria-pressed', String(i === LVI));
    const best = bestOf(L.id);
    b.innerHTML = '<span class="lc"></span><span class="ln"></span><span class="lm"></span><span class="lb"></span>';
    b.children[0].textContent = (i + 1) + ' · ' + L.city;
    b.children[1].textContent = L.name;
    const st = starsOf(L.id);
    const lm = b.children[2], ss = document.createElement('span');
    lm.textContent = ''; ss.className = 'st'; ss.textContent = [1, 2, 4].map(bit => st & bit ? '★' : '☆').join('');
    lm.appendChild(ss); lm.appendChild(document.createElement('br'));
    lm.appendChild(document.createTextNode(L.goal + ' m' + (best ? ' · ' + fmt(best) : '')));
    b.children[3].textContent = L.blurb;
    b.addEventListener('click', () => { setLevel(i); reset(); buildLevels(); });
    box.appendChild(b);
  });
}
$('go').addEventListener('click', () => start(false));
$('again').addEventListener('click', () => start(lastDaily));
$('tutBtn').addEventListener('click', () => { store.set('excuseme_tut', '0'); start(); });
$('tutSkip').addEventListener('click', e => { e.stopPropagation(); if (S.tut) endTut(); });
$('tutSkip').addEventListener('pointerdown', e => e.stopPropagation());
$('next').addEventListener('click', () => { setLevel(Math.min(LEVELS.length - 1, LVI + 1)); start(false); });
$('menu').addEventListener('click', () => { Music.ambStop(); toMenu(); });
$('pauseBtn').addEventListener('click', e => { e.stopPropagation(); pauseGame(); });
$('pauseBtn').addEventListener('pointerdown', e => e.stopPropagation());
$('resume').addEventListener('click', resumeGame);
$('restart').addEventListener('click', () => { $('pause').hidden = true; Music.ambStop(); start(lastDaily); });
$('pmenu').addEventListener('click', () => { Music.stop(); Music.ambStop(); toMenu(); });
window.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (k === 'escape' || k === 'p') { if (state === 'play') pauseGame(); else if (state === 'paused') resumeGame(); } });
document.querySelectorAll('.vibt').forEach(el => {
  el.checked = vibOn;
  el.addEventListener('change', e => { vibOn = e.target.checked; document.querySelectorAll('.vibt').forEach(o => { o.checked = vibOn; }); try { localStorage.setItem('excuseme_vib', vibOn ? '1' : '0'); } catch (err) {} });
});
document.querySelectorAll('.hbt').forEach(el => el.addEventListener('change', e => {
  showHB = e.target.checked; document.querySelectorAll('.hbt').forEach(o => { o.checked = showHB; });
}));
document.querySelectorAll('.bobt').forEach(el => {
  el.checked = camBob;
  el.addEventListener('change', e => { camBob = e.target.checked; document.querySelectorAll('.bobt').forEach(o => { o.checked = camBob; }); store.set('excuseme_bob', camBob ? '1' : '0'); });
});
document.querySelectorAll('.sndt').forEach(el => {
  el.checked = Music.enabled;
  el.addEventListener('change', e => { Music.setEnabled(e.target.checked); document.querySelectorAll('.sndt').forEach(o => { o.checked = e.target.checked; }); });
});

const last = { dist: -1, en: -1, low: null, score: -1, chain: -1, tl: -1, cd: -1 };
function hud() {
  if (state === 'ready') return;
  const dm = Math.floor(S.pz);
  if (dm !== last.dist) { last.dist = dm; $('dist').textContent = dm + ' / ' + LV.goal + ' m'; $('prog').style.width = (clamp(S.pz / LV.goal, 0, 1) * 100).toFixed(1) + '%'; }
  const sc = Math.floor(S.score);
  if (sc !== last.score) { last.score = sc; $('score').textContent = fmt(sc); }
  const en = Math.round(S.energy);
  if (en !== last.en) { last.en = en; $('en').style.width = en + '%'; }
  if (S.exhausted !== last.low) { last.low = S.exhausted; $('en').classList.toggle('low', S.exhausted); }
  if (S.chain !== last.chain) {
    last.chain = S.chain;
    $('combo').classList.toggle('off', S.chain === 0);
    $('mult').textContent = '×' + Math.min(8, 1 + Math.floor(S.chain / 3));
    $('chain').textContent = S.chain + ' chain';
  }
  if (S.chain > 0) $('cbar').style.width = (clamp(1 - (S.time - S.lastPassT) / CHAIN_WINDOW, 0, 1) * 100).toFixed(0) + '%';
  const tl = Math.max(0, Math.ceil(S.timeLeft));
  if (tl !== last.tl) {
    last.tl = tl;
    const ck = $('clock');
    ck.innerHTML = '<small>' + LV.timerLabel + '</small>' + Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0');
    ck.classList.toggle('low', tl <= 15);
  }
  const cd = Math.ceil(S.shoutCD);
  if (cd !== last.cd) {
    last.cd = cd; const sh = $('shout');
    sh.classList.toggle('ready', cd === 0);
    sh.textContent = cd === 0 ? 'Excuse me ready' : 'Excuse me in ' + cd;
  }
}

let lastT = performance.now();
const dtHist = [];
function frame(now) {
  const raw = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
  dtHist.push(raw); if (dtHist.length > 4) dtHist.shift();
  const dt = raw > 0.04 ? raw : dtHist.reduce((a, b) => a + b, 0) / dtHist.length;   // average the last few frames; keep real long gaps
  // slow motion runs on real time so it always lasts the same
  S.slowT -= dt; S.slow += ((S.slowT > 0 ? 1 : 0) - S.slow) * Math.min(1, dt * (S.slowT > 0 ? 14 : 5));
  S.breakFlash = Math.max(0, S.breakFlash - dt);
  const gdt = dt * (1 - 0.68 * S.slow);
  const n = Math.max(1, Math.ceil(gdt / 0.0167));
  if (state !== 'paused') for (let i = 0; i < n; i++) tick(gdt / n);
  render(); hud();
  Music.update(dt);
  if (!$('look').hidden) drawPreview(now);
  requestAnimationFrame(frame);
}
reset();
buildLevels();
window.__excuse = { tick, reset, start, setLevel, get S() { return S; }, get state() { return state; }, keys, action, onTap, render, drawPreview, LEVELS, runEvent, shout };
requestAnimationFrame(frame);
})();
