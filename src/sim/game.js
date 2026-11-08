import { leaveRoom } from '../online/duel.js';
import { comboLevel } from '../config/combo.js';
import { Music } from '../audio/music.js';
import { LEVELS, LV, LVI, SPAWN_FAR, halfAt, setLevel } from '../config/levels.js';
import { STRIP_SPEED, beltAt, beltFor, contain, onStrip, stripLane } from '../config/strips.js';
import { BASE, BOOST, CHAIN_WINDOW, LAT_ACC, LAT_MAX, REGEN } from '../config/tuning.js';
import { R, clamp, hashStr, mulberry32, pick, rnd, setR, todayKey, weekKey } from '../config/util.js';
import { $ } from '../dom.js';
import { COST_DASH, DASH_V, action, holdTick, keys, pendingDash, setPendingDash, touches } from '../input/input.js';
import { radarTop, setRadarTop } from '../render/hud.js';
import { clearPodium, setPodium } from '../render/podium.js';
import { nextGoal, tallySnapshot, track, trackMax } from '../save/challenges.js';
import { account, gainXp, runXp } from '../save/level.js';
import { buzz, store } from '../save/store.js';
import { PERFECT_SPEED, banner } from './actions.js';
import { collide, updMe, updPeople } from './crowd.js';
import { genChunk, runEvent, scramble, seeded, spawnFast, spawnRival, updXings, walker } from './people.js';
import { STREAK_SPEED, addPop, nearMul, onPass } from './scoring.js';
import { S, bestOf, endShown, goalOf, reset, setEndShown, setNextRun, setRaceBuild, setState, state } from './state.js';
import { startSlot } from './startgrid.js';
import { BUMP_SPEED, stepRemotes, addRemoteRacer, draftMul, finishRace, fmtTime, initRace, leadZ, ordinal, raceBest, raceCollide, raceCountdown, racePace, rearZ, standings, updRace } from './race.js';
import { updCars } from './traffic.js';
import { beginTut, tutTick } from './tutorial.js';
import { powerMul } from './powerups.js';
import { beginCoach, coachTick } from './racecoach.js';
import { MODS, TIRED_REGEN, activeMod, modOf, setMod } from './modifiers.js';
const MOD_NAMES = Object.fromEntries(MODS.map(m => [m.id, m.name]));
import { buildLevels, last } from '../ui/menus.js';
import { hideMenus } from '../ui/screens.js';
import { ghostSave, ghostStart, ghostStep } from './replay.js';
import { makeRun, recordKey } from './runopts.js';
import { cleanBonusFor, cleanMedal } from './clean.js';
import { applyElimList, initElim, stepElim } from './elim.js';
import { LESSONS, PRACTICE_OUTFIT, beginLesson, lessonIndex, lessonTick, restartLesson } from './practice.js';
import { flushScores, showRunBoard, submitBestRun, submitChallenge, submitRun } from '../online/online.js';
import { BOT_NAMES } from '../config/names.js';
import { LOOK } from '../save/progress.js';
import { CUP_RULES, CUP_STAGES, addRound, betterCup, cupDone, cupPlace, cupPoints, cupTable, cupTime, cupXp, decodeCup, encodeCup, newCup } from './cup.js';
import { CHALLENGE_SUBMIT_ENABLED, challengeFor, utcWeekKey, validChallengeTime } from '../config/challenge.js';



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
  S.nearT = Math.max(0, S.nearT - dt); S.bumpT = Math.max(0, S.bumpT - dt); S.ghostT = Math.max(0, S.ghostT - dt);   // race mode only: a bump leaves you slow for a moment
  const bursting = S.burstT > 0 && S.bumpT <= 0;
  const st = S.race ? S.race.me : null;   // stats only ever apply in a race
  if (!bursting && S.dashT <= 0) S.energy = Math.min(100, S.energy + REGEN * (st ? st.regen : 1) * (S.mod === 'tired' ? TIRED_REGEN : 1) * dt);
  S.exhausted = S.energy < COST_DASH || S.flash > 0;
  S.boostV += ((bursting || S.draftT > 0 || S.puT > 0 ? 1 : 0) - S.boostV) * Math.min(1, dt * 8);
  if (S.boostV < 0.2) S.boostPasses = 0;
  const weave = 1 - 0.14 * Math.min(1.4, Math.abs(S.vx) / LAT_MAX);   // weaving costs a little forward speed
  S.perfectT = Math.max(0, S.perfectT - dt); S.streakT = Math.max(0, S.streakT - dt);
  const strip = S.race && onStrip(LV.id, S.px, S.pz);
  if (strip && !S.onStrip) addPop('FAST STRIP', stripLane(LV.id).col, 22);
  S.onStrip = strip;
  const pace = (S.race ? racePace(S.chain, S.energy) * draftMul(S) * powerMul(S) * nearMul(S) * (strip ? STRIP_SPEED : 1) : 1) * (S.perfectT > 0 ? PERFECT_SPEED : 1) * (S.streakT > 0 ? STREAK_SPEED : 1);   // race mode: combo speeds you up, low stamina slows you down
  const target = (bursting ? BOOST : BASE) * weave * pace * (st ? st.speed : 1) * (S.bumpT > 0 ? BUMP_SPEED : 1);
  S.speed += (target - S.speed) * Math.min(1, dt * (st && target > S.speed ? st.accel : 5));
  if (S.dashT > 0) S.vx = S.dashDir * DASH_V;
  else if (S.slipT > 0) S.vx *= Math.max(0, 1 - dt * 0.4);   // sliding: no grip
  else {
    const acc = (Math.abs(S.vx) > LAT_MAX ? LAT_ACC * 2.2 : LAT_ACC) * (st ? st.lat : 1);   // shed dash speed quickly
    S.vx += clamp(steer * LAT_MAX - S.vx, -acc * dt, acc * dt);
  }
  if (S.sweepDir && S.vx * S.sweepDir < 0.3) { S.sweepDir = 0; S.sweepCount = 0; }
  const px0 = S.px;
  S.px += S.vx * dt;
  if (S.race) { const cx = contain(LV.id, px0, S.px, S.pz); if (cx !== S.px) { S.px = cx; S.vx = 0; } }   // glass railings on the airport walkway
  const lim = halfAt(S.pz + S.speed * dt) - 0.5;
  if (Math.abs(S.px) > lim) { S.px = clamp(S.px, -lim, lim); S.vx = 0; }
  S.pz += S.speed * dt;
  // moving walkway (airport races): the belt carries you along, or back
  const bd = S.race ? beltAt(LV.id, S.px, S.pz) : 0;
  S.belt = S.race ? beltFor(LV.id, S.px, S.pz, S.speed) : 0; S.pz += S.belt * dt;
  if (bd !== (S.beltOn || 0)) { S.beltOn = bd; if (bd > 0) addPop('WALKWAY', '#2ec4b6', 24); else if (bd < 0) addPop('WRONG WAY', '#ff8a5c', 24); }
  const sn = Math.floor(S.step / Math.PI);
  if (sn !== S.stepN) { S.stepN = sn; Music.sfx('step'); }
  S.score += S.speed * dt;   // 1 point per metre walked
  S.step += S.speed * dt * 2.1;
}

