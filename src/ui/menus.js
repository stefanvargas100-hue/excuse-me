import { Music } from '../audio/music.js';
import { LEVELS, LV, LVI, setLevel } from '../config/levels.js';
import { CHAIN_WINDOW } from '../config/tuning.js';
import { clamp, todayKey, weekKey } from '../config/util.js';
import { $ } from '../dom.js';
import { starsOf } from '../save/progress.js';
import { setVibOn, store, vibOn } from '../save/store.js';
import { dailyLevel, fmt, hasPlayed, lastDaily, lastMode, pauseGame, resumeGame, start, startDaily, startWeekly, toMenu, weeklyLevel } from '../sim/game.js';
import { fmtTime, ordinal, raceBest, racePace, raceDifficulty, standings } from '../sim/race.js';
import { S, bestOf, camBob, reset, setCamBob, setShowHB, showHB, state } from '../sim/state.js';
import { endTut } from '../sim/tutorial.js';



/* ---------- menus ---------- */
export function buildLevels() {
  const box = $('levels'); if (!box || !document.createElement) return;
  box.innerHTML = '';
  const race = store.get('excuse_mode', 'classic') === 'race';
  const card = cls => { const x = document.createElement('button'); x.type = 'button'; x.className = cls; x.innerHTML = '<span class="lc"></span><span class="ln"></span><span class="lm"></span><span class="lb"></span>'; return x; };
  // Daily and weekly runs: endless, one try each, the same crowd for everyone.
  const periodic = (mode, title, lvl, key, startFn, blurb) => {
    const x = card('lvl daily'), done = hasPlayed(mode), best = parseInt(store.get('excuse' + 'me_' + mode + '_' + key, '0'), 10) || 0;
    x.children[0].textContent = title + ' · ' + key;
    x.children[1].textContent = LEVELS[lvl].name;
    x.children[2].textContent = done ? (best ? fmt(best) + ' pts' : 'Played') : 'One try';
    x.children[3].textContent = done ? (mode === 'daily' ? 'Played today. A new crowd arrives tomorrow.' : 'Played this week. A new crowd arrives on Monday.') : blurb;
    if (done) { x.setAttribute('aria-disabled', 'true'); x.classList.add('done'); }
    x.addEventListener('click', startFn);
    box.appendChild(x);
  };
  periodic('daily', 'Daily run', dailyLevel(), todayKey(), startDaily, 'Go as far as you can. Same crowd for everyone today.');
  periodic('weekly', 'Weekly run', weeklyLevel(), weekKey(), startWeekly, 'Go as far as you can. Same crowd for everyone this week.');
  LEVELS.forEach((L, i) => {
    const x = card('lvl');
    x.setAttribute('aria-pressed', String(i === LVI));
    const best = bestOf(L.id), rb = raceBest(L.id);
    x.children[0].textContent = (i + 1) + ' · ' + L.city;
    x.children[1].textContent = L.name;
    const st = starsOf(L.id);
    const lm = x.children[2], ss = document.createElement('span');
    lm.textContent = ''; ss.className = 'st'; ss.textContent = [1, 2, 4].map(bit => st & bit ? '★' : '☆').join('');
    lm.appendChild(ss); lm.appendChild(document.createElement('br'));
    lm.appendChild(document.createTextNode(race ? L.goal + ' m' + (rb ? ' · ' + fmtTime(rb) : '') : 'Endless' + (best ? ' · best ' + fmt(best) : '')));
    x.children[3].textContent = L.blurb;
    x.addEventListener('click', () => { setLevel(i); reset(); buildLevels(); });
    box.appendChild(x);
  });
}


export const last = { dist: -1, en: -1, low: null, score: -1, chain: -1, tl: -1, cd: -1 };

