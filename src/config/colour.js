import { clamp } from './util.js';



/* ---------- colour ---------- */
export const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

export const scl = (c, f) => [clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f, 0, 255)];

export const shade = (h, f) => { const c = scl(hex(h), f); return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; };

export const INK = '#0f1b2d';

export const C = {
  tileA: hex('#cdd5dc'), tileB: hex('#bfc9d2'), carA: hex('#3d5272'), carB: hex('#34486a'),
  ceil: hex('#eef2f5'), panel: hex('#ffffff'), wall: hex('#aab6c0'), glass: hex('#8cc6ea'),
  pillar: hex('#e6ebef'), shop: hex('#f1dcae'), navy: hex('#14233b'), sign: hex('#ffcf1f'), glow: hex('#fff1bf'),
  asA: hex('#3d4149'), asB: hex('#42464f'), white: hex('#e8e8e8'), yline: hex('#e0b400'), curb: hex('#a2a6ab'),
  walkA: hex('#cbc7c0'), walkB: hex('#c2beb7'), glassDark: hex('#33475b'), win: hex('#2c3a4a'),
  nightA: hex('#26242e'), nightB: hex('#2a2833'), zebra: hex('#d9d9e3'), nightWalk: hex('#3a3646'), shopNight: hex('#ffe6b0'), litWin: hex('#f7c873')
};

export const SHOPFRONTS = [hex('#d9473f'), hex('#2f7de1'), hex('#2aa56a'), hex('#e58b2b'), hex('#7d56d6'), hex('#17a2a8')];

export const BLD = ['#b9a58c', '#8c6f5a', '#c8c2b8', '#6f7d8c', '#a0796a', '#d8cfc0', '#56606b'];

export const AWN = ['#7f1d1d', '#14532d', '#1e3a8a', '#111827'];

export const NIGHTBLD = ['#1d1a2e', '#231f36', '#191726', '#26213a'];

export const NEON = ['#ff3d9a', '#20e3ff', '#ffe14d', '#7cff6b', '#b26bff'];

export const SHIRTS = ['#e2574c', '#2f80ed', '#27ae60', '#f2994a', '#9b51e0', '#14b8a6', '#d6336c', '#5c7cfa', '#e9c46a', '#f4f1ea', '#374151', '#9ca3af'];

export const FASTSHIRTS = ['#111827', '#0ea5e9', '#f97316', '#84cc16'];

export const PANTS = ['#1f2937', '#334155', '#3f3a52', '#7a6a50', '#1e3a5f', '#4b5563', '#c2b280'];

export const SKINS = ['#f1c7a5', '#e2b08a', '#c68863', '#9a6440', '#6b4329'];

export const HAIRS = ['#1f1a17', '#3b2a1e', '#6b4a2b', '#a37b4f', '#d9c08c', '#6b7280'];

export const SHOES = ['#2b2f36', '#2b2f36', '#f4f6f8', '#7a4b2a'];

export const GEARS = ['#ffcf1f', '#e2574c', '#2f80ed', '#27ae60', '#111827', '#f4f6f8'];

export const LUGS = ['#c0392b', '#2c3e50', '#16a085', '#8e44ad', '#e67e22'];

export const DOGS = ['#c8a165', '#3b2a1e', '#f1eadf', '#7a7a7a'];

export const CARCOLS = ['#1f2937', '#e5e7eb', '#9ca3af', '#1e3a8a', '#7f1d1d', '#111827'];


export const REACT = {
  airport: ['Whoa!', 'Hey!', 'Rude.', 'Watch it!', 'Excuse YOU.', 'Seriously?', 'My bag!'],
  nyc: ['Hey!', "I'm walkin' here!", 'Watch it!', 'Come ON.', 'Yo!', 'Unbelievable.'],
  shibuya: ['Sumimasen!', 'Ah!', 'Eh?!', 'Whoa!', 'Abunai!']
};

export const RIVAL_LINES = ['Move.', 'Coming through.', 'Mine.', 'Outta my way.', 'Too slow.'];

export const MULT_COLS = ['#ffffff', '#ffcf1f', '#ff9f43', '#ff7eb6', '#c792ff', '#7cc4ff', '#5ee6a8', '#ff2d3a'];