export function tick(dt) {
  if (state === 'paused') return;
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
    ghostStep(dt);
    if (S.kind === 'classic' && S.run.policy.records && !S.beatBest && S.score > bestOf(LV.id) && bestOf(LV.id) > 0) { S.beatBest = true; addPop('NEW BEST!', '#ffd166', 30); }
    if (S.kind === 'classic' && S.pz > S.farMark) { S.farMark += 5; trackMax('far_' + LV.id, S.pz); }
    if (pendingDash && performance.now() >= pendingDash.at) { action(pendingDash.z); setPendingDash(null); }
    holdTick(dt);
    movePlayer(dt);
    S.me.x = S.px; S.me.z = S.pz;
    if (S.coach) coachTick(dt);
    if (S.tut) {
      tutTick(dt);
      if (S.tut) { updPeople(dt); S.people = S.people.filter(p => !p.dead && p.z > S.pz - 16); return; }
    }
    const crowd = !S.lesson, dynamic = crowd && !S.challenge;   // lessons have only their own people; the challenge has the seeded course and nothing random on top
    while (crowd && S.nextChunk < leadZ() + SPAWN_FAR && S.nextChunk < goalOf() - 15) { genChunk(S.nextChunk); S.nextChunk += 4; }
    const prog = clamp(S.pz / LV.goal, 0, 1);
    S.fastT -= dt;
    if (S.fastT <= 0 && !S.duel && dynamic) { spawnFast(true); if (R() < 0.3) spawnFast(true); S.fastT = rnd(LV.fastEvery[0], LV.fastEvery[1]) * (1.3 - 0.6 * prog); }
    S.rivalT -= dt;
    if (S.rivalT <= 0 && !S.duel && dynamic && S.pz > 25 && S.pz < goalOf() - 40) { spawnRival(); S.rivalT = rnd(LV.rivalEvery[0], LV.rivalEvery[1]) * (1.2 - 0.5 * prog); }
    if (LV.id === 'nyc') updXings();
    // clock
    S.timeLeft -= dt;
    const sec = Math.ceil(S.timeLeft);
    if (sec !== S.lastSec) { S.lastSec = sec; if (sec <= 10 && sec > 0) { Music.sfx('tick'); if (sec <= 5) buzz(6); } }
    if (S.timeLeft <= 0 && !S.race) { loseTime(); return; }
    // scripted crowd moments
    S.eventT -= dt;
    if (S.eventT <= 0 && !S.duel && dynamic && S.pz < goalOf() - 60) { seeded(':e' + (S.evN++), () => runEvent(pick(LV.events))); S.eventT = S.endless && S.pz > LV.goal ? rnd(11, 17) : rnd(16, 24); }   // past the old finish line, surprises come more often
    // rush hour surges
    if (!S.duel && dynamic && S.pz < goalOf() - 50) {
      S.rushT -= dt;
      if (S.rushT <= 0) {
        if (!S.rush) { S.rush = true; S.rushT = 10; banner('RUSH HOUR', '#ff9f43'); Music.sfx('combo'); }
        else if (S.mod === 'rush') S.rushT = 10;   // rush hour all day: it never thins out
        else { S.rush = false; S.rushT = rnd(28, 40); banner('CROWD THINNING', '#5ee6a8'); }
      }
      if (S.mod === 'rush' && !S.rush) { S.rush = true; S.rushT = 10; }
      if (S.rush) {
        S.rushSpawn -= dt; S.heat = Math.max(S.heat, 0.3);
        if (S.rushSpawn <= 0) { S.rushSpawn = 0.45; walker(S.pz + rnd(SPAWN_FAR, SPAWN_FAR + 14), R() < 0.7 ? -1 : 1); }
      }
    }
    for (const p of S.people) if (p.prop === 'spill' && !p.slipped && Math.hypot(S.px - p.x, (S.pz - p.z) * 0.8) < 1.0) { p.slipped = true; S.slipT = 0.7; addPop('SLIPPERY!', '#c8a165', 26); buzz([10, 20, 10]); }
    if (LV.id === 'shibuya') { S.waveT -= dt; if (S.waveT <= 0 && !S.duel && dynamic && S.pz < goalOf() - 60) { scramble(); S.waveT = rnd(8, 11); } }
    updPeople(dt);
    if (S.race) updRace(dt);
    if (S.race && S.race.elim) { const ev = stepElim(); if (ev) { elimEnd(ev); return; } }
    S.people = S.people.filter(p => !p.dead && p.z > rearZ() - 16);
    if (S.race) raceCollide(dt);   // race: people are solid, you are stopped and slowed
    else { const hit = collide(); if (hit) { lose(hit); return; } }
    for (const p of S.people) {
      const dz = p.z - S.pz;
      if (!p.passed && p.prevDz > 0 && dz <= 0) { p.passed = true; onPass(p); }
      p.prevDz = dz;
    }
    if (S.lesson) lessonTick(dt);
    if (S.chain > 0 && S.time - S.lastPassT > CHAIN_WINDOW) {
      if (S.chain >= 3) { S.breakFlash = 0.35; addPop('CHAIN OF ' + S.chain + ' ENDED', '#9ca3af', 17); }
      S.chain = 0; S.snake = 0; S.oncRun = 0; S.multPrev = 1;
    }
    S.heat = Math.max(0, S.heat - dt * 0.16);
    Music.gameplay(S, LV.goal);
    if (S.pz >= goalOf()) { if (S.race) winRace(); else win(); }
  } else if (state === 'ready') {
    updPeople(dt);
    S.people = S.people.filter(p => !p.dead);
  } else {
    S.overT += dt;
    if (!endShown && S.overT > (state === 'won' ? 0.5 : 0.8)) showEnd();
    // an eliminated host is still the one who decides for everybody else, so their game keeps following the others
    if (S.duel && S.duel.elimHost && S.race && S.race.elim && S.race.elim.meOut && !S.race.elim.over && S.race.countT <= 0) { stepRemotes(dt); const ev = stepElim(); if (ev) elimEnd(ev); refreshDuelResults(); }
  }
}