export function hud() {
  if (state === 'ready') return;
  raceHud();
  const dm = Math.floor(S.pz);
  if (dm !== last.dist) { last.dist = dm; $('dist').textContent = S.endless ? dm + ' m' + (dm < LV.goal ? ' / ' + LV.goal + ' m' : '') : dm + ' / ' + LV.goal + ' m'; $('prog').style.width = (clamp(S.pz / LV.goal, 0, 1) * 100).toFixed(1) + '%'; }
  // race mode shows your pace instead of a score: combo adds speed, low stamina takes it away
  const sc = S.race ? Math.round(racePace(S.chain, S.energy) * 100) : Math.floor(S.score);
  if (sc !== last.score || last.race !== !!S.race) {
    last.score = sc; last.race = !!S.race;
    $('score').textContent = S.race ? sc + '%' : fmt(sc);
    const lab = $('score').previousElementSibling; if (lab) lab.textContent = S.race ? 'PACE' : 'SCORE';
  }
  const en = Math.round(S.energy);
  if (en !== last.en) { last.en = en; $('en').style.width = en + '%'; }
  if (S.exhausted !== last.low) { last.low = S.exhausted; $('en').classList.toggle('low', S.exhausted); }
  // colour shifts as stamina drops; in a race, say out loud how much speed it is costing you
  const lvl = en < 34 ? 2 : en < 67 ? 1 : 0;
  if (lvl !== last.lvl) { last.lvl = lvl; $('en').classList.toggle('mid', lvl === 1); $('en').classList.toggle('empty', lvl === 2); }
  const cost = S.race ? Math.round((1 - racePace(0, S.energy)) * 100) : 0;
  if (cost !== last.cost) { last.cost = cost; const t = $('slowTag'); t.hidden = cost < 2; t.textContent = '-' + cost + '% speed'; }
  if (S.chain !== last.chain) {
    last.chain = S.chain;
    $('combo').classList.toggle('off', S.chain === 0);
    $('mult').textContent = '×' + Math.min(8, 1 + Math.floor(S.chain / 3));
    $('chain').textContent = S.chain + ' chain';
  }
  if (S.chain > 0) $('cbar').style.width = (clamp(1 - (S.time - S.lastPassT) / CHAIN_WINDOW, 0, 1) * 100).toFixed(0) + '%';
  $('clock').style.visibility = S.endless ? 'hidden' : '';   // endless runs have no clock
  const tl = S.race ? Math.floor(S.time) : S.endless ? 0 : Math.max(0, Math.ceil(S.timeLeft));
  if (tl !== last.tl) {
    last.tl = tl;
    const ck = $('clock');
    ck.innerHTML = '<small>' + (S.race ? 'TIME' : LV.timerLabel) + '</small>' + Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0');
    ck.classList.toggle('low', !S.race && tl <= 15);
  }
  const cd = Math.ceil(S.shoutCD);
  if (cd !== last.cd) {
    last.cd = cd; const sh = $('shout');
    sh.classList.toggle('ready', cd === 0);
    sh.textContent = cd === 0 ? 'Excuse me ready' : 'Excuse me in ' + cd;
  }
}


// Race mode: your place, the gap to the next racer, and a dot for each racer on the progress bar.
const dotsKey = { n: -1 };
function raceHud() {
  const pl = $('place');
  if (!S.race) { if (!pl.hidden) pl.hidden = true; if (dotsKey.n !== 0) { dotsKey.n = 0; $('raceDots').innerHTML = ''; } return; }
  pl.hidden = false;
  const rows = standings(), me = rows.findIndex(r => r.me), n = rows.length;
  let gap = '';
  if (S.race.countT > 0) gap = 'Get ready';
  else if (me > 0) gap = Math.max(1, Math.round(rows[me - 1].z - S.pz)) + ' m behind ' + rows[me - 1].name;
  else gap = Math.max(1, Math.round(S.pz - rows[1].z)) + ' m ahead';
  const txt = ordinal(me + 1) + ' of ' + n + ' · ' + gap + (S.bumpT > 0 ? ' · BUMPED' : '');
  if (pl.textContent !== txt) { pl.textContent = txt; pl.classList.toggle('bumped', S.bumpT > 0); }
  const box = $('raceDots');
  if (dotsKey.n !== n) { dotsKey.n = n; box.innerHTML = ''; for (let i = 0; i < n - 1; i++) { const d = document.createElement('i'); d.style.background = S.race.bots[i].color; box.appendChild(d); } }
  S.race.bots.forEach((b, i) => { const d = box.children[i]; if (d) d.style.left = (clamp(b.z / LV.goal, 0, 1) * 100).toFixed(1) + '%'; });
}

