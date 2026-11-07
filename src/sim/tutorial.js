import { Music } from '../audio/music.js';
import { LV, SPAWN_FAR } from '../config/levels.js';
import { rnd } from '../config/util.js';
import { $ } from '../dom.js';
import { buzz, store } from '../save/store.js';
import { genChunk, mk } from './people.js';
import { S, goalOf } from './state.js';


/* ---------- first-run tutorial ---------- */
export const TUT = [
  { text: 'Hold the RIGHT side of the screen to steer right.', zone: 'R', done: () => S.tutHold > 0.6 },
  { text: 'Now hold the LEFT side to steer left.', zone: 'L', done: () => S.tutHold < -0.6 },
  { text: 'Double tap one side to DASH sideways.', zone: 'LR', done: () => S.dashT > 0 },
  { text: 'Double tap BOTH sides at the same time to BURST forward.', zone: 'both', done: () => S.burstT > 0 },
  { text: 'Hold both thumbs down for a moment to say "Excuse me". The person ahead steps aside.', zone: 'LR', done: () => S.shoutCD > 0 },
  { text: 'Skill move: walk at the person ahead, then DASH sideways at the very last moment. Close calls give a free boost.', zone: 'LR', done: () => S.perfectT > 0 },
  { text: 'Another: walk up close, then hold both thumbs just before you would touch them. A well timed "Excuse me" is stronger and recharges faster.', zone: 'LR', done: () => S.tutPerfectShout },
  { text: "That's it. Pass people for points and don't touch anyone. Go!", zone: null, done: () => S.tut.t > 2.6 }
];

export function beginTut() {
  S.tut = { step: 0, t: 0 }; S.tutHold = 0; S.tutPerfectShout = false;
  S.people = S.people.filter(p => p.prop);
  $('tut').classList.remove('coach'); $('tut').hidden = false; tutUI();
}

function tutUI() { $('tutStep').textContent = 'Tutorial ' + (S.tut.step + 1) + ' / ' + TUT.length; $('tutText').textContent = TUT[S.tut.step].text; }

export function tutTick(dt) {
  S.tut.t += dt;
  if (S.tut.t > 0.4 && TUT[S.tut.step].done()) {
    S.tut.step++; S.tut.t = 0; S.tutHold = 0; Music.sfx('combo'); buzz(10);
    if (S.tut.step >= TUT.length) { endTut(); return; }
    if (S.tut.step === 4) mk(S.px, S.pz + 9, { hx: 0, hz: 1, v0: 1.0, laneX: S.px, fadeT: 0 });
    if (S.tut.step === 6) S.tutPerfectShout = false;   // only a well timed shout made during this step counts
    if (S.tut.step === 5 || S.tut.step === 6) spawnStander();
    tutUI();
  }
  // practice steps: if the player has walked past the practice person, put a fresh one ahead
  if (S.tut && (S.tut.step === 5 || S.tut.step === 6) && S.tut.t > 1 && !S.people.some(p => !p.prop && !p.dead && p.z - S.pz > 1.5)) spawnStander();
}

function spawnStander() { mk(S.px, S.pz + 9, { v0: 0, laneX: S.px, fadeT: 0 }); }

export function endTut() {
  S.tut = null; store.set('excuseme_tut', '1'); $('tut').hidden = true;
  S.nextChunk = Math.ceil((S.pz + 22) / 4) * 4;
  const before = new Set(S.people);
  while (S.nextChunk < S.pz + SPAWN_FAR && S.nextChunk < goalOf() - 15) { genChunk(S.nextChunk); S.nextChunk += 4; }
  for (const p of S.people) if (!before.has(p) && !p.prop && p.z - S.pz < SPAWN_FAR - 2) p.fadeT = 0;
  S.timeLeft = S.endless ? Infinity : LV.limit; S.eventT = 16; S.rivalT = 8; S.fastT = 3; S.rushT = rnd(28, 40);
  if (LV.id === 'nyc') for (const x of S.xings) if (x.z < S.pz + 20) { x.sig = x.spawned = x.walk = true; }
}
