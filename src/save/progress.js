import { GEARS, HAIRS, SKINS } from '../config/colour.js';
import { FACE_DEFAULT, FACE_PARTS, cleanFace } from '../config/faces.js';
import { isLocked } from './challenges.js';
import { store } from './store.js';



/* ---------- look (customization) ---------- */
export const LOOK_OPTS = [
  { key: 'body', label: 'Body', type: 'chip', vals: [['m', 'Male'], ['f', 'Female']] },
  { key: 'build', label: 'Build', type: 'chip', vals: [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']] },
  { key: 'shirtType', label: 'Top', type: 'chip', vals: [['tee', 'T-shirt'], ['tank', 'Tank top'], ['hoodie', 'Hoodie'], ['jacket', 'Track jacket'], ['baby', 'Y2K baby tee'], ['velour', 'Y2K velour jacket'], ['wind', '80s windbreaker'], ['varsity', 'Varsity jacket'], ['power', '80s power blazer'], ['puffer', 'Puffer jacket'], ['dress', 'Sundress'], ['suit', 'Suit jacket']] },
  { key: 'shirt', label: 'Shirt colour', type: 'color', vals: ['#ffcf1f', '#e2574c', '#2f80ed', '#27ae60', '#f2994a', '#9b51e0', '#14b8a6', '#d6336c', '#111827', '#f4f1ea', { c: '#d4af37', name: 'Gold shirt' }, { c: '#39ff14', name: 'Neon shirt' }] },
  { key: 'pantsType', label: 'Bottoms', type: 'chip', vals: [['jeans', 'Jeans'], ['shorts', 'Shorts'], ['joggers', 'Joggers'], ['cargo', 'Cargo'], ['track', '80s track pants'], ['flares', 'Y2K flares'], ['acid', '80s acid wash'], ['parachute', 'Parachute pants'], ['slacks', 'Suit trousers'], ['pleats', 'Pleated skirt'], ['pencil', 'Pencil skirt']] },
  { key: 'pants', label: 'Pants colour', type: 'color', vals: ['#1e3a5f', '#1f2937', '#334155', '#4b5563', '#7a6a50', '#c2b280'] },
  { key: 'shoeType', label: 'Shoes', type: 'chip', vals: [['sneakers', 'Sneakers'], ['runners', 'Runners'], ['boots', 'Boots'], ['slides', 'Slides'], ['hightops', '80s high-tops'], ['dad', 'Chunky trainers'], ['platforms', 'Y2K platforms'], ['heels', 'Heels'], ['oxfords', 'Dress shoes'], ['loafers', 'Loafers']] },
  { key: 'shoe', label: 'Shoe colour', type: 'color', vals: ['#f4f6f8', '#2b2f36', '#e2574c', '#2f80ed', '#7a4b2a', { c: '#d4af37', name: 'Gold sneakers' }] },
  { key: 'skin', label: 'Skin', type: 'color', vals: SKINS },
  { key: 'hair', label: 'Hair colour', type: 'color', vals: HAIRS },
  { key: 'eyes', label: 'Eyes', type: 'chip', vals: FACE_PARTS.eyes },
  { key: 'nose', label: 'Nose', type: 'chip', vals: FACE_PARTS.nose },
  { key: 'mouth', label: 'Mouth', type: 'chip', vals: FACE_PARTS.mouth },
  { key: 'hairStyle', label: 'Hair style', type: 'chip', vals: [['short', 'Short'], ['medium', 'Medium'], ['long', 'Long'], ['bald', 'Bald'], ['mohawk', 'Mohawk']] },
  { key: 'hat', label: 'Headpiece', type: 'chip', vals: [['cap', 'Cap'], ['beanie', 'Beanie'], ['visor', 'Visor'], ['sweatband', '80s sweatband'], ['bucket', 'Y2K bucket hat'], ['headphones', 'Headphones'], ['shades', 'Shades'], ['beret', 'Beret'], ['fedora', 'Fedora'], ['tiara', 'Tiara'], ['crown', 'Crown']] },
  { key: 'showHead', label: 'Show headpiece (stats stay either way)', type: 'chip', vals: [['1', 'Show'], ['0', 'Hide']] },
  { key: 'pack', label: 'Back', type: 'chip', vals: [['pack', 'Backpack'], ['sling', 'Sling bag'], ['fanny', 'Y2K belt bag'], ['messenger', 'Messenger bag'], ['boombox', '80s boombox'], ['jet', 'Jetpack']] },
  { key: 'gear', label: 'Headpiece and bag colour', type: 'color', vals: GEARS }
];

const LOOK_DEFAULT = { body: 'm', build: 'medium', shirtType: 'tee', pantsType: 'jeans', shoeType: 'sneakers', shirt: '#ffcf1f', pants: '#1e3a5f', shoe: '#f4f6f8', skin: '#c68863', hair: '#3b2a1e', hairStyle: 'short', hat: 'cap', showHead: '1', pack: 'pack', gear: '#111827', ...FACE_DEFAULT };

export let LOOK = Object.assign({}, LOOK_DEFAULT);

try { Object.assign(LOOK, JSON.parse(store.get('excuseme_look', '{}'))); } catch (e) {}

// Older saves could wear nothing on the head or back. Keep how they looked, now that every slot is required.
if (LOOK.hat === 'none' || !LOOK.hat) { if (LOOK.face === 'shades') LOOK.hat = 'shades'; else { LOOK.hat = 'cap'; LOOK.showHead = '0'; } }
if (LOOK.pack === 'none' || !LOOK.pack) LOOK.pack = 'sling';
delete LOOK.face;
Object.assign(LOOK, cleanFace(LOOK));   // old saves have no face parts yet


function sanitizeLook() {   // take off anything not earned yet
  for (const k of Object.keys(LOOK)) if (isLocked(k, LOOK[k])) LOOK[k] = LOOK_DEFAULT[k];
}

sanitizeLook();
