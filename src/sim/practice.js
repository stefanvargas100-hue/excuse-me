import { Music } from '../audio/music.js';
import { BASE } from '../config/tuning.js';
import { $ } from '../dom.js';
import { setLastBoth, setPendingDash } from '../input/input.js';
import { buzz } from '../save/store.js';
import { mk } from './people.js';
import { S } from './state.js';

/* ---------- practice lessons ----------
   Four short, repeatable lessons on a bare street: no crowd, no bots, no clock. Success is decided by the same pass, dash and
   slipstream code that ordinary races use (those functions post events to S.lesson.log); a lesson only watches the events.
   A failed attempt restarts the lesson, not the run: fresh people, full stamina, no leftover boosts. */
export const PRACTICE_OUTFIT = { body: 'm', build: 'medium', shirtType: 'tee', pantsType: 'jeans', shoeType: 'sneakers', hat: 'cap', pack: 'pack' };
const CLOSE_GAP = 0.4, PERFECT_DASH_M = 1.6;   // same numbers as scoring.js and actions.js, quoted in the hints

const stand = (x, z) => mk(x, z, { v0: 0, laneX: x, fadeT: 0 });

export const LESSONS = [
  { id: 'close', name: 'Close pass', brief: 'Walk past each person with under 40 cm to spare, without touching. Steer towards them, then past.', need: 2,
    setup: L => { [-1.2, 1.2, -1.2, 1.2].forEach((x, i) => L.people.push(stand(x, 10 + i * 5))); },
    onEvent(L, e) {
      if (e.k !== 'pass') return;
      const cm = Math.round(e.gap * 100);
      if (e.gap < CLOSE_GAP) {
        L.data.close = (L.data.close || 0) + 1;
        if (L.data.close >= this.need) win(L, 'Done: ' + this.need + ' close passes. Each one refilled stamina and gave a short speed boost.');
        else L.msg = 'Close pass, ' + cm + ' cm. One more.';
      } else L.msg = 'That pass left ' + cm + ' cm. Get under 40 cm for CLOSE, under 15 for RAZOR.';
    },
    outOfPeople: 'Out of people. Steer closer to each one this time.' },
  { id: 'dash', name: 'Perfect dash', brief: 'Walk straight at the person, then double tap a side to dash around them at the last moment.',
    setup: L => { L.people.push(stand(0, 14)); },
    onEvent(L, e) {
      if (e.k !== 'dash') return;
      if (e.perfect) win(L, 'Perfect dash! It cost no stamina and gave a burst of speed.');
      else if (e.dz == null) fail(L, 'That dash had nobody in front of it. Dash when you are within 1.6 m of them.');
      else fail(L, 'Dash started ' + e.dz.toFixed(1) + ' m away: too ' + (e.dz > PERFECT_DASH_M ? 'early' : 'late') + '. Perfect is within ' + PERFECT_DASH_M + ' m, just before contact.');
    },
    outOfPeople: 'You went round without a perfect dash. Walk straight at them and dash late.' },
  { id: 'thread', name: 'Thread the needle', brief: 'Steer through the gap in each pair so you pass one on your left and the next on your right, a moment apart.',
    setup: L => { [0, 0.6, -0.6].forEach((j, i) => { const z = 10 + i * 8; L.people.push(stand(j - 0.95, z), stand(j + 0.95, z + 0.8)); }); },
    onEvent(L, e) {
      if (e.k === 'pass' && e.tags.includes('THREAD THE NEEDLE')) win(L, 'Thread the needle! Quick left-right passes through a gap score big.');
    },
    outOfPeople: 'No thread that time. Line up with the middle of each pair and keep going straight through.' },
  { id: 'slip', name: 'Slipstream', brief: 'Walk right behind the person ahead and stay lined up. After about a second you get a slipstream boost: use it to overtake.',
    setup: L => { L.people.push(mk(0, 6, { hx: 0, hz: 1, v0: 1.5, laneX: 0, fadeT: 0 })); },
    onEvent(L, e) {
      if (e.k === 'slip') { L.data.slipped = true; L.msg = 'Slipstream! Overtake now: burst by double tapping both sides (costs stamina).'; }
      else if (e.k === 'pass' && L.data.slipped) win(L, 'Slipstream and overtake! Stamina left: ' + Math.round(S.energy) + '%. A burst costs 30.');
      else if (e.k === 'pass') fail(L, 'You passed without a slipstream. Stay within 4 m directly behind them, under 60 cm to the side, for about a second.');
    },
    outOfPeople: 'They got away. Stay close behind them.' }
];