function recordBest() {
  S.score = Math.floor(S.score);
  if (!S.run.policy.records) { S.newBest = false; return; }   // practice and special runs leave no record
  if (S.daily || S.weekly) {
    const k = 'excuseme_' + (S.daily ? 'daily_' : 'weekly_') + S.dailyKey, b = parseInt(store.get(k, '0'), 10) || 0;
    S.newBest = S.score > b; if (S.newBest) store.set(k, String(S.score));
    if (S.run.policy.scores) submitRun(S.daily ? 'daily' : 'weekly', S.dailyKey, S.score);   // online board; the server keeps only the first try
    return;
  }
  const b = bestOf(LV.id);
  S.newBest = S.score > b;
  if (S.newBest) { store.set('excuseme_best_' + LV.id, String(S.score)); ghostSave(); if (S.kind === 'classic' && S.run.policy.scores) submitBestRun(LV.id, S.score, S.ghostRec); }
}

// Every finished run pays XP, once: in any mode, even when you quit. A race against bots pays less.
const paid = new WeakSet();
function payRun() {
  if (!S || paid.has(S)) return;
  paid.add(S);
  if (!S.run.policy.xp) return;
  const R = S.race, xp = runXp({ mode: S.mode, score: S.score, won: !!(R && R.place === 1), bots: !!(R && !S.duel), bonus: cleanBonusFor(S) });
  S.xpGained = xp; gainXp(xp);
}

function lose(p) { if (S.daily) track('dailyRuns'); if (S.weekly) track('weeklyRuns'); if (S.kind === 'classic') { trackMax('far_' + LV.id, S.pz); trackMax('bestScore', S.score); } setState('over'); S.live = false; p.hit = true; S.hitStop = 0.1; S.overT = 0; touches.clear(); Music.sfx('bump'); Music.stop(); Music.ambStop(); buzz([60, 40, 140]); recordBest(); payRun(); }

