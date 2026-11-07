import { stripLane, beltInfo, beltAt } from '../config/strips.js';
import { LV } from '../config/levels.js';
import { $ } from '../dom.js';
import { store } from '../save/store.js';
import { S } from './state.js';


/* ---------- race coach: short tips on your first race against bots. They never pause the race. ---------- */
const TIPS = [
  { id: 'slip', text: 'Stay right behind someone to SLIPSTREAM. Wind lines mean a speed boost.', done: () => S.draftT > 0 },
  { id: 'strip', when: () => !!stripLane(LV.id), text: 'The coloured strip on the floor is FAST. Steer onto it, but watch for obstacles.', done: () => !!S.onStrip },
  { id: 'belt', when: () => !!beltInfo(LV.id), text: 'The moving walkway on the RIGHT carries you forward. The left one pulls you back.', done: () => beltAt(LV.id, S.px, S.pz) > 0 },
  { id: 'bump', text: 'Bumping someone costs about a second and a half. A clean race wins.', done: () => S.coach.t > 4 }
];
const GIVE_UP = 12;   // seconds a tip waits for you before moving on

export function beginCoach(mode) {
  S.coach = null; shown = '';
  if (mode !== 'race' || S.duel || store.get('excuseme_racetut', '0') === '1') return;
  S.coach = { tips: TIPS.filter(t => !t.when || t.when()), i: 0, t: 0 };
}

export function coachTick(dt) {
  const c = S.coach; if (!c) return;
  c.t += dt;
  if (c.t > 1 && (c.tips[c.i].done() || c.t > GIVE_UP)) {
    c.i++; c.t = 0;
    if (c.i >= c.tips.length) endCoach();
  }
}

export function endCoach() {
  if (!S.coach) return;
  S.coach = null; store.set('excuseme_racetut', '1');
}

// Screen side, called every frame from the HUD: shows the current tip in the tutorial panel. The simulation never touches the page.
let shown = '';
export function syncCoach() {
  const c = S && S.coach, key = c ? String(c.i) : '';
  if (key === shown) return;
  shown = key;
  $('tut').hidden = !c; $('tut').classList.toggle('coach', !!c);
  if (c) { $('tutStep').textContent = 'Race tip ' + (c.i + 1) + ' / ' + c.tips.length; $('tutText').textContent = c.tips[c.i].text; }
}
