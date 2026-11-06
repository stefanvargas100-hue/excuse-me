import { Music } from '../audio/music.js';
import { MULT_COLS, REACT } from '../config/colour.js';
import { LV } from '../config/levels.js';
import { CHAIN_WINDOW, R_PLAYER } from '../config/tuning.js';
import { R, pick, sgn } from '../config/util.js';
import { track, trackMax } from '../save/challenges.js';
import { buzz } from '../save/store.js';
import { S } from './state.js';



/* ---------- scoring ---------- */
export function addPop(text, color, size) {
  S.pops.push({ text, color, size, t: 0 });
  if (S.pops.length > 6) S.pops.shift();
}

const TAG_TALLY = { RAZOR: 'razor', CLOSE: 'close', 'THREAD THE NEEDLE': 'thread', SNAKE: 'snake', 'SWEEP LEFT': 'sweep', 'SWEEP RIGHT': 'sweep', 'MEGA SWEEP': 'mega', 'BULLET TRAIN': 'bullet', JUKE: 'juke', 'SALMON RUN': 'salmon', 'RIVAL BURNED': 'burned' };

export function onPass(p) {
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
  if (gap < 0.15) { pts += 50; S.close++; track('close'); tags.push(['RAZOR', '#ff4d4f']); S.heat = Math.min(0.9, S.heat + 0.45); sound = 'razor'; }
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
  track('passes'); trackMax('chain', S.bestChain);
  for (const t of tags) { addPop(t[0], t[1], 30); const name = TAG_TALLY[t[0]]; if (name) track(name); }
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
  if (mult === 8 && S.multPrev < 8) track('x8');
  if (mult > S.multPrev) { addPop('×' + mult + ' MULTIPLIER', MULT_COLS[mult - 1], 26); buzz([10, 30, 10]); }
  S.multPrev = mult;
}
