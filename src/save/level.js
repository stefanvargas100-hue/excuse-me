/* ---------- account level: XP from challenges and every run; levels unlock titles and playercard pictures ---------- */
import { store as realStore } from './store.js';

// Total XP needed to reach a level: 100 for level 2, 300 for 3, 1,000 for 5, 4,500 for 10. Each level costs a bit more than the last.
export const xpToReach = n => 50 * n * (n - 1);
export function levelFromXp(xp) { let n = 1; while (xpToReach(n + 1) <= xp) n++; return n; }

// XP for one finished run. Every mode pays; a race against bots pays clearly less than any standard mode, and capped so it cannot be farmed.
export function runXp({ mode, score = 0, won = false, bots = false, bonus = 0 }) {
  if (mode === 'race' && bots) return 6 + (won ? 5 : 0) + Math.max(0, bonus);   // bonus: the clean-race segments
  if (mode === 'race') return 15 + (won ? 10 : 0);
  return 15 + Math.min(60, Math.floor(Math.max(0, score) / 250));
}
export const XP_DAILY = 100, XP_WEEKLY = 350, XP_UNLOCK = 200;

// Rewards. Titles are text; pictures are badges (an emoji on a colour) until there is real art.
export const TITLES = [
  { id: 'newcomer', name: 'Newcomer', level: 1 }, { id: 'commuter', name: 'Commuter', level: 3 },
  { id: 'sidestepper', name: 'Side-Stepper', level: 5 }, { id: 'lanesurfer', name: 'Lane Surfer', level: 8 },
  { id: 'weaver', name: 'Crowd Weaver', level: 12 }, { id: 'expert', name: 'Excuse-Me Expert', level: 16 },
  { id: 'regular', name: 'Rush Hour Regular', level: 20 }, { id: 'menace', name: 'Polite Menace', level: 25 },
  { id: 'razor', name: 'Razor Edge', level: 30 }, { id: 'whisperer', name: 'Crowd Whisperer', level: 40 },
  { id: 'legend', name: 'Legend of the Concourse', level: 50 }
];
export const PICS = [
  { id: 'walker', glyph: '🚶', bg: '#8f7bff', level: 1 }, { id: 'sneaker', glyph: '👟', bg: '#2ec4b6', level: 2 },
  { id: 'bag', glyph: '🎒', bg: '#ffd166', level: 4 }, { id: 'headphones', glyph: '🎧', bg: '#ff6b9d', level: 6 },
  { id: 'coffee', glyph: '☕', bg: '#c98b5b', level: 9 }, { id: 'sunglasses', glyph: '😎', bg: '#4dabf7', level: 11 },
  { id: 'bolt', glyph: '⚡', bg: '#ffb703', level: 14 }, { id: 'train', glyph: '🚆', bg: '#6c757d', level: 18 },
  { id: 'rocket', glyph: '🚀', bg: '#ff5a5f', level: 22 }, { id: 'fire', glyph: '🔥', bg: '#f77f00', level: 27 },
  { id: 'star', glyph: '🌟', bg: '#ffd60a', level: 35 }, { id: 'crown', glyph: '👑', bg: '#d4af37', level: 50 }
];

export function createLevels({ store, onLevelUp }) {
  const KX = 'excuseme_xp', KT = 'excuseme_title', KP = 'excuseme_pic';
  let xp = Math.max(0, parseInt(store.get(KX, '0'), 10) || 0);
  const level = () => levelFromXp(xp);
  const rewardsAt = lvl => [...TITLES.filter(t => t.level === lvl).map(t => ({ kind: 'title', ...t })), ...PICS.filter(p => p.level === lvl).map(p => ({ kind: 'picture', ...p }))];

  function addXp(n) {
    n = Math.floor(Number(n));
    if (!(n > 0)) return;
    const before = level(); xp += n; store.set(KX, String(xp));
    for (let l = before + 1; l <= level(); l++) if (onLevelUp) onLevelUp(l, rewardsAt(l));
  }
  const list = (arr, sel) => arr.map(x => ({ ...x, unlocked: x.level <= level(), selected: x.id === sel }));
  // the one you chose; until you choose, your newest unlocked one
  const pick = (arr, key) => { const id = store.get(key, null), f = arr.find(x => x.id === id); return f && f.level <= level() ? f : arr.filter(x => x.level <= level()).pop(); };
  const choose = (arr, key, id) => { const f = arr.find(x => x.id === id); if (!f || f.level > level()) return false; store.set(key, id); return true; };
  return {
    addXp, xp: () => xp, level, rewardsAt,
    progress() { const l = level(), base = xpToReach(l), next = xpToReach(l + 1); return { level: l, into: xp - base, need: next - base, pct: (xp - base) / (next - base) }; },
    titles: () => list(TITLES, pick(TITLES, KT).id), pics: () => list(PICS, pick(PICS, KP).id),
    title: () => pick(TITLES, KT), pic: () => pick(PICS, KP),
    setTitle: id => choose(TITLES, KT, id), setPic: id => choose(PICS, KP, id)
  };
}

// The live instance, used by the game.
let levelUpListener = null;
export function setLevelUpListener(fn) { levelUpListener = fn; }
const live = createLevels({ store: realStore, onLevelUp: (l, r) => { if (levelUpListener) levelUpListener(l, r); } });
export const gainXp = n => live.addXp(n);
export const account = live;