function loseTime() {
  setState('over'); S.live = false; S.timeout = true; S.overT = 0; touches.clear();
  Music.sfx('bump'); Music.stop(); Music.ambStop(); buzz([100, 60, 100]); recordBest(); payRun();
}

function win() {
  setState('won'); S.live = false; S.overT = 0; S.pz = LV.goal; touches.clear();
  S.timeBonus = Math.max(0, Math.round(S.timeLeft * 15));
  S.score += 1000 + S.timeBonus;
  Music.sfx('win'); Music.stop(); Music.ambStop(); buzz([20, 60, 20, 60, 80]);
  recordBest(); payRun();
}

// An elimination decided the race for you: you were cut at a checkpoint, or you are the last one standing.
function elimEnd(ev) {
  const R = S.race, won = ev.type === 'win';
  R.finished = true; R.elimOut = won ? 0 : ev.k;
  setState(won ? 'won' : 'lost'); S.live = false; S.overT = 0; S.pz = Math.min(S.pz, LV.goal); touches.clear();
  R.board = standings(); R.place = R.board.findIndex(r => r.me) + 1;
  banner(won ? 'LAST ONE STANDING' : 'ELIMINATED', won ? '#27c27a' : '#ff4d4f');
  if (!S.duel) track('races');   // friend rooms keep their usual exclusion from unlock progress
  payRun();   // counts as a race played, not as a race win: elimination wins are shorter and do not feed the win unlocks
  Music.sfx(won ? 'win' : 'bump'); Music.stop(); Music.ambStop(); buzz(won ? [20, 60, 20, 60, 80] : [60, 40, 140]);
}

// Friend room: the host's list of eliminated racers arrived.
export function elimReceive(ids) {
  if (!S || !S.duel || !S.race || !S.race.elim || S.race.finished && !S.race.elim.meOut) return;
  const ev = applyElimList(ids);
  if (ev) elimEnd(ev); else refreshDuelResults();
}
// Friend room: the host left, so nobody can decide any more. The race ends for everyone with no winner.
export function elimAbort() {
  const R = S && S.race;
  if (!R || !R.elim || R.elim.over || R.finished) return;
  R.elim.over = true; R.finished = true; R.elimOut = -1;
  setState('lost'); S.live = false; S.overT = 0; touches.clear();
  R.board = standings(); R.place = R.board.findIndex(r => r.me) + 1;
  Music.stop(); Music.ambStop();
}

// Weekly challenge finish: the time is filed under the week the run STARTED in. Best time only; nothing else is paid or recorded.
function challengeDone() {
  const C = S.challenge, ms = Math.round(S.time * 1000), key = recordKey('excuseme_wchal_' + C.week, S.run), prev = parseFloat(store.get(key, '0')) || 0;
  C.newBest = !prev || S.time < prev;
  if (C.newBest) store.set(key, S.time.toFixed(2));
  C.best = C.newBest ? S.time : prev;
  if (validChallengeTime(ms)) submitChallenge(C.week, C.rules, ms);
}
export const challengeBest = c => parseFloat(store.get(recordKey('excuseme_wchal_' + c.week, { category: 'challenge', rules: c.rules }), '0')) || 0;

function winRace() {
  setState('won'); S.live = false; S.overT = 0; S.pz = LV.goal; touches.clear();
  finishRace(); payRun();
  if (S.challenge) challengeDone();
  if (S.cup) cupRoundDone();
  Music.sfx('win'); Music.stop(); Music.ambStop(); buzz([20, 60, 20, 60, 80]);
}

export const fmt = n => Math.floor(n).toLocaleString('en-US');

function showEnd() {
  setEndShown(true);
  if (S.race) { showRaceEnd(); return; }
  resetEndLabels(); $('cleanNote').hidden = true;
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
  if (S.closest && S.closest.gap < 0.4) $('endLead').textContent += ' Closest call: ' + Math.max(1, Math.round(S.closest.gap * 100)) + ' cm at ' + S.closest.m + ' m.';
  showUnlocks();
  if (S.daily) { $('endEyebrow').textContent = 'Daily run · ' + S.dailyKey + ' · ' + LV.name + (S.mod ? ' · ' + MOD_NAMES[S.mod] : ''); }
  if (S.weekly) { $('endEyebrow').textContent = 'Weekly run · ' + S.dailyKey + ' · ' + LV.name; }
  if (seededRun) showRunBoard(S.daily ? 'daily' : 'weekly', S.dailyKey);
  else if (S.kind === 'classic') showRunBoard('classic', LV.id);
  const nx = $('next');
  nx.hidden = true;
  $('again').hidden = !!seededRun;   // daily and weekly runs are one try only
  $('again').textContent = 'Try again'; $('again').className = 'big';
  $('end').hidden = false;
}

