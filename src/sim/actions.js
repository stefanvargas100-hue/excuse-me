import { Music } from '../audio/music.js';
import { LV } from '../config/levels.js';
import { glassBetween } from '../config/strips.js';
import { R, sgn } from '../config/util.js';
import { addPop } from './scoring.js';
import { BURST_T, COST_BURST, COST_DASH, DASH_T } from '../input/input.js';
import { track } from '../save/challenges.js';
import { buzz } from '../save/store.js';
import { S } from './state.js';


const PERFECT_SHOUT_M = 2.4;     // a shout this close to someone counts as well timed
const PERFECT_DASH_M = 1.6;      // a dash this close to someone counts as a perfect dodge
export const PERFECT_T = 1.0, PERFECT_SPEED = 1.08;   // the speed reward for a perfect dash

const POLITE = ['Oh, sorry!', 'Go ahead.', 'My bad.', 'Sure!', 'Oops, sorry.'];

export const SHOUT_CD = 5.5;       // recharge; a well-timed call gets 2 s back

// "Excuse me": up to four people ahead step aside, enough to open a gap in a big crowd. Rivals refuse; phone zombies may not hear.
// The player and the bots share these three steps, so a bot gets no bigger range, shorter recharge or surer timing than you.
// who is anyone with an x and a z. People on the other side of the airport glass cannot hear or reach you.
const reach = (who, p) => !p.prop && !p.dead && !glassBetween(LV.id, who.x, who.z, p.x, p.z);
// Timing: calling right before you would hit someone works better. More people move, they move further,
// even people on their phones hear you, and the recharge is shorter.
export const wellTimed = who => S.people.some(p => reach(who, p) && !p.rival && p.z - who.z > 0.2 && p.z - who.z < PERFECT_SHOUT_M && Math.abs(p.x - who.x) < 0.7);
export function shoutTargets(who, perfect, skipBusy) {
  return S.people.filter(p => reach(who, p) && p.z - who.z > 0.2 && p.z - who.z < (perfect ? 9 : 7.5) && Math.abs(p.x - who.x) < (perfect ? 2.6 : 2.0) && !(skipBusy && p.aside > 0))
    .sort((a, b) => a.z - b.z).slice(0, perfect ? 6 : 4);
}
export function shoutReact(near, who, perfect, rng) {
  const choose = a => a[(rng() * a.length) | 0];
  for (const p of near) {
    if (p.rival) { p.react = { t: 0, text: choose(['No.', 'Nope.', 'Wait your turn.']), up: false }; continue; }
    if (p.phone && !perfect && rng() < 0.5) { p.react = { t: 0, text: '…', up: false }; continue; }
    p.react = { t: 0, text: choose(POLITE), up: false };
    p.aside = perfect ? 1.7 : 1.3; p.asideDir = Math.abs(p.x - who.x) > 0.15 ? sgn(p.x - who.x) : choose([-1, 1]);
  }
}

export function shout() {
  if (S.duel?.startRemaining && S.race.countT > 0) return;
  if (S.shoutCD > 0) return;
  S.shoutCD = SHOUT_CD; track('shouts');
  const who = { x: S.px, z: S.pz }, perfect = wellTimed(who);
  if (perfect) { S.shoutCD -= 2; S.score += 100; track('perfectShouts'); S.tutPerfectShout = true; addPop('PERFECT EXCUSE ME', '#ff6b9d', 28); buzz([10, 20, 10]); Music.sfx('perfect'); }
  S.me.react = { t: 0, text: 'Excuse me!', up: false };
  Music.sfx('shout'); buzz(8);
  shoutReact(shoutTargets(who, perfect, false), who, perfect, R);
}

export function banner(text, color) { S.banner = { text, color, t: 0 }; }

export function tryBurst() {
  if (S.burstT > 0) return;
  if (S.energy < COST_BURST) { S.flash = 0.45; return; }
  S.energy -= COST_BURST; S.burstT = BURST_T; track('bursts'); S.heat = Math.min(0.9, S.heat + 0.12); Music.sfx('dash');
}

export function tryDash(dir) {
  if (S.dashT > 0 || S.dashCool > 0) return;
  // Timing: dash at the last moment before contact and it costs nothing and gives you a burst of pace.
  const perfect = S.people.some(p => !p.dead && p.z - S.pz > 0.1 && p.z - S.pz < PERFECT_DASH_M && p.circles.some(c => Math.abs(p.x + c.ox - S.px) < 0.55));
  if (S.energy < COST_DASH && !perfect) { S.flash = 0.45; return; }
  if (S.lesson) { let dz = null; for (const p of S.people) if (!p.dead && !p.prop && p.z - S.pz > 0.1 && (dz === null || p.z - S.pz < dz)) dz = p.z - S.pz; S.lesson.log.push({ k: 'dash', perfect, dz }); }
  if (perfect) { S.perfectT = PERFECT_T; S.score += 100; track('perfectDashes'); addPop('PERFECT DASH', '#2ec4b6', 28); buzz([10, 20, 10]); Music.sfx('perfect'); }
  else S.energy -= COST_DASH;
  S.dashT = DASH_T; track('dashes'); S.dashDir = dir; S.dashCool = 0.45; S.lastDashT = S.time; Music.sfx('dash');
}
