import { hex } from './colour.js';
import { clamp } from './util.js';



/* ---------- levels ---------- */
export const LEVELS = [
  { id: 'airport', city: 'Airport', name: 'Terminal B', goal: 500, goalText: 'GATE B17', half: 7, keep: 1, fog: '#dde5ec',
    lane: 0.25, fastEvery: [2, 4.5], rivalEvery: [9, 15], base: 2,
    starScore: 15000, timerLabel: 'Boarding closes', timeFail: 'The gate closed before you got there.', events: ['tour', 'arrivals', 'spill', 'queue', 'cleaners', 'parade', 'weave', 'cart'],
    blurb: 'Rolling suitcases, people heading for gates, and a fast lane on the right.',
    music: { bpm: 148, prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] } },
  { id: 'nyc', city: 'New York', name: 'Fifth Avenue', goal: 600, goalText: '42 ST · SUBWAY', half: 4.5, keep: 1, fog: '#dfe6ec',
    lane: 0.08, fastEvery: [3, 6], rivalEvery: [8, 13], base: 1,
    starScore: 16000, timerLabel: 'Train leaves', timeFail: 'Your train left without you.', events: ['performer', 'delivery', 'tour', 'parade', 'queue', 'weave', 'van'],
    blurb: 'Narrow sidewalk, lamp posts, hot dog carts, tourists who stop dead, and a crowd wave at every crosswalk.',
    music: { bpm: 152, prog: [[62, 65, 69], [58, 62, 65], [53, 57, 60], [60, 64, 67]] } },
  { id: 'shibuya', city: 'Tokyo', name: 'Shibuya Crossing', goal: 360, goalText: 'HACHIKŌ EXIT', half: 11, keep: -1, fog: '#2c2545', night: true,
    lane: 0.1, fastEvery: [4, 7], rivalEvery: [7, 12], base: 1,
    starScore: 14000, timerLabel: 'Meeting in', timeFail: 'You were late for the meeting.', events: ['tour', 'selfie', 'parade', 'queue', 'weave', 'taxi'],
    blurb: 'Night scramble. Crowds pour in from every side when the lights change. Tokyo keeps left.',
    music: { bpm: 158, prog: [[66, 69, 73], [62, 66, 69], [57, 61, 64], [64, 68, 71]] } }
];

for (const L of LEVELS) L.limit = Math.round(L.goal / 3.0 * 1.07 + 6);
   // seconds allowed per level
export let LVI = 0, LV = LEVELS[0], FOGc = hex(LV.fog), FOGCSS = LV.fog;

export function setLevel(i) { LVI = i; LV = LEVELS[i]; FOGc = hex(LV.fog); FOGCSS = LV.fog; }

export function mixc(c, d) {
  const t = Math.min(1, Math.pow(Math.max(0, d) / 78, 0.9));
  return `rgb(${(c[0] + (FOGc[0] - c[0]) * t) | 0},${(c[1] + (FOGc[1] - c[1]) * t) | 0},${(c[2] + (FOGc[2] - c[2]) * t) | 0})`;
}

// Nothing is drawn past DRAW_FAR (metres from the camera) and everything fades out before it. All spawns land beyond SPAWN_FAR, so people always walk into view.
export const DRAW_FAR = 62, SPAWN_FAR = 66;

export const fogA = dz => clamp(1.25 - dz / 70, 0.15, 1);