const END_LABELS = { sScore: 'Score', sBest: 'Best score', sDist: 'Distance', sChain: 'Longest chain' };
function setStat(id, label, value) { $(id).textContent = value; const dt = $(id).previousElementSibling; if (dt) dt.textContent = label; }
function setExtraStats(show) { for (const id of ['sClose', 'sPassed', 'sRival']) { const d = $(id).parentElement; if (d) d.hidden = !show; } }
function resetEndLabels() {
  clearPodium();
  setExtraStats(true);
  $('endLead').hidden = false;
  for (const id in END_LABELS) { const dt = $(id).previousElementSibling; if (dt) dt.textContent = END_LABELS[id]; }
  $('raceBoard').hidden = true; $('dayBoard').hidden = true;
  $('sScoreLabel').textContent = END_LABELS.sScore;
}

// Clean-race line on the race results: segments walked without a bump, the medal, and the XP they paid (bot races only).
function showCleanNote() {
  const n = $('cleanNote'), C = S.clean;
  if (!C || (!C.segs && !cleanMedal(S))) { n.hidden = true; return; }
  const bonus = cleanBonusFor(S);
  n.hidden = false;
  n.textContent = (cleanMedal(S) ? 'Clean race medal · no bumps · ' : '') + C.segs + ' clean segment' + (C.segs === 1 ? '' : 's') + (bonus ? ' · +' + bonus + ' XP bonus' : '');
}

function showUnlocks() {
  const un = $('unlockNote');
  un.hidden = !S.unlocked.length;
  if (S.unlocked.length) un.textContent = 'Unlocked: ' + S.unlocked.join(', ') + '. Try it in Change look.';
  const xn = $('xpNote');
  if (S.xpGained) { const pg = account.progress(); xn.hidden = false; xn.textContent = '+' + S.xpGained + ' XP · Level ' + pg.level + ' (' + fmt(pg.into) + ' / ' + fmt(pg.need) + ')'; } else xn.hidden = true;
  const ng = nextGoal(S.tallyStart), nn = $('nextNote');
  nn.hidden = !ng;
  if (ng) nn.textContent = 'Next unlock: ' + ng.name + ' · ' + fmt(ng.done) + ' of ' + fmt(ng.target) + (ng.gained ? ' (+' + fmt(ng.gained) + ' this run)' : '');
}

export function refreshDuelResults() {
  if (!S || !S.duel || !S.race) return;
  S.race.board = standings(); S.race.place = S.race.board.findIndex(r => r.me) + 1;
  if (endShown) showRaceEnd();
}

export function forfeitDuel() {
  if (!S || !S.duel || S.race.finished) return;
  S.duel.dnf = true; S.race.finished = true;
  setState('lost'); S.live = false; S.overT = 0; touches.clear();
  refreshDuelResults();
}

// Results of a weekly challenge run: time, best of the week and (once the online board is switched on) the top times.
function showChallengeEnd() {
  const C = S.challenge;
  $('endEyebrow').textContent = 'Weekly challenge · ' + C.week + ' · ' + LV.city + ' · ' + LV.name;
  const t = $('endTitle'); t.textContent = C.newBest ? 'New best!' : 'Finished'; t.className = 'good';
  $('endLead').hidden = true;
  $('sScoreLabel').textContent = 'Finish time'; $('sScore').textContent = fmtTime(S.time);
  setStat('sBest', 'Best this week', fmtTime(C.best)); setStat('sDist', 'Week', C.week); setStat('sChain', 'Bumps', String(S.bumps));
  setExtraStats(false);
  $('raceBoard').hidden = true; $('unlockNote').hidden = true; $('xpNote').hidden = true; $('nextNote').hidden = true; $('cleanNote').hidden = true;
  if (CHALLENGE_SUBMIT_ENABLED) showRunBoard('wchal', C.week + ':r' + C.rules); else $('dayBoard').hidden = true;
  $('next').hidden = true; $('again').hidden = false; $('again').disabled = false; $('again').textContent = 'Try again'; $('again').className = 'big';
  $('end').hidden = false;
}

function showCupEnd() {
  const m = S.cup.model, done = cupDone(m), R = S.race, place = R.place, cp = cupPlace(m), n = R.board.length, table = cupTable(m);
  setPodium(R.board, S.me, R.bots);
  $('endEyebrow').textContent = 'NYC Cup · round ' + m.rounds.length + ' of ' + CUP_STAGES.length + ' · ' + LV.name;
  const t = $('endTitle'); t.textContent = done ? (cp === 1 ? 'Cup winner!' : ordinal(cp) + ' in the NYC Cup') : place === 1 ? 'Round won' : ordinal(place) + ' of ' + n; t.className = (done ? cp === 1 : place === 1) ? 'good' : 'bad';
  $('endLead').hidden = true;
  $('sScoreLabel').textContent = 'Round time'; $('sScore').textContent = fmtTime(S.time);
  setStat('sBest', done ? 'Cup points' : 'Cup points so far', cupPoints(m) + (done && S.cup.newBest ? ' · new best' : ''));
  setStat('sDist', 'Round place', ordinal(place) + ' of ' + n); setStat('sChain', 'Bumps', String(S.bumps));
  setExtraStats(false);
  const bd = $('raceBoard'); bd.hidden = false; bd.innerHTML = '';
  table.forEach((r, i) => { const li = document.createElement('li'); if (r.me) li.className = 'me'; li.textContent = (i + 1) + '. ' + r.name + ' · ' + r.points + ' pts'; bd.appendChild(li); });
  showUnlocks(); $('unlockNote').hidden = true; $('nextNote').hidden = true; $('cleanNote').hidden = true;
  const nx = $('next'); nx.hidden = done; nx.disabled = false; nx.textContent = done ? '' : 'Next round: ' + LEVELS[CUP_STAGES[m.rounds.length]].name;
  $('again').hidden = !done; $('again').disabled = false; $('again').textContent = 'Race again'; $('again').className = 'big';
  $('end').hidden = false;
}

