import { Music } from '../audio/music.js';
import { LEVELS, LV, LVI, SPAWN_FAR, setLevel } from '../config/levels.js';
import { BASE, BOOST, CHAIN_WINDOW, LAT_ACC, LAT_MAX, REGEN } from '../config/tuning.js';
import { R, clamp, hashStr, mulberry32, pick, rnd, setR, todayKey } from '../config/util.js';
import { $ } from '../dom.js';
import { COST_DASH, DASH_V, action, keys, pendingDash, setPendingDash, touches } from '../input/input.js';
import { radarTop, setRadarTop } from '../render/hud.js';
import { STAR_CHAIN, starsOf, totalStars, unlockables } from '../save/progress.js';
import { buzz, store } from '../save/store.js';
import { banner } from './actions.js';
import { collide, updMe, updPeople } from './crowd.js';
import { genChunk, runEvent, scramble, spawnFast, spawnRival, updXings, walker } from './people.js';
import { addPop, onPass } from './scoring.js';
import { S, bestOf, endShown, reset, setEndShown, setState, state } from './state.js';
import { BUMP_SPEED, finishRace, fmtTime, initRace, leadZ, ordinal, raceBest, raceBump, raceCountdown, rearZ, updRace } from './race.js';
import { updCars } from './traffic.js';
import { beginTut, tutTick } from './tutorial.js';
import { buildLevels, last } from '../ui/menus.js';



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
  S.bumpT = Math.max(0, S.bumpT - dt); S.ghostT = Math.max(0, S.ghostT - dt);   // race mode only: after a bump you are slow, then briefly able to pass through people
  const bursting = S.burstT > 0 && S.bumpT <= 0;
  if (!bursting && S.dashT <= 0) S.energy = Math.min(100, S.energy + REGEN * dt);
  S.exhausted = S.energy < COST_DASH || S.flash > 0;
  S.boostV += ((bursting ? 1 : 0) - S.boostV) * Math.min(1, dt * 8);
  if (S.boostV < 0.2) S.boostPasses = 0;
  const weave = 1 - 0.14 * Math.min(1.4, Math.abs(S.vx) / LAT_MAX);   // weaving costs a little forward speed
  S.speed += ((bursting ? BOOST : BASE) * weave * (S.bumpT > 0 ? BUMP_SPEED : 1) - S.speed) * Math.min(1, dt * 5);
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
    if (pendingDash && performance.now() >= pendingDash.at) { action(pendingDash.z); setPendingDash(null); }
    movePlayer(dt);
    S.me.x = S.px; S.me.z = S.pz;
    if (S.tut) {
      tutTick(dt);
      if (S.tut) { updPeople(dt); S.people = S.people.filter(p => !p.dead && p.z > S.pz - 16); return; }
    }
    while (S.nextChunk < leadZ() + SPAWN_FAR && S.nextChunk < LV.goal - 15) { genChunk(S.nextChunk); S.nextChunk += 4; }
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
    if (S.timeLeft <= 0 && !S.race) { loseTime(); return; }
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
    if (S.race) updRace(dt);
    S.people = S.people.filter(p => !p.dead && p.z > rearZ() - 16);
    const hit = S.ghostT > 0 ? null : collide();
    if (hit) { if (S.race) raceBump(hit); else { lose(hit); return; } }
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
    if (S.pz >= LV.goal) { if (S.race) winRace(); else win(); }
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

function lose(p) { setState('over'); S.live = false; p.hit = true; S.shake = 1; S.overT = 0; touches.clear(); Music.sfx('bump'); Music.stop(); Music.ambStop(); buzz([60, 40, 140]); recordBest(); }

function loseTime() {
  setState('over'); S.live = false; S.timeout = true; S.shake = 0.4; S.overT = 0; touches.clear();
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

const END_LABELS = { sScore: 'Score', sBest: 'Best score', sDist: 'Distance', sChain: 'Longest chain' };
function setStat(id, label, value) { $(id).textContent = value; const dt = $(id).previousElementSibling; if (dt) dt.textContent = label; }
function resetEndLabels() {
  for (const id in END_LABELS) { const dt = $(id).previousElementSibling; if (dt) dt.textContent = END_LABELS[id]; }
  $('raceBoard').hidden = true;
  $('sScoreLabel').textContent = END_LABELS.sScore;
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
  $('endStars').hidden = true; $('unlockNote').hidden = true; $('next').hidden = true;
  $('again').textContent = 'Race again'; $('again').className = 'big';
  $('end').hidden = false;
}

export let lastDaily = false, lastMode = 'classic';

export function startDaily() { const key = todayKey(); setLevel(hashStr(key + ':level') % LEVELS.length); start(true); }

export function start(daily, mode) {
  daily = daily === true;
  mode = daily ? 'classic' : (mode || lastMode);
  lastDaily = daily; lastMode = mode;
  setR(daily ? mulberry32(hashStr(todayKey())) : Math.random);
  reset();
  S.mode = mode; if (mode === 'race') initRace(3);
  S.daily = daily; S.dailyKey = todayKey(); for (const k in last) last[k] = k === 'low' ? null : -1; S.live = true; setState('play'); setEndShown(false);
  $('start').hidden = true; $('end').hidden = true; $('look').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
  const hb = $('hud').getBoundingClientRect ? $('hud').getBoundingClientRect() : null;
  setRadarTop(hb && hb.bottom ? hb.bottom + 6 : 120);
  if (LV.id === 'shibuya') { S.waveT = 1.5; }
  if (!daily && mode !== 'race' && store.get('excuseme_tut', '0') !== '1') beginTut();
  Music.start(LV.music); Music.ambStart(LV.id);
}

export function pauseGame() {
  if (state !== 'play') return;
  setState('paused'); touches.clear(); Music.suspend();
  $('pauseEyebrow').textContent = (S.race ? 'Race · ' : '') + LV.city + ' · ' + LV.name + ' · ' + Math.floor(S.pz) + ' m';
  $('pause').hidden = false;
}

export function resumeGame() { if (state !== 'paused') return; $('pause').hidden = true; setState('play'); Music.resume(); }

export function toMenu() {
  setR(Math.random); $('tut').hidden = true;
  $('pause').hidden = true;
  setState('ready'); reset(); $('end').hidden = true; $('hud').hidden = true; $('start').hidden = false; buildLevels();
}
