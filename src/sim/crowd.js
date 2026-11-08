import { RIVAL_LINES } from '../config/colour.js';
import { beltAt, beltHasZ, beltInfo, beltSpeedAt, contain } from '../config/strips.js';
import { LV, halfAt } from '../config/levels.js';
import { R_PLAYER, walkSpeed } from '../config/tuning.js';
import { R, clamp, pick, rnd, sgn } from '../config/util.js';
import { addPop } from './scoring.js';
import { S, goalOf, state } from './state.js';



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
      // weekly challenge: the direction comes from the person's own seeded phase, not from the shared random stream, so it cannot depend on how the player ran
      if (!p.tele && dz < p.swAt + 3 && dz > 0) { const u = S.challenge ? p.ph / 6.2831853 : R(); p.tele = true; p.swDir = u < 0.7 ? (Math.sign(S.px - p.x) || 1) : S.challenge ? (u < 0.85 ? -1 : 1) : pick([-1, 1]); }
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
  // tells: a person about to cut leans that way first, and a tourist lifts their phone before stopping dead
  const wantLean = p.tele ? p.swDir * 0.07 : 0;
  p.lean = (p.lean || 0) + (wantLean - (p.lean || 0)) * Math.min(1, dt * 7);
  p.aim = p.photo > 0 && p.photo < 1.0;
  if (p.photo > 0 && Math.abs(p.z - S.pz) < 30) {        // tourist stops dead for a photo
    p.photo -= dt;
    if (p.photo <= 0) { p.stopT = rnd(2, 3.2); p.v0save = p.v0; p.v0 = 0; p.phone = true; p.faceTo = [1, 0]; }
  }
  if (p.stopT > 0) { p.stopT -= dt; if (p.stopT <= 0) { p.v0 = p.v0save; p.phone = false; p.faceTo = null; p.photo = -1; } }
  if (p.wait && p.wait.walk && p.v0 === 0) { p.v0 = walkSpeed(1.25, 0.18); p.laneX = p.turnX === null ? p.x : null; p.wait = null; }
  if (p.turnX !== null && !p.wait && sgn(p.hx) * (p.x - p.turnX) >= 0) { p.hx = 0; p.hz = p.turnDir; p.dirz = p.turnDir; p.turnX = null; p.free = false; p.laneX = p.x; }
}

export function updPeople(dt) {
  const ppl = S.people, n = ppl.length, me = S.meProxy;
  me.x = S.px; me.z = S.pz; me.vx = state === 'play' ? S.vx : 0; me.vz = state === 'play' ? S.speed : 0;
  const lim = LV.half - 0.35, wallLim = LV.half - 0.75;
  for (let i = 0; i < n; i++) {
    const p = ppl[i];
    if (p.drive && !p.dead) {   // a baggage cart: waits at the wall, then drives across once you are close, and is gone on the far side
      if (!p.driving && p.z - S.pz < p.driveAt) { p.driving = true; if (state === 'play') addPop('BEEP BEEP', '#ffcf1f', 24); }
      if (p.driving) { p.vx = p.drive; p.x += p.drive * dt; if (Math.sign(p.drive) * p.x - (p.len || 0) > LV.half + 4) p.dead = true; }
      continue;
    }
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
    const px0 = p.x;
    p.x += p.vx * dt; p.z += p.vz * dt;
    if (S.race && LV.id === 'airport') {
      const bd0 = beltAt(LV.id, p.x, p.z), B = beltInfo(LV.id);
      if (!p.free && !p.locked) {
        // nobody walks a walkway the wrong way: whoever is on the reverse belt steps over to the divider, and people on the belt
        // that goes your way face the way it goes. The divider is shut to the crowd so they cannot wander back.
        if (bd0 < 0) p.vx = Math.min(p.vx, -2.4);
        else if (bd0 > 0 && p.hz < 0 && p.v0 > 0 && !p.rival) { p.hz = 1; p.hx = 0; p.dirz = 1; }
        if (px0 <= B.rev[0] && p.x > B.rev[0] - 0.05 && beltHasZ(B, p.z)) { p.x = B.rev[0] - 0.05; p.vx = Math.min(p.vx, 0); }
        // a rider who stood still on the belt walks on once the belt ends, instead of standing at the exit
        if (p.belt && p.v0 === 0 && bd0 === 0 && !beltHasZ(B, p.z)) { p.v0 = 1.25; p.yieldP = 1; }
      }
      p.z += beltSpeedAt(LV.id, p.x, p.z) * dt;   // moving walkway carries everyone on it
      if (!p.free) { const cx = contain(LV.id, px0, p.x, p.z); if (cx !== p.x) { p.x = cx; p.vx = 0; } }   // and the glass keeps them on it, or off it
    }
    const pathLim = Math.min(lim, halfAt(p.z) - 0.35);
    if (!p.free && Math.abs(p.x) > pathLim) { p.x = clamp(p.x, -pathLim, pathLim); if (p.locked) p.vx = 0; }
    if (p.exit && Math.abs(p.x) > (LV.id === 'shibuya' ? 14.5 : LV.half + 0.2)) p.dead = true;
    if (p.z > goalOf() - 1.5 && p.hz > 0) { p.hz = -p.hz; p.dirz = -1; }
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

export function updMe(dt) {
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

export function collide() {
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