function showRaceEnd() {
  if (S.challenge) { showChallengeEnd(); return; }
  if (S.cup) { showCupEnd(); return; }
  const R = S.race, n = R.board.length, place = R.place, EL = R.elim;
  setPodium(R.board, S.me, R.bots);
  $('endEyebrow').textContent = (EL ? 'Elimination · ' : 'Race · ') + LV.city + ' · ' + LV.name + ' · ' + (S.duel ? 'live vs ' + S.duel.title : R.diff.name + ' bots');
  const t = $('endTitle'); t.textContent = place === 1 ? 'You win!' : ordinal(place) + ' of ' + n; t.className = place === 1 ? 'good' : 'bad';
  if (EL) t.textContent = R.elimOut === -1 ? 'Race ended · host left' : place === 1 && EL.over ? 'Last one standing!' : EL.meOut ? 'Eliminated · ' + ordinal(place) + ' of ' + n : 'Still racing';
  if (S.duel && S.duel.dnf) { t.textContent = 'Did not finish'; t.className = 'bad'; }
  else if (!EL && S.duel && R.board.some(r => !r.done && !r.dnf)) t.textContent = 'Finished · waiting for racers';
  $('endLead').hidden = true;   // the standings say it all
  $('endLead').textContent = place === 1 ? 'First to ' + LV.goalText + '. Bumps cost you time, so a clean run wins.' : 'Not first this time. Every bump costs about a second and a half, so stay clean and look for gaps.';
  $('sScoreLabel').textContent = EL ? 'Race time' : 'Finish time'; $('sScore').textContent = fmtTime(S.time);
  if (S.duel && S.duel.dnf) $('sScore').textContent = 'DNF';
  const best = raceBest(LV.id, S.run);
  if (EL) setStat('sBest', 'Checkpoints survived', (R.elimOut > 0 ? R.elimOut - 1 : EL.next) + ' of ' + EL.cps.length);
  else setStat('sBest', R.newBest ? 'Best time · new best' : 'Best win time', best ? fmtTime(best) : '-');
  setStat('sDist', 'Place', ordinal(place) + ' of ' + n);
  setStat('sChain', 'Bumps', String(S.bumps));
  $('sClose').textContent = S.close; $('sPassed').textContent = S.passed; $('sRival').textContent = S.dodged;
  setExtraStats(false);   // the standings take their place, so the screen still fits
  const bd = $('raceBoard'); bd.hidden = false; bd.innerHTML = '';
  const lead = R.board[0];
  R.board.forEach((r, i) => {
    const li = document.createElement('li'); if (r.me) li.className = 'me';
    const gap = r.out ? 'Eliminated at checkpoint ' + r.out : EL && EL.over && !r.dnf && i === 0 && R.elimOut !== -1 ? 'Last one standing' : r.dnf ? 'DNF · left / lost connection' : r.done ? (i === 0 ? fmtTime(r.finishT) : '+' + (r.finishT - lead.finishT).toFixed(1) + ' s') : Math.max(1, Math.round(LV.goal - r.z)) + ' m to go';
    li.textContent = (i + 1) + '. ' + r.name + ' · ' + gap;
    bd.appendChild(li);
  });
  showUnlocks(); showCleanNote(); $('next').hidden = true;
  $('again').hidden = false; $('again').disabled = false; $('again').textContent = S.duel ? 'Rematch' : 'Race again'; $('again').className = 'big';
  if (S.duel && S.duel.refresh) S.duel.refresh();
  $('end').hidden = false;
}

export let lastDaily = false, lastMode = 'classic';

// One try per day and per week, remembered on this device. Quitting mid-run still uses the try.
export const playedKey = mode => store.get('excuseme_played_' + mode, '');
export const periodKey = mode => (mode === 'weekly' ? weekKey() : todayKey());
export const hasPlayed = mode => playedKey(mode) === periodKey(mode);
// Keep published periods stable when the fifth stage ships. New periods use the expanded pool.
export const dailyLevel = (key = todayKey()) => hashStr(key + ':level') % (key < '2026-11-09' ? Math.min(4, LEVELS.length) : LEVELS.length);
export const weeklyLevel = (key = weekKey()) => hashStr(key + ':wlevel') % (key < '2026-W46' ? Math.min(4, LEVELS.length) : LEVELS.length);
export function startDaily() { if (hasPlayed('daily')) return; setLevel(dailyLevel()); start('daily'); }
export function startWeekly() { if (hasPlayed('weekly')) return; setLevel(weeklyLevel()); start('weekly'); }

