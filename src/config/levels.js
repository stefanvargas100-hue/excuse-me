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
    music: { bpm: 158, prog: [[66, 69, 73], [62, 66, 69], [57, 61, 64], [64, 68, 71]] } },
  { id: 'park', city: 'New York', name: 'Central Park', goal: 540, goalText: 'BETHESDA TERRACE', half: 6, keep: 1, fog: '#c9dec9',
    lane: 0.08, fastEvery: [3, 5], rivalEvery: [10, 16], base: 1,
    starScore: 16000, timerLabel: 'Concert starts', timeFail: 'The concert started without you.', events: ['tour', 'performer', 'weave', 'parade', 'carriage'],
    blurb: 'Under the elms: joggers, dog walkers and park benches. Race to Bethesda Terrace.',
    music: { bpm: 138, prog: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]] } },
  { id: 'bridge', city: 'New York', name: 'Brooklyn Bridge', goal: 600, goalText: 'MANHATTAN', half: 5, keep: 1, fog: '#c4d4dd',
    lane: 0.08, fastEvery: [4,6], rivalEvery: [12,18], base: 1, starScore: 17000,
    timerLabel: 'Meet-up starts', timeFail: 'Your friends left without you.', events: ['tour','weave','parade'],
    blurb: 'Wooden promenade, river views, stone towers and tourists stopping for photos.',
    music: { bpm: 140, prog: [[60,64,67],[57,60,64],[53,57,60],[55,59,62]] } },
  { id: 'subway', city: 'New York', name: 'Subway Platform', goal: 450, goalText: 'UPTOWN EXIT', half: 4.5, keep: 1, fog: '#222830',
    lane: 0.08, fastEvery: [3.5, 6], rivalEvery: [10, 16], base: 1, starScore: 16000,
    timerLabel: 'Last train', timeFail: 'The last train pulled out without you.', events: ['train', 'train', 'parade', 'queue', 'tour'],
    blurb: 'Dim tiled platform. Every arriving train empties a wave of commuters across your path.',
    music: { bpm: 146, prog: [[57,60,64],[53,57,60],[55,59,62],[60,64,67]] } },
  { id: 'takeshita', city: 'Tokyo', name: 'Takeshita Street', goal: 360, goalText: 'HARAJUKU STATION', half: 3.3, keep: -1, fog: '#e7cbdc',
    lane: .08, fastEvery: [4,7], rivalEvery: [12,18], base: 1, starScore: 15000,
    timerLabel: 'Meet-up starts', timeFail: 'Your friends left before you arrived.', events: ['selfie', 'tour', 'queue'],
    blurb: 'Harajuku shops and sudden stops. Watch shoppers raise their phones; the quiet back alley takes longer.',
    music: { bpm: 158, prog: [[66,69,73],[62,66,69],[57,61,64],[64,68,71]] } }
];

for (const L of LEVELS) L.limit = Math.round(L.goal / 3.0 * 1.07 + 6);
   // seconds allowed per level
export let LVI = 0, LV = LEVELS[0], FOGc = hex(LV.fog), FOGCSS = LV.fog;

export function setLevel(i) { LVI = i; LV = LEVELS[i]; FOGc = hex(LV.fog); FOGCSS = LV.fog; }
// An art style can swap the haze colour that distance fades into (drawing only).
export function setFog(h) { FOGc = hex(h); FOGCSS = h; }

// The bridge approaches taper over eight metres, keeping the same boundaries in drawing and movement.
export function halfAt(z) {
  if (LV.id === 'bridge') {
    for (const start of [190,410]) if(z>=start-12 && z<=start+22) return 3.1+1.9*clamp(Math.max(start-z,z-(start+10))/12,0,1);
    return LV.half;
  }
  if (LV.id !== 'park' || z < 232 || z > 284) return LV.half;
  return 3.4 + 2.6 * clamp(Math.max(240 - z, z - 276) / 8, 0, 1);
}

export function mixc(c, d) {
  const t = Math.min(1, Math.pow(Math.max(0, d) / 78, 0.9));
  return `rgb(${(c[0] + (FOGc[0] - c[0]) * t) | 0},${(c[1] + (FOGc[1] - c[1]) * t) | 0},${(c[2] + (FOGc[2] - c[2]) * t) | 0})`;
}

// Nothing is drawn past DRAW_FAR (metres from the camera) and everything fades out before it. All spawns land beyond SPAWN_FAR, so people always walk into view.
export const DRAW_FAR = 62, SPAWN_FAR = 66;

export const fogA = dz => clamp(1.25 - dz / 70, 0.15, 1);
