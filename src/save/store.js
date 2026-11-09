import { PLAYTEST } from '../config/channel.js';

// The playtest keeps its own save under this prefix, starting from one copy of the live save. The live save is never written.
const PREFIX = PLAYTEST ? 'playtest:' : '';
const SEEDED = 'playtest:seeded';
if (PLAYTEST) {
  try {
    if (localStorage.getItem(SEEDED) === null) {
      const live = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith(PREFIX)) live.push(k); }
      live.forEach(k => localStorage.setItem(PREFIX + k, localStorage.getItem(k)));
      localStorage.setItem(SEEDED, '1');
    }
  } catch (e) {}
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem(PREFIX + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(PREFIX + k, v); } catch (e) {} }
};

export let vibOn = store.get('excuseme_vib', '1') !== '0';

export function buzz(pattern) { if (!vibOn) return; try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }

export function setVibOn(v) { vibOn = v; }
