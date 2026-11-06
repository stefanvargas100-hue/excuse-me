import { Music } from '../audio/music.js';
import { LEVELS, LV, LVI, SPAWN_FAR, setLevel } from '../config/levels.js';
import { BASE, BOOST, CHAIN_WINDOW, LAT_ACC, LAT_MAX, REGEN } from '../config/tuning.js';
import { R, clamp, hashStr, mulberry32, pick, rnd, setR, todayKey, weekKey } from '../config/util.js';
import { $ } from '../dom.js';
import { COST_DASH, DASH_V, action, keys, pendingDash, setPendingDash, touches } from '../input/input.js';
import { radarTop, setRadarTop } from '../render/hud.js';
import { track, trackMax } from '../save/challenges.js';
import { buzz, store } from '../save/store.js';
import { banner } from './actions.js';
import { collide, updMe, updPeople } from './crowd.js';
import { genChunk, runEvent, scramble, seeded, spawnFast, spawnRival, updXings, walker } from './people.js';
import { addPop, onPass } from './scoring.js';
import { S, bestOf, endShown, goalOf, reset, setEndShown, setState, state } from './state.js';
import { BUMP_SPEED, draftMul, finishRace, fmtTime, initRace, leadZ, ordinal, raceBest, raceCollide, raceCountdown, racePace, rearZ, updRace } from './race.js';
import { updCars } from './traffic.js';
import { beginTut, tutTick } from './tutorial.js';
import { buildLevels, last } from '../ui/menus.js';



