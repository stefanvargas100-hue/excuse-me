
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// Randomness: normal runs use Math.random; the daily run swaps in a seeded generator so everyone gets the same crowd.
export let R = Math.random;

export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }

export const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

export const rnd = (a = 0, b = 1) => a + R() * (b - a);

export const pick = a => a[(R() * a.length) | 0];

export const sgn = v => v < 0 ? -1 : 1;

export const mod = (a, n) => ((a % n) + n) % n;
   // modulo that stays positive behind the start line
export const TAU = Math.PI * 2;

export const randn = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

export function setR(v) { R = v; }
