import { GEARS, HAIRS, SKINS } from '../config/colour.js';
import { LEVELS } from '../config/levels.js';
import { store } from './store.js';



/* ---------- look (customization) ---------- */
export const LOOK_OPTS = [
  { key: 'shirt', label: 'Shirt', type: 'color', vals: ['#ffcf1f', '#e2574c', '#2f80ed', '#27ae60', '#f2994a', '#9b51e0', '#14b8a6', '#d6336c', '#111827', '#f4f1ea', { c: '#d4af37', req: 5, name: 'Gold shirt' }, { c: '#39ff14', req: 7, name: 'Neon shirt' }] },
  { key: 'pants', label: 'Pants', type: 'color', vals: ['#1e3a5f', '#1f2937', '#334155', '#4b5563', '#7a6a50', '#c2b280'] },
  { key: 'shoe', label: 'Shoes', type: 'color', vals: ['#f4f6f8', '#2b2f36', '#e2574c', '#2f80ed', '#7a4b2a', { c: '#d4af37', req: 4, name: 'Gold sneakers' }] },
  { key: 'skin', label: 'Skin', type: 'color', vals: SKINS },
  { key: 'hair', label: 'Hair colour', type: 'color', vals: HAIRS },
  { key: 'hairStyle', label: 'Hair style', type: 'chip', vals: [['short', 'Short'], ['long', 'Long'], ['bald', 'Bald'], ['mohawk', 'Mohawk', 6]] },
  { key: 'hat', label: 'Head', type: 'chip', vals: [['none', 'None'], ['cap', 'Cap'], ['beanie', 'Beanie', 1], ['headphones', 'Headphones', 2], ['crown', 'Crown', 9]] },
  { key: 'face', label: 'Face', type: 'chip', vals: [['none', 'None'], ['shades', 'Shades', 3]] },
  { key: 'pack', label: 'Back', type: 'chip', vals: [['none', 'None'], ['pack', 'Backpack'], ['jet', 'Jetpack', 8]] },
  { key: 'gear', label: 'Hat and backpack colour', type: 'color', vals: GEARS }
];

const LOOK_DEFAULT = { shirt: '#ffcf1f', pants: '#1e3a5f', shoe: '#f4f6f8', skin: '#c68863', hair: '#3b2a1e', hairStyle: 'short', hat: 'cap', face: 'none', pack: 'pack', gear: '#111827' };

export let LOOK = Object.assign({}, LOOK_DEFAULT);

try { Object.assign(LOOK, JSON.parse(store.get('excuseme_look', '{}'))); } catch (e) {}


export const starsOf = id => parseInt(store.get('excuseme_stars_' + id, '0'), 10) || 0;
   // bitmask: 1 finish, 2 score, 4 chain
const nbits = m => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);

export const totalStars = () => LEVELS.reduce((n, L) => n + nbits(starsOf(L.id)), 0);

export const STAR_CHAIN = 15;

// every unlockable: [option key, value, stars needed, name]
export function unlockables() {
  const out = [];
  for (const o of LOOK_OPTS) for (const v of o.vals) {
    if (o.type === 'color' && typeof v === 'object') out.push([o.key, v.c, v.req, v.name]);
    else if (o.type === 'chip' && v[2]) out.push([o.key, v[0], v[2], v[1]]);
  }
  return out;
}

function sanitizeLook() {   // drop anything still locked (for example after clearing progress)
  const have = totalStars();
  for (const [k, v, req] of unlockables()) if (LOOK[k] === v && req > have) LOOK[k] = LOOK_DEFAULT[k];
}

sanitizeLook();
