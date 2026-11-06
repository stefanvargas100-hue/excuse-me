import { Music } from '../audio/music.js';
import { LEVELS, LV, LVI, setLevel } from '../config/levels.js';
import { CHAIN_WINDOW } from '../config/tuning.js';
import { clamp, todayKey, weekKey } from '../config/util.js';
import { $ } from '../dom.js';
import { CHALLENGES, doneCount, isDone, tallyOf } from '../save/challenges.js';
import { ITEM_STATS, statHint } from '../config/stats.js';
import { setVibOn, store, vibOn } from '../save/store.js';
import { dailyLevel, fmt, hasPlayed, lastDaily, lastMode, pauseGame, quitRun, resumeGame, start, startDaily, startWeekly, toMenu, weeklyLevel } from '../sim/game.js';
import { draftMul, fmtTime, ordinal, raceBest, racePace, raceDifficulty, standings } from '../sim/race.js';
import { S, bestOf, calm, camBob, cues, reset, setCalm, setCamBob, setCues, setShowHB, showHB, state } from '../sim/state.js';
import { endTut } from '../sim/tutorial.js';
import { back, go, pageInto, relayoutWith } from './screens.js';
import { shareRun, startReplay } from '../sim/replay.js';



/* ---------- menus ---------- */
let stageMode = 'classic';

const menuCard = cls => { const x = document.createElement('button'); x.type = 'button'; x.className = cls; x.innerHTML = '<span class="lc"></span><span class="ln"></span><span class="lm"></span><span class="lb"></span>'; return x; };

// The Play screen: the four ways to play.
function buildPlay() {
  const box = $('playList'); box.innerHTML = '';
  const mode = (cls, tag, name, right, text, onTap) => {
    const x = menuCard(cls);
    x.children[0].textContent = tag; x.children[1].textContent = name; x.children[2].textContent = right; x.children[3].textContent = text;
    x.addEventListener('click', onTap); box.appendChild(x); return x;
  };
  mode('lvl', 'Single player', 'Classic', 'Endless', 'Pick a stage and go until you bump into someone.', () => openStages('classic'));
  mode('lvl', 'Competitive', 'Race vs bots', '4 racers', 'First to the finish. Your build and gear matter here.', () => openStages('race'));
  // Daily and weekly runs: endless, one try each, the same crowd for everyone.
  const periodic = (kind, title, lvl, key, startFn, blurb) => {
    const done = hasPlayed(kind), best = parseInt(store.get('excuseme_' + kind + '_' + key, '0'), 10) || 0;
    const x = mode('lvl daily', title + ' · ' + key, LEVELS[lvl].name, done ? (best ? fmt(best) + ' pts' : 'Played') : 'One try',
      done ? (kind === 'daily' ? 'Played today. A new crowd arrives tomorrow.' : 'Played this week. A new crowd arrives on Monday.') : blurb, startFn);
    if (done) { x.setAttribute('aria-disabled', 'true'); x.classList.add('done'); }
  };
  periodic('daily', 'Daily run', dailyLevel(), todayKey(), startDaily, 'Go as far as you can. Same crowd for everyone today.');
  periodic('weekly', 'Weekly run', weeklyLevel(), weekKey(), startWeekly, 'Go as far as you can. Same crowd for everyone this week.');
}

// The stage screen: tap a stage and it starts.
function buildStages() {
  const box = $('levels'); box.innerHTML = '';
  const race = stageMode === 'race';
  LEVELS.forEach((L, i) => {
    const x = menuCard('lvl');
    const best = bestOf(L.id), rb = raceBest(L.id);
    x.children[0].textContent = L.city;
    x.children[1].textContent = L.name;
    x.children[2].textContent = race ? L.goal + ' m' + (rb ? ' · ' + fmtTime(rb) : '') : best ? 'Best ' + fmt(best) : 'Endless';
    x.children[3].textContent = L.blurb;
    x.addEventListener('click', () => { setLevel(i); start(stageMode); });
    box.appendChild(x);
  });
}

function openStages(mode) {
  stageMode = mode;
  $('stagesTitle').textContent = mode === 'race' ? 'Race vs bots' : 'Classic';
  $('raceOpts').hidden = mode !== 'race';
  syncBots(); buildStages(); go('stages');
}

function syncBots() {
  const d = raceDifficulty();
  document.querySelectorAll('#raceOpts .chip').forEach((c, i) => c.setAttribute('aria-pressed', String(i === d)));
}

export function buildLevels() { buildPlay(); buildStages(); }


export const last = { dist: -1, en: -1, low: null, score: -1, chain: -1, tl: -1, cd: -1 };