/* ---------- simulation ---------- */
function movePlayer(dt) {
  let steer = 0;
  for (const z of touches.values()) steer += z === 'L' ? -1 : 1;
  steer += keys.l && keys.r ? (keys.last === 'l' ? -1 : 1) : keys.l ? -1 : keys.r ? 1 : 0;   // both keys down: the newest one wins, so a stuck key cannot cancel you
  steer = clamp(steer, -1, 1);
  S.shoutCD = Math.max(0, S.shoutCD - dt);
  if (S.slipT > 0) { S.slipT -= dt; steer = 0; }
  if (S.tut) S.tutHold = steer > 0 ? Math.max(0, S.tutHold) + dt : steer < 0 ? Math.min(0, S.tutHold) - dt : 0;
  S.burstT -= dt; S.dashT -= dt; S.dashCool -= dt; S.flash -= dt;
  S.bumpT = Math.max(0, S.bumpT - dt); S.ghostT = Math.max(0, S.ghostT - dt);   // race mode only: a bump leaves you slow for a moment
  const bursting = S.burstT > 0 && S.bumpT <= 0;
  const st = S.race ? S.race.me : null;   // stats only ever apply in a race
  if (!bursting && S.dashT <= 0) S.energy = Math.min(100, S.energy + REGEN * (st ? st.regen : 1) * dt);
  S.exhausted = S.energy < COST_DASH || S.flash > 0;
  S.boostV += ((bursting || S.draftT > 0 ? 1 : 0) - S.boostV) * Math.min(1, dt * 8);
  if (S.boostV < 0.2) S.boostPasses = 0;
  const weave = 1 - 0.14 * Math.min(1.4, Math.abs(S.vx) / LAT_MAX);   // weaving costs a little forward speed
  const pace = S.race ? racePace(S.chain, S.energy) * draftMul(S) : 1;   // race mode: combo speeds you up, low stamina slows you down
  const target = (bursting ? BOOST : BASE) * weave * pace * (st ? st.speed : 1) * (S.bumpT > 0 ? BUMP_SPEED : 1);
  S.speed += (target - S.speed) * Math.min(1, dt * (st && target > S.speed ? st.accel : 5));
  if (S.dashT > 0) S.vx = S.dashDir * DASH_V;
  else if (S.slipT > 0) S.vx *= Math.max(0, 1 - dt * 0.4);   // sliding: no grip
  else {
    const acc = (Math.abs(S.vx) > LAT_MAX ? LAT_ACC * 2.2 : LAT_ACC) * (st ? st.lat : 1);   // shed dash speed quickly
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

export function tick(dt) {
  S.clock += dt;
  for (const q of S.pops) q.t += dt;
  if (S.banner) { S.banner.t += dt; if (S.banner.t > 2.4) S.banner = null; }
  S.pops = S.pops.filter(q => q.t < 1.3);
  S.camX += (S.px - S.camX) * (1 - Math.exp(-dt * 5));
  updMe(dt);
  updCars(dt);
  if (state === 'play') {
    if (S.race && S.race.countT > 0) { raceCountdown(dt); return; }   // 3-2-1-GO: everything holds still
    S.time += dt;
    if (S.kind === 'classic' && S.pz > S.farMark) { S.farMark += 5; trackMax('far_' + LV.id, S.pz); }
    if (pendingDash && performance.now() >= pendingDash.at) { action(pendingDash.z); setPendingDash(null); }
    movePlayer(dt);
    S.me.x = S.px; S.me.z = S.pz;
    if (S.tut) {
      tutTick(dt);
      if (S.tut) { updPeople(dt); S.people = S.people.filter(p => !p.dead && p.z > S.pz - 16); return; }
    }
    while (S.nextChunk < leadZ() + SPAWN_FAR && S.nextChunk < goalOf() - 15) { genChunk(S.nextChunk); S.nextChunk += 4; }
    const prog = clamp(S.pz / LV.goal, 0, 1);
    S.fastT -= dt;
    if (S.fastT <= 0) { spawnFast(true); if (R() < 0.3) spawnFast(true); S.fastT = rnd(LV.fastEvery[0], LV.fastEvery[1]) * (1.3 - 0.6 * prog); }
    S.rivalT -= dt;
    if (S.rivalT <= 0 && S.pz > 25 && S.pz < goalOf() - 40) { spawnRival(); S.rivalT = rnd(LV.rivalEvery[0], LV.rivalEvery[1]) * (1.2 - 0.5 * prog); }
    if (LV.id === 'nyc') updXings();
    // clock
    S.timeLeft -= dt;
    const sec = Math.ceil(S.timeLeft);
    if (sec !== S.lastSec) { S.lastSec = sec; if (sec <= 10 && sec > 0) { Music.sfx('tick'); if (sec <= 5) buzz(6); } }
    if (S.timeLeft <= 0 && !S.race) { loseTime(); return; }
    // scripted crowd moments
    S.eventT -= dt;
    if (S.eventT <= 0 && S.pz < goalOf() - 60) { seeded(':e' + (S.evN++), () => runEvent(pick(LV.events))); S.eventT = rnd(16, 24); }
    // rush hour surges
    if (S.pz < goalOf() - 50) {
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
    if (LV.id === 'shibuya') { S.waveT -= dt; if (S.waveT <= 0 && S.pz < goalOf() - 60) { scramble(); S.waveT = rnd(8, 11); } }
    updPeople(dt);
    if (S.race) updRace(dt);
    S.people = S.people.filter(p => !p.dead && p.z > rearZ() - 16);
    if (S.race) raceCollide(dt);   // race: people are solid, you are stopped and slowed
    else { const hit = collide(); if (hit) { lose(hit); return; } }
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
    if (S.pz >= goalOf()) { if (S.race) winRace(); else win(); }
  } else if (state === 'ready') {
    updPeople(dt);
    S.people = S.people.filter(p => !p.dead);
  } else {
    S.overT += dt;
    if (!endShown && S.overT > (state === 'won' ? 0.5 : 0.8)) showEnd();
  }
}

function recordBest() {
  S.score = Math.floor(S.score);
  if (S.daily || S.weekly) {
    const k = 'excuseme_' + (S.daily ? 'daily_' : 'weekly_') + S.dailyKey, b = parseInt(store.get(k, '0'), 10) || 0;
    S.newBest = S.score > b; if (S.newBest) store.set(k, String(S.score));
    return;
  }
  const b = bestOf(LV.id);
  S.newBest = S.score > b;
  if (S.newBest) store.set('excuseme_best_' + LV.id, String(S.score));
}

function lose(p) { if (S.daily) track('dailyRuns'); if (S.weekly) track('weeklyRuns'); if (S.kind === 'classic') { trackMax('far_' + LV.id, S.pz); trackMax('bestScore', S.score); } setState('over'); S.live = false; p.hit = true; S.overT = 0; touches.clear(); Music.sfx('bump'); Music.stop(); Music.ambStop(); buzz([60, 40, 140]); recordBest(); }

function loseTime() {
  setState('over'); S.live = false; S.timeout = true; S.overT = 0; touches.clear();
  Music.sfx('bump'); Music.stop(); Music.ambStop(); buzz([100, 60, 100]); recordBest();
}

function win() {
  setState('won'); S.live = false; S.overT = 0; S.pz = LV.goal; touches.clear();
  S.timeBonus = Math.max(0, Math.round(S.timeLeft * 15));
  S.score += 1000 + S.timeBonus;
  Music.sfx('win'); Music.stop(); Music.ambStop(); buzz([20, 60, 20, 60, 80]);
  recordBest();
}

function winRace() {
  setState('won'); S.live = false; S.overT = 0; S.pz = LV.goal; touches.clear();
  finishRace();
  Music.sfx('win'); Music.stop(); Music.ambStop(); buzz([20, 60, 20, 60, 80]);
}

export const fmt = n => Math.floor(n).toLocaleString('en-US');

function showEnd() {
  setEndShown(true);
  if (S.race) { showRaceEnd(); return; }
  resetEndLabels();
  const won = state === 'won';
  const seededRun = S.daily || S.weekly;
  $('endEyebrow').textContent = LV.city + ' · ' + LV.name;
  const t = $('endTitle'); t.textContent = won ? 'Made it' : S.timeout ? 'Too late' : 'Bump'; t.className = won ? 'good' : 'bad';
  $('endLead').textContent = won
    ? 'You reached ' + LV.goalText + ' in ' + Math.floor(S.time / 60) + ':' + String(Math.floor(S.time % 60)).padStart(2, '0') + ' without touching anyone. Finish bonus 1,000, time bonus ' + fmt(S.timeBonus) + '.'
    : S.timeout ? LV.timeFail + ' You were ' + Math.max(0, LV.goal - Math.floor(S.pz)) + ' m short of ' + LV.goalText + '.'
    : 'You walked into ' + (S.people.some(p => p.hit && p.prop) ? 'something' : 'someone') + ' ' + Math.floor(S.pz) + ' m in' + (S.pz >= LV.goal ? ', past ' + LV.goalText + '.' : '.') + (seededRun ? (S.daily ? ' That was your one run for today. Come back tomorrow for a new crowd.' : ' That was your one run for this week. Come back on Monday for a new crowd.') : '');
  $('sScoreLabel').textContent = S.newBest ? 'Score · new best' : 'Score';
  $('sScore').textContent = fmt(S.score);
  $('sBest').textContent = fmt(seededRun ? S.score : bestOf(LV.id));
  $('sDist').textContent = Math.floor(S.pz) + ' m';
  $('sChain').textContent = S.bestChain;
  $('sClose').textContent = S.close;
  $('sPassed').textContent = S.passed;
  $('sRival').textContent = S.dodged;
  showUnlocks();
  if (S.daily) { $('endEyebrow').textContent = 'Daily run · ' + S.dailyKey + ' · ' + LV.name; }
  if (S.weekly) { $('endEyebrow').textContent = 'Weekly run · ' + S.dailyKey + ' · ' + LV.name; }
  const nx = $('next');
  nx.hidden = true;
  $('again').hidden = !!seededRun;   // daily and weekly runs are one try only
  $('again').textContent = 'Try again'; $('again').className = 'big';
  $('end').hidden = false;
}

const END_LABELS = { sScore: 'Score', sBest: 'Best score', sDist: 'Distance', sChain: 'Longest chain' };
function setStat(id, label, value) { $(id).textContent = value; const dt = $(id).previousElementSibling; if (dt) dt.textContent = label; }
function resetEndLabels() {
  for (const id in END_LABELS) { const dt = $(id).previousElementSibling; if (dt) dt.textContent = END_LABELS[id]; }
  $('raceBoard').hidden = true;
  $('sScoreLabel').textContent = END_LABELS.sScore;
}

function showUnlocks() {
  const un = $('unlockNote');
  un.hidden = !S.unlocked.length;
  if (S.unlocked.length) un.textContent = 'Unlocked: ' + S.unlocked.join(', ') + '. Try it in Change look.';
}

function showRaceEnd() {
  const R = S.race, n = R.board.length, place = R.place;
  $('endEyebrow').textContent = 'Race · ' + LV.city + ' · ' + LV.name + ' · ' + R.diff.name + ' bots';
  const t = $('endTitle'); t.textContent = place === 1 ? 'You win!' : ordinal(place) + ' of ' + n; t.className = place === 1 ? 'good' : 'bad';
  $('endLead').textContent = place === 1 ? 'First to ' + LV.goalText + '. Bumps cost you time, so a clean run wins.' : 'Not first this time. Every bump costs about a second and a half, so stay clean and look for gaps.';
  $('sScoreLabel').textContent = 'Finish time'; $('sScore').textContent = fmtTime(S.time);
  const best = raceBest(LV.id);
  setStat('sBest', R.newBest ? 'Best time · new best' : 'Best win time', best ? fmtTime(best) : '-');
  setStat('sDist', 'Place', ordinal(place) + ' of ' + n);
  setStat('sChain', 'Bumps', String(S.bumps));
  $('sClose').textContent = S.close; $('sPassed').textContent = S.passed; $('sRival').textContent = S.dodged;
  const bd = $('raceBoard'); bd.hidden = false; bd.innerHTML = '';
  const lead = R.board[0];
  R.board.forEach((r, i) => {
    const li = document.createElement('li'); if (r.me) li.className = 'me';
    const gap = r.done ? (i === 0 ? fmtTime(r.finishT) : '+' + (r.finishT - lead.finishT).toFixed(1) + ' s') : Math.max(1, Math.round(LV.goal - r.z)) + ' m to go';
    li.textContent = (i + 1) + '. ' + r.name + ' · ' + gap;
    bd.appendChild(li);
  });
  showUnlocks(); $('next').hidden = true; $('again').hidden = false;
  $('again').textContent = 'Race again'; $('again').className = 'big';
  $('end').hidden = false;
}

export let lastDaily = false, lastMode = 'classic';

// One try per day and per week, remembered on this device. Quitting mid-run still uses the try.
export const playedKey = mode => store.get('excuseme_played_' + mode, '');
export const periodKey = mode => (mode === 'weekly' ? weekKey() : todayKey());
export const hasPlayed = mode => playedKey(mode) === periodKey(mode);
export const dailyLevel = () => hashStr(todayKey() + ':level') % LEVELS.length;
export const weeklyLevel = () => hashStr(weekKey() + ':wlevel') % LEVELS.length;
export function startDaily() { if (hasPlayed('daily')) return; setLevel(dailyLevel()); start('daily'); }
export function startWeekly() { if (hasPlayed('weekly')) return; setLevel(weeklyLevel()); start('weekly'); }

// start('classic' | 'race' | 'daily' | 'weekly'); the older start(true) and start(false, 'race') forms still work.
export function start(a, b) {
  const mode = a === true ? 'daily' : typeof a === 'string' ? a : (b || lastMode);
  const daily = mode === 'daily', weekly = mode === 'weekly', key = daily || weekly ? periodKey(mode) : null;
  if (key) { if (hasPlayed(mode)) return; store.set('excuseme_played_' + mode, key); }
  lastDaily = daily; lastMode = mode;
  setR(key ? mulberry32(hashStr(key)) : Math.random);
  reset();
  S.mode = mode; S.kind = mode; S.endless = mode !== 'race'; S.seed = key;
  if (S.endless) S.timeLeft = Infinity;
  if (mode === 'race') initRace(3);
  S.daily = daily; S.weekly = weekly; S.dailyKey = key; for (const k in last) last[k] = k === 'low' ? null : -1; S.live = true; setState('play'); setEndShown(false);
  $('start').hidden = true; $('end').hidden = true; $('look').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
  const hb = $('hud').getBoundingClientRect ? $('hud').getBoundingClientRect() : null;
  setRadarTop(hb && hb.bottom ? hb.bottom + 6 : 120);
  if (LV.id === 'shibuya') { S.waveT = 1.5; }
  if (mode === 'classic' && store.get('excuseme_tut', '0') !== '1') beginTut();
  Music.start(LV.music); Music.ambStart(LV.id);
}

export function pauseGame() {
  if (state !== 'play') return;
  setState('paused'); touches.clear(); Music.suspend();
  $('pauseEyebrow').textContent = (S.race ? 'Race · ' : '') + LV.city + ' · ' + LV.name + ' · ' + Math.floor(S.pz) + ' m';
  $('restart').hidden = !!(S.daily || S.weekly);   // daily and weekly runs are one try
  $('pause').hidden = false;
}

export function resumeGame() { if (state !== 'paused') return; $('pause').hidden = true; setState('play'); Music.resume(); }

export function toMenu() {
  setR(Math.random); $('tut').hidden = true;
  $('pause').hidden = true;
  setState('ready'); reset(); $('end').hidden = true; $('hud').hidden = true; $('start').hidden = false; buildLevels();
}