// start('classic' | 'race' | 'daily' | 'weekly'); the older start(true) and start(false, 'race') forms still work.
export function start(a, b, opts) {
  lastOpts = opts && opts.elim ? { run: opts.run, elim: true } : undefined; lastChallenge = !!(opts && opts.challenge); lastCup = !!(opts && opts.cup);
  const duel = opts && opts.duel || null;   // a live race against a friend: { seed, friend, send, remote }
  const mode = a === true ? 'daily' : typeof a === 'string' ? a : (b || lastMode);
  const daily = mode === 'daily', weekly = mode === 'weekly', key = daily || weekly ? periodKey(mode) : null;
  flushScores();   // send any score that could not go out earlier
  if (key) { if (hasPlayed(mode)) return; store.set('excuseme_played_' + mode, key); }
  lastDaily = daily; lastMode = mode;
  setMod(opts && opts.mod !== undefined ? opts.mod : daily ? modOf(key).id : null);
  setRaceBuild(mode === 'race');   // the crowd generator adds belt riders in races only
  const run = makeRun(key || duel ? null : opts && opts.run);   // daily, weekly and friend races are always standard runs
  setR(key ? mulberry32(hashStr(key)) : duel ? mulberry32(hashStr(duel.seed)) : run.seed ? mulberry32(hashStr(run.seed)) : Math.random);
  setNextRun(run);
  reset();
  S.tallyStart = tallySnapshot();
  S.mod = activeMod;
  S.mode = mode; S.kind = mode; S.endless = mode !== 'race'; S.seed = key || (duel ? duel.seed : run.seed); S.duel = duel; S.challenge = opts && opts.challenge || null; S.cup = opts && opts.cup || null;
  if (S.endless) S.timeLeft = Infinity;
  ghostStart();
  if (mode === 'race') {
    initRace(duel || opts && (opts.lesson || opts.solo) ? 0 : 3, opts && opts.cup ? opts.cup.model.bots : undefined);
    if (opts && opts.lesson) beginLesson(opts.lesson);
    if (duel) {
      const spot = k => startSlot(duel.slotOf[k], duel.count, LV.half);   // everyone on one line, in the order of the room list
      duel.order.forEach((id, i) => { const b = addRemoteRacer(duel.peers[id].look, duel.peers[id].name, id, i), at = spot(id); b.x = at.x; b.z = at.z; });
      const me = spot('me'); S.px = me.x; S.pz = me.z; S.me.x = me.x; S.me.z = me.z;
    }
    if (opts && opts.elim || duel && duel.elim) initElim(LV.goal);   // after the remote racers are in, so the field size is right
  }
  S.daily = daily; S.weekly = weekly; S.dailyKey = key; for (const k in last) last[k] = k === 'low' ? null : -1; S.live = true; setState('play'); setEndShown(false);
  hideMenus(); $('hud').hidden = false;
  if (S.mod) banner(MOD_NAMES[S.mod].toUpperCase(), '#ff9f43');
  const hb = $('hud').getBoundingClientRect ? $('hud').getBoundingClientRect() : null;
  setRadarTop(hb && hb.bottom ? hb.bottom + 6 : 120);
  if (LV.id === 'shibuya') { S.waveT = 1.5; }
  if (mode === 'classic' && store.get('excuseme_tut', '0') !== '1') beginTut();
  beginCoach(mode);
  Music.start(LV.music); Music.ambStart(LV.id);
}

// Weekly challenge: a solo timed race on this UTC week's course, in this week's supplied outfit.
let lastChallenge = false, lastCup = false;
export function startChallenge(date) {
  const c = challengeFor(utcWeekKey(date));
  setLevel(c.level);
  start('race', undefined, { run: { category: 'challenge', rules: c.rules, seed: c.seed, outfit: c.outfit }, solo: true, challenge: c });
}

/* ---------- NYC Cup: three bot races in a row ----------
   cupRun lives only while a cup is being played. toMenu() drops it, so an abandoned cup leaves no trace. */
let cupRun = null;
const cupKey = 'excuseme_cup_nyc:r' + CUP_RULES;
export const cupBest = () => decodeCup(store.get(cupKey, ''));
export function cupState() {
  if (!cupRun) return null;
  const m = cupRun.model;
  return { round: cupRun.round, rounds: m.rounds, done: cupDone(m), place: cupPlace(m), table: cupTable(m), newBest: cupRun.newBest, bots: m.bots };
}
function startCupRound() {
  const c = cupRun;
  setLevel(CUP_STAGES[c.round]);
  start('race', undefined, { run: { category: 'cup', rules: CUP_RULES, seed: c.model.seed + ':round' + c.round, outfit: c.outfit }, cup: c });
}
export function startCup() {
  const pool = BOT_NAMES.slice(), bots = [];
  for (let i = 0; i < 3; i++) bots.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  cupRun = { model: newCup({ seed: Math.random().toString(36).slice(2, 10), bots }), round: 0, scored: -1, newBest: false, outfit: { ...LOOK } };
  startCupRound();
}
export function nextCupRound() {
  const c = cupRun;
  if (!c || state !== 'won' || cupDone(c.model) || c.scored !== c.round) return;
  c.round++; startCupRound();
}
// The player crossed the line in a cup round. Runs once per round; a finished cup pays its XP once and may set the cup best.
function cupRoundDone() {
  const c = S.cup, R = S.race;
  if (c.scored === c.round) return;
  c.scored = c.round;
  c.model = addRound(c.model, { place: R.place, time: S.time, board: R.board.map((r, i) => ({ name: r.me ? 'You' : r.name, me: !!r.me, place: i + 1, time: r.finishT })) });
  if (!cupDone(c.model)) return;
  const result = { points: cupPoints(c.model), time: cupTime(c.model) };
  c.newBest = betterCup(result, cupBest());
  if (c.newBest) store.set(cupKey, encodeCup(result));
  const xp = cupXp(cupPlace(c.model));
  S.xpGained = xp; gainXp(xp);
}