export function hud() {
  if (state === 'ready') return;
  raceHud();
  const dm = Math.floor(S.pz);
  if (dm !== last.dist) { last.dist = dm; $('dist').textContent = S.endless ? dm + ' m' + (dm < LV.goal ? ' / ' + LV.goal + ' m' : '') : dm + ' / ' + LV.goal + ' m'; $('prog').style.width = (clamp(S.pz / LV.goal, 0, 1) * 100).toFixed(1) + '%'; }
  // race mode shows your pace instead of a score: combo adds speed, low stamina takes it away
  const sc = S.race ? Math.round(racePace(S.chain, S.energy) * draftMul(S) * 100) : Math.floor(S.score);
  if (sc !== last.score || last.race !== !!S.race) {
    last.score = sc; last.race = !!S.race;
    $('score').textContent = S.race ? sc + '%' : fmt(sc);
    const lab = $('score').previousElementSibling; if (lab) lab.textContent = S.race ? 'PACE' : 'SCORE';
  }
  const en = Math.round(S.energy);
  if (en !== last.en) { last.en = en; $('en').style.width = en + '%'; }
  if (S.exhausted !== last.low) { last.low = S.exhausted; $('en').classList.toggle('low', S.exhausted); }
  // colour shifts as stamina drops; in a race, say out loud how much speed it is costing you
  const lvl = en < 10 ? 2 : en < 40 ? 1 : 0;   // green: no penalty, yellow: a little, orange: you are out
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

// Every challenge, closest to finished first, with its reward's stats so players can pick what to chase.
function buildChallenges() {
  $('chalNote').textContent = doneCount() + ' of ' + CHALLENGES.length + ' unlocked. Progress carries across every run.';
  const pct = c => Math.min(1, tallyOf(c.tally) / c.target);
  const draw = () => {
    const nodes = CHALLENGES.slice().sort((a, b) => (isDone(a) - isDone(b)) || (pct(b) - pct(a))).map(c => {
      const li = document.createElement('li'); if (isDone(c)) li.className = 'done';
      const stats = ITEM_STATS[c.key] && ITEM_STATS[c.key][c.val];
      const head = document.createElement('div'); head.className = 'chalh';
      const name = document.createElement('b'); name.textContent = c.name;
      const num = document.createElement('small'); num.textContent = isDone(c) ? 'Unlocked' : fmt(Math.min(tallyOf(c.tally), c.target)) + ' / ' + fmt(c.target);
      head.appendChild(name); head.appendChild(num);
      const what = document.createElement('span'); what.textContent = c.text;
      const bar = document.createElement('div'); bar.className = 'statb'; const fill = document.createElement('i'); fill.className = 'up'; fill.style.width = (pct(c) * 100).toFixed(0) + '%'; bar.appendChild(fill);
      const hint = document.createElement('small'); hint.textContent = stats ? 'Race stats: ' + statHint(stats) : 'Looks only';
      [head, what, bar, hint].forEach(n => li.appendChild(n));
      return li;
    });
    pageInto($('chalList'), nodes, $('chalPager'));
  };
  draw();
  relayoutWith(draw);
}

function showHowTab(id) {
  document.querySelectorAll('#howTabs .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.tab === id)));
  const src = $(id), list = $('howList');
  list.className = 'paged ' + (id === 'howCombos' ? 'combos' : 'rules');
  const draw = () => pageInto(list, Array.from(src.children).map(n => n.cloneNode(true)), $('howPager'));
  draw();
  relayoutWith(draw);
}

export function init() {
  $('replayBtn').addEventListener('click', startReplay);
  $('shareBtn').addEventListener('click', () => {
    const where = LV.name, text = S.race
      ? 'I came ' + ordinal(S.race.place) + ' on ' + where + ' in Excuse Me, finishing in ' + fmtTime(S.time) + '.'
      : 'I walked ' + Math.floor(S.pz) + ' m through ' + where + ' in Excuse Me and scored ' + fmt(S.score) + (S.closest ? ', with a ' + Math.max(1, Math.round(S.closest.gap * 100)) + ' cm close call' : '') + '.';
    shareRun(text);
  });
  $('playBtn').addEventListener('click', () => { buildPlay(); go('play'); });
  $('chalBtn').addEventListener('click', () => { go('chal'); buildChallenges(); });
  $('howBtn').addEventListener('click', () => { go('howto'); showHowTab('howControls'); });
  $('setBtn').addEventListener('click', () => go('settings'));
  $('pauseSet').addEventListener('click', () => go('settings'));
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', back));
  document.querySelectorAll('#howTabs .chip').forEach(c => c.addEventListener('click', () => showHowTab(c.dataset.tab)));
  document.querySelectorAll('#raceOpts .chip').forEach((c, i) => c.addEventListener('click', () => { store.set('excuseme_botlvl', String(i)); syncBots(); }));
  const flag = (id, on, set, key) => { const el = $(id); el.checked = on; el.addEventListener('change', e => { set(e.target.checked); store.set(key, e.target.checked ? '1' : '0'); }); };
  flag('calmT', calm, setCalm, 'excuseme_calm');
  flag('cuesT', cues, setCues, 'excuseme_cues');
  const vol = (id, get, set) => { const el = $(id); el.value = String(Math.round(get() * 100)); el.addEventListener('input', e => set(e.target.value / 100)); };
  vol('musicVol', () => Music.musicVol, v => Music.setMusicVol(v));
  vol('sfxVol', () => Music.sfxVol, v => Music.setSfxVol(v));
  $('again').addEventListener('click', () => start(lastDaily, lastMode));
  $('tutBtn').addEventListener('click', () => { store.set('excuseme_tut', '0'); start('classic'); });
  $('tutSkip').addEventListener('click', e => { e.stopPropagation(); if (S.tut) endTut(); });
  $('tutSkip').addEventListener('pointerdown', e => e.stopPropagation());
  $('next').addEventListener('click', () => { setLevel(Math.min(LEVELS.length - 1, LVI + 1)); start(false); });
  $('menu').addEventListener('click', () => { Music.ambStop(); toMenu(); });
  $('pauseBtn').addEventListener('click', e => { e.stopPropagation(); pauseGame(); });
  $('pauseBtn').addEventListener('pointerdown', e => e.stopPropagation());
  $('resume').addEventListener('click', resumeGame);
  $('restart').addEventListener('click', () => { $('pause').hidden = true; Music.ambStop(); start(lastDaily, lastMode); });
  $('pmenu').addEventListener('click', () => { quitRun(); Music.stop(); Music.ambStop(); toMenu(); });
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
