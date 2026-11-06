import { Music } from '../audio/music.js';
import { R, pick, sgn } from '../config/util.js';
import { BURST_T, COST_BURST, COST_DASH, DASH_T } from '../input/input.js';
import { buzz } from '../save/store.js';
import { S } from './state.js';


const POLITE = ['Oh, sorry!', 'Go ahead.', 'My bad.', 'Sure!', 'Oops, sorry.'];

// "Excuse me": up to two people just ahead of you step aside. Rivals refuse; phone zombies may not hear.
export function shout() {
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

export function banner(text, color) { S.banner = { text, color, t: 0 }; }

export function tryBurst() {
  if (S.burstT > 0) return;
  if (S.energy < COST_BURST) { S.flash = 0.45; return; }
  S.energy -= COST_BURST; S.burstT = BURST_T; S.heat = Math.min(0.9, S.heat + 0.12); Music.sfx('dash');
}

export function tryDash(dir) {
  if (S.dashT > 0 || S.dashCool > 0) return;
  if (S.energy < COST_DASH) { S.flash = 0.45; return; }
  S.energy -= COST_DASH; S.dashT = DASH_T; S.dashDir = dir; S.dashCool = 0.45; S.lastDashT = S.time; Music.sfx('dash');
}