// Practice: a lesson on a bare street, as a practice-category run (nothing is paid or recorded).
export function startPractice(id) {
  setLevel(0);
  start('race', undefined, { run: { category: 'practice', seed: 'practice-' + id, outfit: PRACTICE_OUTFIT }, lesson: id });
}
// Race again / Restart keeps the format (elimination) of the run being repeated.
let lastOpts;
export function restartRun() { if (lastCup) { if (cupRun && cupDone(cupRun.model)) startCup(); return; } if (lastChallenge) startChallenge(); else start(lastDaily, lastMode, lastOpts); }
export function lessonRetry() { if (S && S.lesson) restartLesson(); }
export function lessonNext() { if (S && S.lesson) startPractice(LESSONS[Math.min(LESSONS.length - 1, lessonIndex(S.lesson.id) + 1)].id); }

function showPauseMenu() {
  touches.clear(); keys.l = keys.r = false; setPendingDash(null);
  Music.suspend();
  $('pauseEyebrow').textContent = (S.duel ? 'Room paused - ' : S.cup ? 'NYC Cup round ' + (S.cup.round + 1) + ' of ' + CUP_STAGES.length + ' - ' : S.lesson ? 'Practice - ' : S.race ? 'Race - ' : '') + LV.city + ' - ' + LV.name + ' - ' + Math.floor(S.pz) + ' m';
  $('restart').hidden = !!(S.daily || S.weekly || S.duel || S.cup);
  $('pmenu').textContent = S.cup ? 'Abandon cup' : S.duel ? 'Leave race' : S.daily || S.weekly ? 'End run' : 'Main menu';
  const waiting = S.duel && !S.duel.pausers.has(S.duel.meId);
  $('holdPause').hidden = !waiting;
  $('resume').disabled = !!waiting;
  $('resume').textContent = waiting ? 'Waiting for racers' : S.duel ? 'Ready to resume' : 'Resume';
  $('pauseStatus').hidden = !S.duel;
  if (S.duel) {
    const names = [...S.duel.pausers].map(id => id === S.duel.meId ? 'You' : S.duel.peers[id]?.name || 'Friend');
    $('pauseStatus').textContent = 'Paused by: ' + names.join(', ') + '. Everyone who paused must be ready to resume.';
  }
  $('pause').hidden = false;
}

// Both local input and room messages use the same state transition; receiving never echoes a message.
export function syncDuelPause() {
  if (!S?.duel || (state !== 'play' && state !== 'paused')) return;
  if (S.duel.pausers.size) { setState('paused'); showPauseMenu(); }
  else if (state === 'paused') { hideMenus(); setState('play'); Music.resume(); }
}
function sendPause(paused) {
  const d = S.duel;
  if (paused) d.pausers.add(d.meId); else d.pausers.delete(d.meId);
  d.send('pause', { seed: d.seed, n: ++d.pauseSeq, paused });
  syncDuelPause();
}
export function pauseGame() {
  if (state !== 'play' && state !== 'paused') return;
  if (S.duel) { sendPause(true); return; }
  setState('paused'); showPauseMenu();
}
export function resumeGame() {
  if (state !== 'paused') return;
  if (S.duel) { if (S.duel.pausers.has(S.duel.meId)) sendPause(false); return; }
  hideMenus(); setState('play'); Music.resume();
}

// Quitting mid-run: the score still counts, and a daily or weekly try is still used up.
export function quitRun() {
  if (!S || !S.live || S.race) return;
  if (S.daily) track('dailyRuns');
  if (S.weekly) track('weeklyRuns');
  if (S.kind === 'classic') { trackMax('far_' + LV.id, S.pz); trackMax('bestScore', S.score); }
  recordBest(); payRun();
}

export function toMenu() {
  cupRun = null;   // leaving a cup at any point abandons it: nothing recorded, nothing paid
  if (S?.duel) leaveRoom();
  setR(Math.random); $('tut').hidden = true; $('lesson').hidden = true;
  hideMenus();
  setState('ready'); reset(); $('hud').hidden = true; $('start').hidden = false; buildLevels();
}