function syncMode() {
  const race = store.get('excuse_mode', 'classic') === 'race';
  $('modeClassic').setAttribute('aria-pressed', String(!race)); $('modeRace').setAttribute('aria-pressed', String(race));
  $('raceOpts').hidden = !race;
  $('go').textContent = race ? 'Start race' : 'Start walking';
  const d = raceDifficulty();
  document.querySelectorAll('#raceOpts .chip').forEach((c, i) => c.setAttribute('aria-pressed', String(i === d)));
}

export function init() {
  $('modeClassic').addEventListener('click', () => { store.set('excuse_mode', 'classic'); syncMode(); buildLevels(); });
  $('modeRace').addEventListener('click', () => { store.set('excuse_mode', 'race'); syncMode(); buildLevels(); });
  document.querySelectorAll('#raceOpts .chip').forEach((c, i) => c.addEventListener('click', () => { store.set('excuseme_botlvl', String(i)); syncMode(); }));
  syncMode();
  $('go').addEventListener('click', () => start(false, store.get('excuse_mode', 'classic')));
  $('again').addEventListener('click', () => start(lastDaily, lastMode));
  $('tutBtn').addEventListener('click', () => { store.set('excuseme_tut', '0'); start(); });
  $('tutSkip').addEventListener('click', e => { e.stopPropagation(); if (S.tut) endTut(); });
  $('tutSkip').addEventListener('pointerdown', e => e.stopPropagation());
  $('next').addEventListener('click', () => { setLevel(Math.min(LEVELS.length - 1, LVI + 1)); start(false); });
  $('menu').addEventListener('click', () => { Music.ambStop(); toMenu(); });
  $('pauseBtn').addEventListener('click', e => { e.stopPropagation(); pauseGame(); });
  $('pauseBtn').addEventListener('pointerdown', e => e.stopPropagation());
  $('resume').addEventListener('click', resumeGame);
  $('restart').addEventListener('click', () => { $('pause').hidden = true; Music.ambStop(); start(lastDaily, lastMode); });
  $('pmenu').addEventListener('click', () => { Music.stop(); Music.ambStop(); toMenu(); });
  window.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (k === 'escape' || k === 'p') { if (state === 'play') pauseGame(); else if (state === 'paused') resumeGame(); } });
  document.querySelectorAll('.vibt').forEach(el => {
    el.checked = vibOn;
    el.addEventListener('change', e => { setVibOn(e.target.checked); document.querySelectorAll('.vibt').forEach(o => { o.checked = vibOn; }); try { localStorage.setItem('excuseme_vib', vibOn ? '1' : '0'); } catch (err) {} });
  });
  document.querySelectorAll('.hbt').forEach(el => el.addEventListener('change', e => {
    setShowHB(e.target.checked); document.querySelectorAll('.hbt').forEach(o => { o.checked = showHB; });
  }));
  document.querySelectorAll('.bobt').forEach(el => {
    el.checked = camBob;
    el.addEventListener('change', e => { setCamBob(e.target.checked); document.querySelectorAll('.bobt').forEach(o => { o.checked = camBob; }); store.set('excuseme_bob', camBob ? '1' : '0'); });
  });
  document.querySelectorAll('.sndt').forEach(el => {
    el.checked = Music.enabled;
    el.addEventListener('change', e => { Music.setEnabled(e.target.checked); document.querySelectorAll('.sndt').forEach(o => { o.checked = e.target.checked; }); });
  });
}
