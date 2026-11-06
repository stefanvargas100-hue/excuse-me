import { store } from './store.js';
import { gainXp, XP_DAILY, XP_UNLOCK, XP_WEEKLY } from './level.js';
import { createRotating, liveKeys, rotateAdd, setRotating } from './rotating.js';

/* ---------- challenges: the only way to unlock gear. Tallies last across every run and never reset. ---------- */
// [unlock slot, unlock value, reward name, tally, target, what to do]
const row = (key, val, name, tally, target, text) => ({ key, val, name, tally, target, text, id: key + ':' + val });

export const CHALLENGES = [
  // headpieces
  row('hat', 'beanie', 'Beanie', 'passes', 1000, 'Pass 1,000 people'),
  row('hat', 'visor', 'Visor', 'juke', 100, 'Pull off 100 Jukes'),
  row('hat', 'sweatband', '80s sweatband', 'dashes', 300, 'Dash 300 times'),
  row('hat', 'bucket', 'Y2K bucket hat', 'snake', 75, 'Weave 75 Snakes'),
  row('hat', 'headphones', 'Headphones', 'x8', 5, 'Reach a ×8 combo 5 times'),
  row('hat', 'shades', 'Shades', 'razor', 100, 'Squeeze past 100 Razors'),
  row('hat', 'fedora', 'Fedora', 'burned', 25, 'Burn 25 rivals'),
  row('hat', 'tiara', 'Tiara', 'far_nyc', 400, 'Reach 400 m on Fifth Avenue in one classic run'),
  row('hat', 'crown', 'Crown', 'winsMH', 10, 'Win 10 races on Medium or Hard'),
  // shirts
  row('shirtType', 'baby', 'Y2K baby tee', 'thread', 30, 'Thread the Needle 30 times'),
  row('shirtType', 'velour', 'Y2K velour jacket', 'slips', 40, 'Earn 40 slipstreams in races'),
  row('shirtType', 'wind', '80s windbreaker', 'sweep', 100, 'Land 100 Sweeps'),
  row('shirtType', 'varsity', 'Varsity jacket', 'wins', 5, 'Win 5 races'),
  row('shirtType', 'power', '80s power blazer', 'far_airport', 700, 'Reach 700 m in Terminal B in one classic run'),
  row('shirtType', 'puffer', 'Puffer jacket', 'weeklyRuns', 4, 'Play 4 weekly runs'),
  row('shirtType', 'dress', 'Sundress', 'mega', 15, 'Land 15 Mega Sweeps'),
  row('shirtType', 'suit', 'Suit jacket', 'winsHard', 3, 'Win 3 races on Hard'),
  // pants and skirts
  row('pantsType', 'track', '80s track pants', 'doubleSlip', 15, 'Earn 2 slipstreams within 20 seconds, 15 times'),
  row('pantsType', 'flares', 'Y2K flares', 'close', 300, 'Make 300 close calls'),
  row('pantsType', 'acid', '80s acid wash', 'bursts', 200, 'Burst 200 times'),
  row('pantsType', 'parachute', 'Parachute pants', 'bullet', 40, 'Ride 40 Bullet Trains'),
  row('pantsType', 'slacks', 'Suit trousers', 'burned', 50, 'Burn 50 rivals'),
  row('pantsType', 'pleats', 'Pleated skirt', 'chain', 30, 'Chain 30 passes in one run'),
  row('pantsType', 'pencil', 'Pencil skirt', 'far_shibuya', 300, 'Reach 300 m on Shibuya Crossing in one classic run'),
  // shoes
  row('shoeType', 'hightops', '80s high-tops', 'far_nyc', 550, 'Reach 550 m on Fifth Avenue in one classic run'),
  row('shoeType', 'dad', 'Chunky trainers', 'passes', 2500, 'Pass 2,500 people'),
  row('shoeType', 'platforms', 'Y2K platforms', 'passes', 5000, 'Pass 5,000 people'),
  row('shoeType', 'heels', 'Heels', 'shouts', 200, 'Say "Excuse me" 200 times'),
  row('shoeType', 'oxfords', 'Dress shoes', 'winsHard', 1, 'Win a race on Hard'),
  // back
  row('pack', 'fanny', 'Y2K belt bag', 'salmon', 40, 'Do 40 Salmon Runs'),
  row('pack', 'messenger', 'Messenger bag', 'races', 25, 'Finish 25 races'),
  row('pack', 'boombox', '80s boombox', 'dailyRuns', 14, 'Play 14 daily runs'),
  row('pack', 'jet', 'Jetpack', 'slips', 150, 'Earn 150 slipstreams in races'),
  // skill
  row('hat', 'beret', 'Beret', 'perfectDashes', 50, 'Land 50 Perfect Dashes'),
  row('shoeType', 'loafers', 'Loafers', 'perfectShouts', 40, 'Land 40 Perfect Excuse Mes'),
  // hair and colours: looks only
  row('hairStyle', 'mohawk', 'Mohawk', 'far_shibuya', 450, 'Reach 450 m on Shibuya Crossing in one classic run'),
  row('shirt', '#d4af37', 'Gold shirt', 'bestScore', 12000, 'Score 12,000 in one classic run'),
  row('shirt', '#39ff14', 'Neon shirt', 'cleanWins', 1, 'Win a race on Medium or Hard without a single bump'),
  row('shoe', '#d4af37', 'Gold sneakers', 'x8', 25, 'Reach a ×8 combo 25 times')
];

const byItem = new Map(CHALLENGES.map(c => [c.id, c]));
export const challengeFor = (key, val) => byItem.get(key + ':' + val) || null;

let tally = {};
try { tally = JSON.parse(store.get('excuseme_tally', '{}')) || {}; } catch (e) {}

export const tallyOf = name => tally[name] || 0;
export const isDone = c => tallyOf(c.tally) >= c.target;
export const isLocked = (key, val) => { const c = challengeFor(key, val); return !!c && !isDone(c); };
// The unfinished challenge you are closest to (and have started), for the results screen.
export function nextGoal() {
  let best = null, bp = 0;
  for (const c of CHALLENGES) { if (isDone(c)) continue; const p = tallyOf(c.tally) / c.target; if (p > bp) { bp = p; best = c; } }
  return best ? { name: best.name, text: best.text, remaining: best.target - tallyOf(best.tally), c: best } : null;
}
export const doneCount = () => CHALLENGES.filter(isDone).length;

let listener = null;
export function setUnlockListener(fn) { listener = fn; }

function setTally(name, value) {
  const before = CHALLENGES.filter(c => c.tally === name && !isDone(c));
  tally[name] = value;
  store.set('excuseme_tally', JSON.stringify(tally));
  for (const c of before) if (isDone(c)) { gainXp(XP_UNLOCK); if (listener) listener(c); }
}
// Add to a running total, such as people passed.
export const track = (name, n = 1) => { setTally(name, tallyOf(name) + n); rotateAdd(name, n); };

// Today's and this week's rotating challenges count the same events.
let rotListener = null;
export function setRotatingListener(fn) { rotListener = fn; }
setRotating(createRotating({ store, keys: liveKeys, onComplete: c => { gainXp(c.period === 'daily' ? XP_DAILY : XP_WEEKLY); if (rotListener) rotListener(c); } }));
// Keep the best single result, such as distance in one run.
export const trackMax = (name, value) => { const v = Math.floor(value); if (v > tallyOf(name)) setTally(name, v); };
