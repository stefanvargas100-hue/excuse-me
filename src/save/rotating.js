/* ---------- rotating challenges: 3 new ones every day, 2 bigger ones every week ----------
   Picked from a pool by the date, so everyone gets the same set. They only count what you do while they are active.
   They do not unlock gear (the long challenges do that); they are a reason to play one more run, and they add to a lifetime total. */
import { hashStr, todayKey, weekKey } from '../config/util.js';

// [tally name, daily target, weekly target, text for a target of {n}]
const POOL = [
  ['passes', 120, 450, 'Pass {n} people'],
  ['close', 15, 60, 'Make {n} close calls'],
  ['dashes', 25, 90, 'Dash {n} times'],
  ['bursts', 15, 50, 'Burst forward {n} times'],
  ['shouts', 12, 40, 'Say "Excuse me" {n} times'],
  ['perfectDashes', 5, 20, 'Land {n} Perfect Dashes'],
  ['perfectShouts', 4, 15, 'Land {n} Perfect Excuse Mes'],
  ['razor', 8, 30, 'Squeeze past {n} Razors'],
  ['juke', 8, 30, 'Pull off {n} Jukes'],
  ['sweep', 8, 30, 'Land {n} Sweeps'],
  ['snake', 6, 20, 'Weave {n} Snakes'],
  ['x8', 2, 6, 'Reach a ×8 combo {n} times'],
  ['burned', 3, 10, 'Burn {n} rivals']
];
const COUNT = { daily: 3, weekly: 2 };

// The same period key always gives the same set: a seeded shuffle of the pool.
export function challengesFor(period, key) {
  const idx = POOL.map((_, i) => i);
  let h = hashStr(period + ':' + key + ':rot');
  for (let i = idx.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, COUNT[period]).map(i => {
    const [tally, d, w, text] = POOL[i], target = period === 'daily' ? d : w;
    return { id: period + ':' + key + ':' + tally, period, tally, target, text: text.replace('{n}', target.toLocaleString('en-US')) };
  });
}

export function createRotating({ store, keys, onComplete }) {
  const K = 'excuseme_rot';
  const read = () => { try { return JSON.parse(store.get(K, '{}')) || {}; } catch (e) { return {}; } };
  const save = s => { try { store.set(K, JSON.stringify(s)); } catch (e) {} };

  // Saved progress for the current periods only; older periods are dropped, the lifetime total is kept.
  function state() {
    const s = read(), d = keys.daily(), w = keys.weekly();
    if (s.dailyKey !== d) { s.dailyKey = d; s.daily = {}; }
    if (s.weeklyKey !== w) { s.weeklyKey = w; s.weekly = {}; }
    s.total = s.total || 0;
    return s;
  }

  function active() {
    const s = state();
    return [['daily', s.dailyKey], ['weekly', s.weeklyKey]].flatMap(([p, k]) => challengesFor(p, k).map(c => ({ ...c, progress: Math.min(c.target, (s[p][c.id] || 0)), done: (s[p][c.id] || 0) >= c.target })));
  }

  function add(name, n = 1) {
    const s = state(); let changed = false;
    for (const c of active()) {
      if (c.tally !== name || c.done) continue;
      const bag = s[c.period], now = Math.min(c.target, (bag[c.id] || 0) + n);
      bag[c.id] = now; changed = true;
      if (now >= c.target) { s.total++; if (onComplete) onComplete(c); }
    }
    if (changed) save(s);
  }

  return { add, list: active, completedTotal: () => state().total };
}

// The live instance, used by the game.
let live = null;
export function setRotating(r) { live = r; }
export const rotateAdd = (name, n) => { if (live) live.add(name, n); };
export const rotatingList = () => (live ? live.list() : []);
export const rotatingTotal = () => (live ? live.completedTotal() : 0);
export const liveKeys = { daily: () => todayKey(), weekly: () => weekKey() };
