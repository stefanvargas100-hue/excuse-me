import { GEARS, HAIRS, SKINS } from '../config/colour.js';
import { LEVELS } from '../config/levels.js';
import { store } from './store.js';



/* ---------- look (customization) ---------- */
export const LOOK_OPTS = [
  { key: 'body', label: 'Body', type: 'chip', vals: [['m', 'Male'], ['f', 'Female']] },
  { key: 'build', label: 'Build', type: 'chip', vals: [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']] },
  { key: 'shirtType', label: 'Shirt', type: 'chip', vals: [['tee', 'T-shirt'], ['tank', 'Tank top'], ['hoodie', 'Hoodie'], ['jacket', 'Track jacket']] },
  { key: 'shirt', label: 'Shirt colour', type: 'color', vals: ['#ffcf1f', '#e2574c', '#2f80ed', '#27ae60', '#f2994a', '#9b51e0', '#14b8a6', '#d6336c', '#111827', '#f4f1ea', { c: '#d4af37', req: 5, name: 'Gold shirt' }, { c: '#39ff14', req: 7, name: 'Neon shirt' }] },
  { key: 'pantsType', label: 'Pants', type: 'chip', vals: [['jeans', 'Jeans'], ['shorts', 'Shorts'], ['joggers', 'Joggers'], ['cargo', 'Cargo']] },
  { key: 'pants', label: 'Pants colour', type: 'color', vals: ['#1e3a5f', '#1f2937', '#334155', '#4b5563', '#7a6a50', '#c2b280'] },
  { key: 'shoeType', label: 'Shoes', type: 'chip', vals: [['sneakers', 'Sneakers'], ['runners', 'Runners'], ['boots', 'Boots'], ['slides', 'Slides']] },
  { key: 'shoe', label: 'Shoe colour', type: 'color', vals: ['#f4f6f8', '#2b2f36', '#e2574c', '#2f80ed', '#7a4b2a', { c: '#d4af37', req: 4, name: 'Gold sneakers' }] },
  { key: 'skin', label: 'Skin', type: 'color', vals: SKINS },
  { key: 'hair', label: 'Hair colour', type: 'color', vals: HAIRS },
  { key: 'hairStyle', label: 'Hair style', type: 'chip', vals: [['short', 'Short'], ['long', 'Long'], ['bald', 'Bald'], ['mohawk', 'Mohawk', 6]] },
  { key: 'hat', label: 'Headpiece', type: 'chip', vals: [['cap', 'Cap'], ['beanie', 'Beanie', 1], ['headphones', 'Headphones', 2], ['shades', 'Shades', 3], ['crown', 'Crown', 9]] },
  { key: 'showHead', label: 'Show headpiece (stats stay either way)', type: 'chip', vals: [['1', 'Show'], ['0', 'Hide']] },
  { key: 'pack', label: 'Back', type: 'chip', vals: [['pack', 'Backpack'], ['sling', 'Sling bag'], ['jet', 'Jetpack', 8]] },
  { key: 'gear', label: 'Hat and backpack colour', type: 'color', vals: GEARS }
];

const LOOK_DEFAULT = { body: 'm', build: 'medium', shirtType: 'tee', pantsType: 'jeans', shoeType: 'sneakers', shirt: '#ffcf1f', pants: '#1e3a5f', shoe: '#f4f6f8', skin: '#c68863', hair: '#3b2a1e', hairStyle: 'short', hat: 'cap', showHead: '1', pack: 'pack', gear: '#111827' };

export let LOOK = Object.assign({}, LOOK_DEFAULT);

try { Object.assign(LOOK, JSON.parse(store.get('excuseme_look', '{}'))); } catch (e) {}

// Older saves could wear nothing on the head or back. Keep how they looked, now that every slot is required.
if (LOOK.hat === 'none' || !LOOK.hat) { if (LOOK.face === 'shades') LOOK.hat = 'shades'; else { LOOK.hat = 'cap'; LOOK.showHead = '0'; } }
if (LOOK.pack === 'none' || !LOOK.pack) LOOK.pack = 'sling';
delete LOOK.face;


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