export const lessonIndex = id => LESSONS.findIndex(l => l.id === id);

function clearBoosts() {
  Object.assign(S, { energy: 100, burstT: 0, dashT: 0, dashCool: 0, perfectT: 0, streakT: 0, nearT: 0, nearAmt: 0, nearHits: 0, draftT: 0, draftC: 0, draftCool: 0, bumpT: 0, ghostT: 0, bumpCool: 0, blockT: 0, slipT: 0, flash: 0, vx: 0, chain: 0, snake: 0, oncRun: 0, multPrev: 1, sweepDir: 0, sweepCount: 0, boostPasses: 0 });
  setPendingDash(null); setLastBoth(-9999);   // queued taps from the last attempt must not fire in the next one
}

function build(L) {
  S.people.length = 0; L.people = []; L.data = {}; L.log.length = 0; L.allPassedT = 0;
  S.px = 0; S.pz = 0; S.me.x = 0; S.me.z = 0; S.speed = BASE; S.camX = 0;
  clearBoosts();
  L.def.setup(L);
}

export function beginLesson(id) {
  const def = LESSONS[Math.max(0, lessonIndex(id))];
  S.lesson = { id: def.id, def, attempt: 1, status: 'run', msg: '', log: [], people: [], data: {}, allPassedT: 0 };
  S.nextChunk = Infinity;      // no crowd generation
  S.race.countT = 0;           // no countdown
  build(S.lesson);
}

export function restartLesson() { const L = S.lesson; if (!L) return; L.status = 'run'; L.msg = ''; L.attempt++; build(L); }
const fail = (L, msg) => { restartLesson(); L.msg = msg; };
const win = (L, msg) => { L.status = 'done'; L.msg = msg; Music.sfx('win'); buzz([20, 40, 20]); };

export function lessonTick(dt) {
  const L = S.lesson; if (!L) return;
  const events = L.log.splice(0);
  if (L.status !== 'run') return;
  for (const e of events) {
    if (L.status !== 'run') break;
    if (e.k === 'bump') { fail(L, 'You touched someone. Slow down and aim for the gaps.'); break; }
    L.def.onEvent(L, e);
  }
  if (L.status !== 'run') return;
  if (L.people.length && L.people.every(p => p.passed || p.z < S.pz)) { L.allPassedT += dt; if (L.allPassedT > 0.5) fail(L, L.def.outOfPeople); } else L.allPassedT = 0;
}

/* ---------- the lesson panel (screen side; the simulation never touches the page) ---------- */
let shown = '';
export function syncLesson() {
  const L = S && S.lesson, key = L ? [L.id, L.attempt, L.status, L.msg].join('|') : '';
  if (key === shown && $('lesson').hidden === !L) return;
  shown = key;
  $('lesson').hidden = !L;
  if (!L) return;
  const n = LESSONS.length, i = lessonIndex(L.id);
  $('lessonStep').textContent = 'Lesson ' + (i + 1) + ' / ' + n + ' · ' + L.def.name + (L.attempt > 1 ? ' · try ' + L.attempt : '');
  $('lessonText').textContent = L.status === 'done' ? L.msg : L.def.brief;
  $('lessonMsg').textContent = L.status === 'done' ? '' : L.msg; $('lessonMsg').hidden = L.status === 'done' || !L.msg;
  $('lessonBtns').hidden = L.status !== 'done';
  $('lessonNext').hidden = i >= n - 1;
}
